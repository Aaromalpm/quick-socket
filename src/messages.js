const { getIO } = require('./server')

const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
}

const roomMessages = new Map()
const MAX_MESSAGES_PER_ROOM = 1000
const MAX_PAGE_SIZE = 100

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
  const messages = roomMessages.get(roomId)
  messages.push(payload)
  if (messages.length > MAX_MESSAGES_PER_ROOM) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_ROOM)
  }
  getIO().to(roomId).emit('message:new', payload)
  return payload
}

function editMessage(roomId, messageId, newContent) {
  const messages = roomMessages.get(roomId) || []
  const message = messages.find(msg => msg.id === messageId)
  if (message) {
    message.content = newContent
    message.editedAt = new Date()
  } else {
    console.warn(
      `[quick-socket] editMessage warning: message "${messageId}" was not found in memory for room "${roomId}". ` +
      'The socket event was emitted, but the in-memory message history was not updated.'
    )
  }
  if (!message) throw new Error(
    `[quick-socket] editMessage() could not find message "${messageId}" in room "${roomId}".`
  )
  message.content = newContent
  message.editedAt = new Date()
  getIO().to(roomId).emit('message:edited', {
    messageId,
    content: newContent,
    editedAt: message.editedAt
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
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), MAX_PAGE_SIZE)
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
