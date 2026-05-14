const { init, getIO } = require('./server')
const { authMiddleware } = require('./middleware')
const { notifyUser, broadcast, notifyRoom } = require('./notifications')
const { createRoom, joinRoom, leaveRoom, getRoomParticipants, closeRoom } = require('./rooms')
const { sendMessage, editMessage, deleteMessage, sendTyping, getRoomMessages, MESSAGE_TYPES } = require('./messages')
const { markDelivered, markRead, markAllRead, STATUS } = require('./status')

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
  STATUS
}
