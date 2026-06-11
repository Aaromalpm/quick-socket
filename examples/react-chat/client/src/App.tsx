import React, { useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type Message = {
  id: string
  roomId: string
  senderId: string
  content: string
  createdAt: string
}

type TypingPayload = {
  userId: string
  isTyping: boolean
}

type JoinPayload = {
  userId: string
}

type ChatError = {
  message: string
}

type HistoryRequest = {
  roomId: string
  page: number
  limit: number
}

type HistoryResponse = {
  messages: Message[]
  hasMore: boolean
}

type ClientToServerEvents = {
  'message': (data: { roomId: string; content: string }) => void
  'typing': (data: { roomId: string; isTyping: boolean }) => void
  'messages:history': (data: HistoryRequest, cb: (res: HistoryResponse) => void) => void
}

type ServerToClientEvents = {
  'message:new': (msg: Message) => void
  'message:typing': (payload: TypingPayload) => void
  'user:joined': (payload: JoinPayload) => void
  'error': (err: ChatError) => void
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000', {
  autoConnect: true
})

const ROOM_ID = 'room-001'
const PAGE_SIZE = 20

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string>('')

  const canSend = useMemo(() => input.trim().length > 0, [input])

  useEffect(() => {
    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    }

    const handleTyping = ({ userId, isTyping }: TypingPayload) => {
      if (userId !== socket.id) setIsTyping(isTyping)
    }

    const handleJoined = ({ userId }: JoinPayload) => {
      console.log('User joined:', userId)
    }

    const handleError = (err: ChatError) => {
      setError(err.message || 'Something went wrong')
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:typing', handleTyping)
    socket.on('user:joined', handleJoined)
    socket.on('error', handleError)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:typing', handleTyping)
      socket.off('user:joined', handleJoined)
      socket.off('error', handleError)
    }
  }, [])

  useEffect(() => {
    loadHistory(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadHistory = (nextPage: number) => {
    setLoadingHistory(true)
    setError('')

    socket.emit(
      'messages:history',
      { roomId: ROOM_ID, page: nextPage, limit: PAGE_SIZE },
      (res) => {
        setLoadingHistory(false)

        if (!res) {
          setError('Failed to load messages.')
          return
        }

        setMessages((prev) => {
          const merged = [...res.messages, ...prev]
          const unique = merged.filter(
            (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
          )
          return unique
        })

        setHasMore(res.hasMore)
        setPage(nextPage)
      }
    )
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)

    socket.emit('typing', {
      roomId: ROOM_ID,
      isTyping: e.target.value.length > 0
    })
  }

  const sendMessage = () => {
    if (!canSend) return

    socket.emit('message', { roomId: ROOM_ID, content: input.trim() })
    setInput('')
    socket.emit('typing', { roomId: ROOM_ID, isTyping: false })
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>quick-socket React Demo</h2>

      {error && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#ffe5e5',
            color: '#b00020'
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          height: '400px',
          overflowY: 'auto',
          padding: '16px',
          marginBottom: '12px',
          background: '#f9f9f9'
        }}
      >
        <button
          onClick={() => loadHistory(page + 1)}
          disabled={!hasMore || loadingHistory}
          style={{
            marginBottom: '12px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: hasMore && !loadingHistory ? 'pointer' : 'not-allowed',
            background: hasMore ? '#222' : '#999',
            color: '#fff'
          }}
        >
          {loadingHistory ? 'Loading...' : hasMore ? 'Load older messages' : 'No more messages'}
        </button>

        {messages.length === 0 && !loadingHistory && (
          <p style={{ color: '#aaa' }}>No messages yet. Say something!</p>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>
              {m.senderId.slice(0, 6)} · {new Date(m.createdAt).toLocaleString()}
            </span>
            <p
              style={{
                margin: '2px 0',
                background: '#fff',
                padding: '8px',
                borderRadius: '6px'
              }}
            >
              {m.content}
            </p>
          </div>
        ))}

        {isTyping && (
          <p style={{ color: '#aaa', fontStyle: 'italic' }}>Someone is typing...</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ddd'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: canSend ? '#0070f3' : '#999',
            color: '#fff',
            border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed'
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}