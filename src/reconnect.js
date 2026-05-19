const { getRoomMessages } = require('./messages')

const userRoomsMap = new Map()

function trackUserRoom(userId, roomId) {
  if (!userId) return
  if (!userRoomsMap.has(userId)) userRoomsMap.set(userId, new Set())
  userRoomsMap.get(userId).add(roomId)
}

function untrackUserRoom(userId, roomId) {
  if (!userId) return
  userRoomsMap.get(userId)?.delete(roomId)
}

function clearRoomFromAllUsers(roomId) {
  for (const roomIds of userRoomsMap.values()) {
    roomIds.delete(roomId)
  }
}

function rejoinRooms(socket, userId, options = {}) {
  if (!userId) throw new Error('[quick-socket] rejoinRooms() requires a userId as the second argument.')

  const roomIds = userRoomsMap.get(userId)
  if (!roomIds || roomIds.size === 0) return { rooms: [], missedMessages: {} }

  const rooms = []
  const missedMessages = {}

  for (const roomId of roomIds) {
    socket.join(roomId)
    rooms.push(roomId)

    if (options.since) {
      const since = new Date(options.since)
      const { messages } = getRoomMessages(roomId, 1, 100)
      missedMessages[roomId] = messages.filter(m => new Date(m.createdAt) > since)
    }
  }

  return { rooms, missedMessages }
}

function getUserRooms(userId) {
  return [...(userRoomsMap.get(userId) || [])]
}

module.exports = { trackUserRoom, untrackUserRoom, clearRoomFromAllUsers, rejoinRooms, getUserRooms }
