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

## Contributing

Contributions are welcome! Here's how you can help:

- Fix a bug
- Add TypeScript support
- Add Redis support for multi-server scaling
- Add a React.js example
- Improve documentation

Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## License

MIT
