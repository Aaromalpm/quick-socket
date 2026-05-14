const http = require('http')
const { io: Client } = require('socket.io-client')
const quickSocket = require('../src/index')
const { authMiddleware } = quickSocket

const server = http.createServer()
const PORT = 4501

let passed = 0
let failed = 0

function log(label, status) {
  const mark = status ? '✓' : '✗'
  console.log(`  ${mark} ${label}`)
  status ? passed++ : failed++
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms))
}

async function runTests() {
  console.log('\n=== quick-socket Test Suite ===\n')

  const io = quickSocket.init(server)

  // Collect server-side sockets BEFORE clients connect
  const serverSockets = []
  io.on('connection', (socket) => {
    serverSockets.push(socket)
  })

  server.listen(PORT)
  await wait(200)

  const client1 = Client(`http://localhost:${PORT}`)
  const client2 = Client(`http://localhost:${PORT}`)

  // Wait until both clients are connected server-side
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (serverSockets.length >= 2) {
        clearInterval(check)
        resolve()
      }
    }, 50)
  })

  // ── Test 1: createRoom ──
  const room = quickSocket.createRoom('room-1', { travellerId: 'u1', supplierId: 'u2' })
  log('createRoom returns correct id', room?.id === 'room-1')

  // ── Test 2: joinRoom emits user:joined ──
  const joinResult = await new Promise((resolve) => {
    client2.once('user:joined', (data) => resolve(data))
    quickSocket.joinRoom(serverSockets[0], 'room-1', { userId: 'u1', role: 'traveller' })
    quickSocket.joinRoom(serverSockets[1], 'room-1', { userId: 'u2', role: 'supplier' })
    setTimeout(() => resolve(null), 2000)
  })
  log('joinRoom emits user:joined event', joinResult?.roomId === 'room-1')

  // ── Test 3: getRoomParticipants ──
  const participants = quickSocket.getRoomParticipants('room-1')
  log('getRoomParticipants returns 2 participants', participants.length === 2)

  // ── Test 4: sendMessage ──
  const msgResult = await new Promise((resolve) => {
    client2.once('message:new', (msg) => resolve(msg))
    quickSocket.sendMessage('room-1', {
      senderId: 'u1',
      content: 'Hello!',
      type: quickSocket.MESSAGE_TYPES.TEXT
    })
    setTimeout(() => resolve(null), 2000)
  })
  log('sendMessage delivers to room', msgResult?.content === 'Hello!')
  log('sendMessage has correct type', msgResult?.type === 'text')
  log('sendMessage has generated id', !!msgResult?.id)

  const initialMessages = quickSocket.getRoomMessages('room-1', 1, 20)
  log('getRoomMessages stores sent messages', initialMessages.total === 1)
  log('getRoomMessages returns the sent message', initialMessages.messages[0]?.id === msgResult?.id)

  // ── Test 5: sendTyping ──
  const typingResult = await new Promise((resolve) => {
    client2.once('message:typing', (data) => resolve(data))
    quickSocket.sendTyping('room-1', 'u1', true)
    setTimeout(() => resolve(null), 2000)
  })
  log('sendTyping delivers typing event', typingResult?.isTyping === true)
  log('sendTyping has correct userId', typingResult?.userId === 'u1')

  // ── Test 6: markRead ──
  const readResult = await new Promise((resolve) => {
    client2.once('message:read', (data) => resolve(data))
    quickSocket.markRead('room-1', 'msg-001', 'u2')
    setTimeout(() => resolve(null), 2000)
  })
  log('markRead delivers read event', readResult?.messageId === 'msg-001')

  // ── Test 7: markAllRead ──
  const allReadResult = await new Promise((resolve) => {
    client2.once('messages:all_read', (data) => resolve(data))
    quickSocket.markAllRead('room-1', 'u2')
    setTimeout(() => resolve(null), 2000)
  })
  log('markAllRead delivers event', allReadResult?.roomId === 'room-1')

  // ── Test 8: editMessage ──
  const editResult = await new Promise((resolve) => {
    client2.once('message:edited', (data) => resolve(data))
    quickSocket.editMessage('room-1', 'msg-001', 'Updated!')
    setTimeout(() => resolve(null), 2000)
  })
  log('editMessage delivers edited event', editResult?.content === 'Updated!')

  // ── Test 9: deleteMessage ──
  const deleteResult = await new Promise((resolve) => {
    client2.once('message:deleted', (data) => resolve(data))
    quickSocket.deleteMessage('room-1', 'msg-001')
    setTimeout(() => resolve(null), 2000)
  })
  log('deleteMessage delivers deleted event', deleteResult?.messageId === 'msg-001')

  // ── Test 10: markDelivered ──
  const deliveredResult = await new Promise((resolve) => {
    client2.once('message:delivered', (data) => resolve(data))
    quickSocket.markDelivered('room-1', 'msg-001', 'u2')
    setTimeout(() => resolve(null), 2000)
  })
  log('markDelivered delivers event', deliveredResult?.messageId === 'msg-001')

  // ── Test 11: broadcast ──
  const broadcastResult = await new Promise((resolve) => {
    client2.once('announcement', (data) => resolve(data))
    quickSocket.broadcast('announcement', { msg: 'hello all' })
    setTimeout(() => resolve(null), 2000)
  })
  log('broadcast reaches all clients', broadcastResult?.msg === 'hello all')

  // ── Test 12: notifyRoom ──
  const notifyRoomResult = await new Promise((resolve) => {
    client2.once('room:update', (data) => resolve(data))
    quickSocket.notifyRoom('room-1', 'room:update', { status: 'active' })
    setTimeout(() => resolve(null), 2000)
  })
  log('notifyRoom delivers event', notifyRoomResult?.status === 'active')

  quickSocket.sendMessage('room-1', {
    senderId: 'u1',
    content: 'Second',
    type: quickSocket.MESSAGE_TYPES.TEXT
  })
  quickSocket.sendMessage('room-1', {
    senderId: 'u2',
    content: 'Third',
    type: quickSocket.MESSAGE_TYPES.TEXT
  })

  const pageOne = quickSocket.getRoomMessages('room-1', 1, 2)
  log('getRoomMessages paginates latest messages', pageOne.messages.length === 2)
  log('getRoomMessages page 1 returns latest slice', pageOne.messages[0]?.content === 'Second' && pageOne.messages[1]?.content === 'Third')

  const pageTwo = quickSocket.getRoomMessages('room-1', 2, 2)
  log('getRoomMessages page 2 returns older messages', pageTwo.messages.length === 1 && pageTwo.messages[0]?.content === 'Hello!')

  // ── Test 13: closeRoom ──
  const closeResult = await new Promise((resolve) => {
    client2.once('room:closed', (data) => resolve(data))
    quickSocket.closeRoom('room-1')
    setTimeout(() => resolve(null), 2000)
  })
  log('closeRoom emits room:closed', closeResult?.roomId === 'room-1')

  const messagesAfterClose = quickSocket.getRoomMessages('room-1', 1, 20)
  log('closeRoom clears stored room messages', messagesAfterClose.total === 0)

  // ── Test 14: MESSAGE_TYPES constants ──
  log('MESSAGE_TYPES.TEXT is "text"', quickSocket.MESSAGE_TYPES.TEXT === 'text')
  log('MESSAGE_TYPES.IMAGE is "image"', quickSocket.MESSAGE_TYPES.IMAGE === 'image')
  log('MESSAGE_TYPES.FILE is "file"', quickSocket.MESSAGE_TYPES.FILE === 'file')

  // ── Test 15: STATUS constants ──
  log('STATUS.SENT is "sent"', quickSocket.STATUS.SENT === 'sent')
  log('STATUS.DELIVERED is "delivered"', quickSocket.STATUS.DELIVERED === 'delivered')
  log('STATUS.READ is "read"', quickSocket.STATUS.READ === 'read')

  // ── Test 16: authMiddleware valid token ──
  await new Promise((resolve) => {
    const mockAuthFn = (token) => {
      if (token === 'valid-token') return { id: 1 }
      throw new Error('invalid')
    }
    const middleware = authMiddleware(mockAuthFn)
    const socket = {
      handshake: { auth: { token: 'valid-token' } }
    }
    const next = (err) => {
      log('authMiddleware valid token passes', err === undefined)
      log('authMiddleware sets socket.user', socket.user?.id === 1)
      resolve()
    }
    middleware(socket, next)
  })

  // ── Test 17: authMiddleware missing token ──
  await new Promise((resolve) => {
    const middleware = authMiddleware(() => {})
    const socket = {
      handshake: { auth: {} }
    }
    const next = (err) => {
      log(
        'authMiddleware missing token returns error',
        err instanceof Error && err.message === 'No token provided'
      )
      resolve()
    }
    middleware(socket, next)
  }) 
  
  // ── Test 18: authMiddleware invalid token ──
  await new Promise((resolve) => {
    const middleware = authMiddleware(() => {
      throw new Error('invalid')
    })
    const socket = {
      handshake: { auth: { token: 'invalid-token' } }
    }
    const next = (err) => {
      log(
        'authMiddleware invalid token returns error',
        err instanceof Error && err.message === 'Authentication failed'
      )
      resolve()
    }
    middleware(socket, next)
  })
  
  // ── Test 19: authMiddleware missing auth object ──
  await new Promise((resolve) => {
    const middleware = authMiddleware(() => {})
    const socket = {
      handshake: {}
    }
    const next = (err) => {
      log(
        'authMiddleware missing auth object returns error',
        err instanceof Error && err.message === 'No token provided'
      )
      resolve()
    }
    middleware(socket, next)
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

  client1.disconnect()
  client2.disconnect()
  server.close()
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('[quick-socket tests] Test runner crashed unexpectedly:', err.message)
  console.error(err.stack)
  process.exit(1)
})
