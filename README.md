# quick-socket

![NPM Version](https://img.shields.io/npm/v/quick-socket)
![NPM Downloads](https://img.shields.io/npm/dm/quick-socket)
![License](https://img.shields.io/github/license/Aaromalpm/quick-socket)
![GitHub Stars](https://img.shields.io/github/stars/Aaromalpm/quick-socket)

Add real-time chat to your Node.js app in minutes — not hours.

Built on top of Socket.io with rooms, messaging, typing indicators, and read receipts ready out of the box.

## Install

```bash
npm install quick-socket
```

TypeScript definitions are included out of the box.

## Quick Start

```javascript
const http = require('http')
const express = require('express')
const quickSocket = require('quick-socket')

const app = express()
const server = http.createServer(app)

// Initialize — one line
const io = quickSocket.init(server)

server.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

That's it. Your Socket.io server is ready.

---

## Features

- Create and manage chat rooms
- Send, edit and delete messages
- Typing indicators
- Read receipts (sent, delivered, read)
- Broadcast to all users
- Notify specific users or rooms
- Auth middleware support
- Presence tracking (online / away / offline)
- Per-socket rate limiting
- Reconnect recovery with missed messages

---

## Usage

### Create a Room

```javascript
quickSocket.createRoom('room-001', {
  travellerId: 'user-1',
  supplierId: 'user-2'
})
```

### Join a Room

```javascript
io.on('connection', (socket) => {
  quickSocket.joinRoom(socket, 'room-001', {
    userId: 'user-1',
    role: 'traveller'
  })
})
```

### Send a Message

```javascript
quickSocket.sendMessage('room-001', {
  senderId: 'user-1',
  content: 'Hello!',
  type: quickSocket.MESSAGE_TYPES.TEXT
})
```

### Typing Indicator

```javascript
// user started typing
quickSocket.sendTyping('room-001', 'user-1', true)

// user stopped typing
quickSocket.sendTyping('room-001', 'user-1', false)
```

### Read Receipts

```javascript
// mark one message as read
quickSocket.markRead('room-001', 'message-id', 'user-2')

// mark all messages as read
quickSocket.markAllRead('room-001', 'user-2')

// mark as delivered
quickSocket.markDelivered('room-001', 'message-id', 'user-2')
```

### Edit & Delete Messages

```javascript
quickSocket.editMessage('room-001', 'message-id', 'Updated text')

quickSocket.deleteMessage('room-001', 'message-id')
```

### Get Room Messages

```javascript
const result = quickSocket.getRoomMessages('room-001', 1, 20)

console.log(result)
// {
//   roomId: 'room-001',
//   page: 1,
//   limit: 20,
//   total: 42,
//   totalPages: 3,
//   messages: [...]
// }
```

### Notifications

```javascript
// notify everyone
quickSocket.broadcast('announcement', { message: 'Server update soon' })

// notify a specific room
quickSocket.notifyRoom('room-001', 'alert', { message: 'New booking!' })

// notify a specific user
quickSocket.notifyUser('user-1', 'ping', { message: 'You have a message' })
```

### Leave & Close Room

```javascript
quickSocket.leaveRoom(socket, 'room-001')

quickSocket.closeRoom('room-001')
```

---

## Frontend Events

Listen to these events on the client side:

| Event | When it fires |
|---|---|
| `message:new` | New message sent |
| `message:edited` | Message was edited |
| `message:deleted` | Message was deleted |
| `message:typing` | User is typing |
| `message:read` | Message was read |
| `message:delivered` | Message was delivered |
| `messages:all_read` | All messages marked read |
| `user:joined` | User joined the room |
| `user:left` | User left the room |
| `room:closed` | Room was closed |
| `presence:change` | User came online, went offline, or changed status |
| `rateLimit:exceeded` | Socket sent too many messages in the time window |
| `reconnect:recovery` | Missed messages delivered after reconnect |

### Example

```javascript
// frontend (browser)
const socket = io('http://localhost:3000')

socket.on('message:new', (msg) => {
  console.log('New message:', msg.content)
})

socket.on('message:typing', (data) => {
  console.log(data.userId, 'is typing:', data.isTyping)
})

socket.on('message:read', (data) => {
  console.log('Read by:', data.userId)
})
```

---

## Message Types

```javascript
quickSocket.MESSAGE_TYPES.TEXT    // 'text'
quickSocket.MESSAGE_TYPES.IMAGE   // 'image'
quickSocket.MESSAGE_TYPES.FILE    // 'file'
quickSocket.MESSAGE_TYPES.SYSTEM  // 'system'
```

## Status Types

```javascript
quickSocket.STATUS.SENT       // 'sent'
quickSocket.STATUS.DELIVERED  // 'delivered'
quickSocket.STATUS.READ       // 'read'
```

---

## Auth Middleware

```javascript
const io = quickSocket.init(server)

io.use(quickSocket.authMiddleware((token) => {
  // verify your token here (JWT, etc.)
  return verifyToken(token) // return user object
}))
```

Client sends token like this:

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-token-here' }
})
```

---

## Get Participants

```javascript
const participants = quickSocket.getRoomParticipants('room-001')
console.log(participants)
// [{ userId, role, socketId, joinedAt }, ...]
```

---

## Presence

Track who is online, away, or offline in real time.

```javascript
io.on('connection', (socket) => {
  quickSocket.trackPresence(socket, socket.user.id)
  // automatically emits presence:change on connect and disconnect
})

// manually set a user as away
quickSocket.setPresence('user-1', quickSocket.PRESENCE_STATUS.AWAY)

// query presence
quickSocket.getPresence('user-1')
// { status: 'away', lastSeen: null, meta: {} }

// get presence for everyone in a room
quickSocket.getRoomPresence('room-001')
// { 'user-1': { status: 'online', ... }, 'user-2': { status: 'offline', lastSeen: Date } }
```

Client listens:

```javascript
socket.on('presence:change', ({ userId, status, lastSeen }) => {
  console.log(userId, 'is now', status)
})
```

---

## Rate Limiting

Protect rooms from message spam with a sliding window rate limiter.

```javascript
const io = quickSocket.init(server)

// max 10 messages per second per socket
io.use(quickSocket.createRateLimiter({ limit: 10, windowMs: 1000 }))

// limit only specific events
io.use(quickSocket.createRateLimiter({
  limit: 5,
  windowMs: 1000,
  events: ['message:send']
}))
```

Client receives when limit is hit:

```javascript
socket.on('rateLimit:exceeded', ({ event, limit, retryAfter }) => {
  console.log(`Slow down. Retry in ${retryAfter}s`)
})
```

---

## Reconnect Recovery

When a user reconnects, re-join their rooms and deliver messages they missed.

```javascript
io.on('connection', (socket) => {
  const userId = socket.user.id
  const lastSeen = socket.handshake.auth?.lastSeen

  const { rooms, missedMessages } = quickSocket.rejoinRooms(socket, userId, {
    since: lastSeen
  })

  // send missed messages back to the client
  socket.emit('reconnect:recovery', { rooms, missedMessages })
})
```

---

## Heartbeat Config

Control Socket.io's ping/pong to keep connections alive on flaky networks.

```javascript
quickSocket.init(server, {
  pingInterval: 10000, // default 25000ms
  pingTimeout: 5000    // default 20000ms
})
```

---

## Contributing

Contributions are welcome! Check the [open issues](https://github.com/Aaromalpm/quick-socket/issues) to see what needs doing.

Good places to start:
- [#17](https://github.com/Aaromalpm/quick-socket/issues/17) — tests for presence system
- [#18](https://github.com/Aaromalpm/quick-socket/issues/18) — tests for rate limiter
- [#19](https://github.com/Aaromalpm/quick-socket/issues/19) — tests for reconnect recovery

Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## License

MIT
