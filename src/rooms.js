const { getIO } = require('./server')
const { clearRoomMessages } = require('./messages')

const rooms = new Map()

function createRoom(roomId, meta = {}) {
  if (!roomId || typeof roomId !== 'string') throw new Error(
    '[quick-socket] createRoom() requires a non-empty string roomId. Received: ' + JSON.stringify(roomId)
  )
  if (rooms.has(roomId)) {
    console.warn(`[quick-socket] createRoom(): room "${roomId}" already exists. Returning existing room.`)
    return rooms.get(roomId)
  }
  rooms.set(roomId, {
    id: roomId,
    participants: [],
    meta,
    createdAt: new Date()
  })
  return rooms.get(roomId)
}

function joinRoom(socket, roomId, userMeta = {}) {
  if (!socket || typeof socket.join !== 'function') throw new Error(
    '[quick-socket] joinRoom() requires a valid Socket.IO socket as the first argument. ' +
    'Use the socket object from the io.on("connection", (socket) => { ... }) callback.'
  )
  if (!roomId) throw new Error(
    '[quick-socket] joinRoom() requires a roomId as the second argument.'
  )
  socket.join(roomId)
  const room = rooms.get(roomId)
  if (room) {
    room.participants.push({
      socketId: socket.id,
      userId: userMeta.userId,
      role: userMeta.role || 'member',
      joinedAt: new Date()
    })
  } else {
    console.warn(
      `[quick-socket] joinRoom warning: room "${roomId}" was not created via createRoom(). ` +
      'The socket joined the Socket.IO room, but participant tracking is disabled. ' +
      'Call createRoom(roomId) before joinRoom() to enable participant tracking.'
    )
  }
  getIO().to(roomId).emit('user:joined', { userId: userMeta.userId, roomId })
}

function leaveRoom(socket, roomId) {
  socket.leave(roomId)
  const room = rooms.get(roomId)
  if (room) {
    room.participants = room.participants.filter(p => p.socketId !== socket.id)
  } else {
    console.warn(
      `[quick-socket] leaveRoom warning: room "${roomId}" does not exist in the rooms registry. ` +
      'The socket was removed from the Socket.IO room, but no participant entry was cleaned up.'
    )
  }
  getIO().to(roomId).emit('user:left', { socketId: socket.id, roomId })
}

function getRoomParticipants(roomId) {
  return rooms.get(roomId)?.participants || []
}

function closeRoom(roomId) {
  getIO().to(roomId).emit('room:closed', { roomId })
  clearRoomMessages(roomId)
  rooms.delete(roomId)
}

module.exports = { createRoom, joinRoom, leaveRoom, getRoomParticipants, closeRoom }
