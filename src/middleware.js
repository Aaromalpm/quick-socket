function authMiddleware(authFn) {
  return async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error(
      '[quick-socket] Authentication failed: no token found. Pass a token in socket.handshake.auth.token.'
    ))
    try {
      const user = await authFn(token)
      socket.user = user
      next()
    } catch (err) {
      next(new Error(
        '[quick-socket] Authentication failed: the authFn you provided threw an error.'
      ))
    }
  }
}

module.exports = { authMiddleware }
