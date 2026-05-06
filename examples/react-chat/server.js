const http = require('http')
const express = require('express')
const quickSocket = require('quick-socket')

// Redis
const { createAdapter } = require('@socket.io/redis-adapter')
const { createClient } = require('redis')

const app = express()
const server = http.createServer(app)


// initialize Quick Socket
const io = quickSocket.init(server, { cors: 'http://localhost:5173' })

// Redis Setup
async function setupRedis() {
  try {
    const pubClient = createClient({ url: 'redis://localhost:6379' })
    const subClient = pubClient.duplicate()

    await pubClient.connect()
    await subClient.connect()

    // Works only if quick-socket exposes io properly
    if (io.adapter) {
      io.adapter(createAdapter(pubClient, subClient))
      console.log('Redis adapter connected')
    } else {
      console.log('Redis not attached (quick-socket may hide io)')
    }
  } catch (err) {
    console.log('Redis connection failed:', err.message)
  }
}

setupRedis()

// create room
quickSocket.createRoom('room-001', {})

// Temporary in-memory message store (latter store at DB)
const messagesStore = []

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  quickSocket.joinRoom(socket, 'room-001', {
    userId: socket.id,
    role: 'member'
  })

  // send message
  socket.on('message', ({ roomId, content }) => {
    try {
      if (roomId !== 'room-001') {
        socket.emit('error', { message: 'Invalid room.' })
        return
      }

      if (!content || !content.trim()) {
        socket.emit('error', { message: 'Message cannot be empty.' })
        return
      }

      const message = {
        id: Date.now().toString(),
        roomId,
        senderId: socket.id,
        content: content.trim(),
        createdAt: new Date().toISOString()
      }

      // Save message
      messagesStore.push(message)

      // Send using quick-socket
      quickSocket.sendMessage(roomId, {
        senderId: socket.id,
        content: content.trim(),
        type: quickSocket.MESSAGE_TYPES.TEXT
      })
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message.' })
    }
  })

  // typing
  socket.on('typing', ({ roomId, isTyping }) => {
    try {
      if (roomId !== 'room-001') {
        socket.emit('error', { message: 'Invalid room for typing event.' })
        return
      }

      quickSocket.sendTyping(roomId, socket.id, isTyping)
    } catch (err) {
      socket.emit('error', { message: 'Typing event failed.' })
    }
  })

  // pagination
  socket.on('messages:history', ({ roomId, page = 1, limit = 20 }, cb) => {
    try {
      if (roomId !== 'room-001') {
        socket.emit('error', { message: 'Invalid room for history.' })
        return
      }

      const start = (page - 1) * limit
      const end = start + limit

      // Reverse to show latest first
      const reversed = [...messagesStore].reverse()
      const paginated = reversed.slice(start, end)

      cb({
        messages: paginated,
        hasMore: end < messagesStore.length
      })
    } catch (err) {
      socket.emit('error', { message: 'Failed to load message history.' })
    }
  })

  // disconnect
  socket.on('disconnect', () => {
    quickSocket.leaveRoom(socket, 'room-001')
    console.log('Client disconnected:', socket.id)
  })
})

// server started
server.listen(3000, () => {
  console.log('Backend running on http://localhost:3000')
})
