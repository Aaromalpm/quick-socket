const assert = require('assert')
const http = require('http')
const { Server } = require('socket.io')
const { io: Client } = require('socket.io-client')
const { createRateLimiter } = require('../src/rateLimit')

const tests = []

function test(label, fn) {
  tests.push({ label, fn })
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitFor(socket, event, timeoutMs = 500) {
  return new Promise((resolve, reject) => {
    const handler = (...args) => {
      clearTimeout(timer)
      resolve(args.length > 1 ? args : args[0])
    }
    const timer = setTimeout(() => {
      socket.off(event, handler)
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)
    socket.once(event, handler)
  })
}

function expectNoEvent(socket, event, timeoutMs = 100) {
  return new Promise((resolve, reject) => {
    const handler = (payload) => {
      clearTimeout(timer)
      reject(new Error(`Unexpected ${event}: ${JSON.stringify(payload)}`))
    }
    const timer = setTimeout(() => {
      socket.off(event, handler)
      resolve()
    }, timeoutMs)
    socket.once(event, handler)
  })
}

async function withRateLimitedServer(options, run) {
  const httpServer = http.createServer()
  const io = new Server(httpServer)

  io.use(createRateLimiter(options))
  io.on('connection', (socket) => {
    socket.on('message:send', (payload) => {
      socket.emit('message:accepted', payload)
    })
    socket.on('status:ping', (payload) => {
      socket.emit('status:pong', payload)
    })
  })

  await new Promise(resolve => httpServer.listen(0, resolve))
  const { port } = httpServer.address()
  const client = Client(`http://127.0.0.1:${port}`, {
    forceNew: true,
    transports: ['websocket']
  })

  await waitFor(client, 'connect')

  try {
    await run({ client, io, port })
  } finally {
    client.disconnect()
    await new Promise(resolve => io.close(resolve))
  }
}

async function emitAndWait(client, event, payload, responseEvent) {
  const response = waitFor(client, responseEvent)
  client.emit(event, payload)
  return response
}

test('allows messages within the configured limit', async () => {
  await withRateLimitedServer({ limit: 2, windowMs: 200 }, async ({ client }) => {
    const first = await emitAndWait(client, 'message:send', { text: 'one' }, 'message:accepted')
    const second = await emitAndWait(client, 'message:send', { text: 'two' }, 'message:accepted')

    assert.deepEqual(first, { text: 'one' })
    assert.deepEqual(second, { text: 'two' })
  })
})

test('blocks the next message inside the active window', async () => {
  await withRateLimitedServer({ limit: 1, windowMs: 200 }, async ({ client }) => {
    await emitAndWait(client, 'message:send', { text: 'allowed' }, 'message:accepted')

    const exceeded = waitFor(client, 'rateLimit:exceeded')
    const noAcceptedMessage = expectNoEvent(client, 'message:accepted')
    client.emit('message:send', { text: 'blocked' })

    const payload = await exceeded
    await noAcceptedMessage

    assert.equal(payload.event, 'message:send')
    assert.equal(payload.limit, 1)
    assert.equal(payload.windowMs, 200)
    assert.equal(payload.retryAfter, 1)
  })
})

test('resets the counter after the rate-limit window elapses', async () => {
  await withRateLimitedServer({ limit: 1, windowMs: 50 }, async ({ client }) => {
    await emitAndWait(client, 'message:send', { text: 'first' }, 'message:accepted')
    await wait(75)
    const second = await emitAndWait(client, 'message:send', { text: 'second' }, 'message:accepted')

    assert.deepEqual(second, { text: 'second' })
  })
})

test('only rate limits configured events when an events filter is provided', async () => {
  await withRateLimitedServer(
    { limit: 1, windowMs: 200, events: ['message:send'] },
    async ({ client }) => {
      const firstPing = await emitAndWait(client, 'status:ping', { ok: 1 }, 'status:pong')
      const secondPing = await emitAndWait(client, 'status:ping', { ok: 2 }, 'status:pong')
      await emitAndWait(client, 'message:send', { text: 'allowed' }, 'message:accepted')

      const exceeded = waitFor(client, 'rateLimit:exceeded')
      client.emit('message:send', { text: 'blocked' })

      assert.deepEqual(firstPing, { ok: 1 })
      assert.deepEqual(secondPing, { ok: 2 })
      assert.equal((await exceeded).event, 'message:send')
    }
  )
})

test('calls onLimitReached instead of emitting the default exceeded event', async () => {
  let callbackPayload
  const limitReached = new Promise(resolve => {
    callbackPayload = resolve
  })

  await withRateLimitedServer(
    {
      limit: 1,
      windowMs: 200,
      onLimitReached(socket, packet) {
        callbackPayload({ socketId: socket.id, packet })
      }
    },
    async ({ client }) => {
      await emitAndWait(client, 'message:send', { text: 'allowed' }, 'message:accepted')

      const noDefaultExceededEvent = expectNoEvent(client, 'rateLimit:exceeded')
      client.emit('message:send', { text: 'blocked' })

      const payload = await limitReached
      await noDefaultExceededEvent

      assert.ok(payload.socketId)
      assert.deepEqual(payload.packet, ['message:send', { text: 'blocked' }])
    }
  )
})

test('allows a new client after the limited socket disconnects', async () => {
  await withRateLimitedServer({ limit: 1, windowMs: 1000 }, async ({ client, port }) => {
    await emitAndWait(client, 'message:send', { text: 'first' }, 'message:accepted')
    client.disconnect()
    await wait(50)

    const nextClient = Client(`http://127.0.0.1:${port}`, {
      forceNew: true,
      transports: ['websocket']
    })

    try {
      await waitFor(nextClient, 'connect')
      const response = await emitAndWait(
        nextClient,
        'message:send',
        { text: 'after-disconnect' },
        'message:accepted'
      )

      assert.deepEqual(response, { text: 'after-disconnect' })
    } finally {
      nextClient.disconnect()
    }
  })
})

async function run() {
  let passed = 0
  let failed = 0

  console.log('\n=== quick-socket Rate Limiter Tests ===\n')

  for (const { label, fn } of tests) {
    try {
      await fn()
      console.log(`  ✓ ${label}`)
      passed++
    } catch (err) {
      console.error(`  ✗ ${label}`)
      console.error(err.stack)
      failed++
    }
  }

  console.log(`\n=== Rate Limiter Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('[quick-socket rate limiter tests] Test runner crashed unexpectedly:', err.message)
  console.error(err.stack)
  process.exit(1)
})
