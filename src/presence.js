const { getIO } = require('./server')
const { getRoomParticipants } = require('./rooms')

const presenceMap = new Map()

const PRESENCE_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline'
}

function trackPresence(socket, userId) {
  if (!userId) throw new Error('[quick-socket] trackPresence() requires a userId as the second argument.')

  socket._qs_userId = userId

  if (!presenceMap.has(userId)) {
    presenceMap.set(userId, {
      status: PRESENCE_STATUS.ONLINE,
      socketIds: new Set(),
      lastSeen: null,
      meta: {}
    })
  }

  const user = presenceMap.get(userId)
  const wasOffline = user.socketIds.size === 0
  user.socketIds.add(socket.id)
  user.status = PRESENCE_STATUS.ONLINE

  if (wasOffline) {
    getIO().emit('presence:change', { userId, status: PRESENCE_STATUS.ONLINE, lastSeen: null })
  }

  socket.on('disconnect', () => {
    user.socketIds.delete(socket.id)
    if (user.socketIds.size === 0) {
      user.status = PRESENCE_STATUS.OFFLINE
      user.lastSeen = new Date()
      getIO().emit('presence:change', {
        userId,
        status: PRESENCE_STATUS.OFFLINE,
        lastSeen: user.lastSeen
      })
    }
  })
}

function setPresence(userId, status, meta = {}) {
  if (!Object.values(PRESENCE_STATUS).includes(status)) throw new Error(
    `[quick-socket] setPresence() invalid status "${status}". Use PRESENCE_STATUS.ONLINE, AWAY, or OFFLINE.`
  )
  if (!presenceMap.has(userId)) throw new Error(
    `[quick-socket] setPresence() user "${userId}" is not tracked. Call trackPresence(socket, userId) first.`
  )
  const user = presenceMap.get(userId)
  user.status = status
  if (status === PRESENCE_STATUS.OFFLINE) user.lastSeen = new Date()
  Object.assign(user.meta, meta)
  getIO().emit('presence:change', { userId, status, lastSeen: user.lastSeen, meta: user.meta })
}

function getPresence(userId) {
  const user = presenceMap.get(userId)
  if (!user) return { status: PRESENCE_STATUS.OFFLINE, lastSeen: null, meta: {} }
  return { status: user.status, lastSeen: user.lastSeen, meta: user.meta }
}

function getRoomPresence(roomId) {
  const participants = getRoomParticipants(roomId)
  return participants.reduce((acc, p) => {
    if (p.userId) acc[p.userId] = getPresence(p.userId)
    return acc
  }, {})
}

module.exports = { trackPresence, setPresence, getPresence, getRoomPresence, PRESENCE_STATUS }
