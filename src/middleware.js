function authMiddleware(authFn) {
  return async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token provided'))
    try {
      const user = await authFn(token)
      socket.user = user
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  }
}

module.exports = { authMiddleware }
