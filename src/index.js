const { init, getIO } = require('./server')
const { authMiddleware } = require('./middleware')
const { notifyUser, broadcast, notifyRoom } = require('./notifications')
const { createRoom, joinRoom, leaveRoom, getRoomParticipants, closeRoom } = require('./rooms')
const { sendMessage, editMessage, deleteMessage, sendTyping, getRoomMessages, MESSAGE_TYPES } = require('./messages')
const { markDelivered, markRead, markAllRead, STATUS } = require('./status')
const { trackPresence, setPresence, getPresence, getRoomPresence, PRESENCE_STATUS } = require('./presence')
const { createRateLimiter } = require('./rateLimit')
const { rejoinRooms, getUserRooms } = require('./reconnect')

module.exports = {
  init,
  getIO,
  authMiddleware,
  notifyUser,
  broadcast,
  notifyRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  closeRoom,
  sendMessage,
  editMessage,
  deleteMessage,
  sendTyping,
  getRoomMessages,
  MESSAGE_TYPES,
  markDelivered,
  markRead,
  markAllRead,
  STATUS,
  trackPresence,
  setPresence,
  getPresence,
  getRoomPresence,
  PRESENCE_STATUS,
  createRateLimiter,
  rejoinRooms,
  getUserRooms
}
