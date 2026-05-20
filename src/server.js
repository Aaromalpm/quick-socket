const { Server } = require('socket.io')

let io

function init(httpServer, options = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: options.cors || '*',
      methods: ['GET', 'POST']
    },
    pingInterval: options.pingInterval || 25000,
    pingTimeout: options.pingTimeout || 20000
  })

  io.on('connection', (socket) => {
    console.log(`[quick-socket] Client connected: ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`[quick-socket] Client disconnected: ${socket.id}`)
    })
  })

  return io
}

function getIO() {
  if (!io) throw new Error(
    '[quick-socket] Socket.IO server is not initialized. ' +
    'You must call quickSocket.init(httpServer) before using any quick-socket functions. ' +
    'See: https://github.com/Aaromalpm/quick-socket#getting-started'
  )
  return io
}

module.exports = { init, getIO }
