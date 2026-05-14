const { getIO } = require('./server')

const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
}

const roomMessages = new Map()

function sendMessage(roomId, message) {
  if (!roomId) throw new Error(
    '[quick-socket] sendMessage() requires a roomId as the first argument. Received: ' + roomId
  )
  if (!message || typeof message !== 'object') throw new Error(
    '[quick-socket] sendMessage() requires a message object as the second argument. ' +
    'Expected: { senderId: string, content: string, type?: string }'
  )
  if (!message.senderId) throw new Error(
    '[quick-socket] sendMessage() requires message.senderId. ' +
    'Each message must identify who sent it.'
  )
  if (!message.content) throw new Error(
    '[quick-socket] sendMessage() requires message.content. ' +
    'The message body cannot be empty.'
  )
  const payload = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    senderId: message.senderId,
    content: message.content,
    type: message.type || MESSAGE_TYPES.TEXT,
    createdAt: new Date()
  }
  if (!roomMessages.has(roomId)) {
    roomMessages.set(roomId, [])
  }
  roomMessages.get(roomId).push(payload)
  getIO().to(roomId).emit('message:new', payload)
  return payload
}

function editMessage(roomId, messageId, newContent) {
  const messages = roomMessages.get(roomId) || []
  const message = messages.find(msg => msg.id === messageId)
  if (message) {
    message.content = newContent
    message.editedAt = new Date()
  }
  getIO().to(roomId).emit('message:edited', {
    messageId,
    content: newContent,
    editedAt: new Date()
  })
}

function deleteMessage(roomId, messageId) {
  const messages = roomMessages.get(roomId) || []
  roomMessages.set(roomId, messages.filter(msg => msg.id !== messageId))
  getIO().to(roomId).emit('message:deleted', {
    messageId,
    deletedAt: new Date()
  })
}

function sendTyping(roomId, userId, isTyping) {
  getIO().to(roomId).emit('message:typing', { userId, isTyping })
}

function getRoomMessages(roomId, page = 1, limit = 20) {
  const messages = roomMessages.get(roomId) || []
  const currentPage = Math.max(Number(page) || 1, 1)
  const pageSize = Math.max(Number(limit) || 20, 1)
  const total = messages.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const end = total - (currentPage - 1) * pageSize
  const start = Math.max(0, end - pageSize)

  return {
    roomId,
    page: currentPage,
    limit: pageSize,
    total,
    totalPages,
    messages: end > 0 ? messages.slice(start, end) : []
  }
}

function clearRoomMessages(roomId) {
  roomMessages.delete(roomId)
}

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage,
  sendTyping,
  getRoomMessages,
  clearRoomMessages,
  MESSAGE_TYPES
}
