const rateLimitMap = new Map()

function createRateLimiter(options = {}) {
  const limit = options.limit || 10
  const windowMs = options.windowMs || 1000
  const events = options.events || null
  const onLimitReached = options.onLimitReached || null

  return function rateLimitMiddleware(socket, next) {
    rateLimitMap.set(socket.id, { count: 0, windowStart: Date.now() })

    socket.use((packet, next) => {
      const event = packet[0]
      if (events && !events.includes(event)) return next()

      const state = rateLimitMap.get(socket.id)
      const now = Date.now()

      if (now - state.windowStart > windowMs) {
        state.count = 0
        state.windowStart = now
      }

      state.count++

      if (state.count > limit) {
        if (onLimitReached) {
          onLimitReached(socket, packet)
        } else {
          socket.emit('rateLimit:exceeded', {
            event,
            limit,
            windowMs,
            retryAfter: Math.ceil((state.windowStart + windowMs - now) / 1000)
          })
        }
        return
      }

      next()
    })

    socket.on('disconnect', () => rateLimitMap.delete(socket.id))

    next()
  }
}

module.exports = { createRateLimiter }
