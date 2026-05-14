import type { Server as HttpServer } from 'http'
import type { Server as SocketIOServer, Socket } from 'socket.io'

export interface InitOptions {
  cors?: string
}

export interface JoinRoomMeta {
  userId?: string
  role?: string
}

export interface RoomParticipant {
  socketId: string
  userId?: string
  role: string
  joinedAt: Date
}

export interface Room {
  id: string
  participants: RoomParticipant[]
  meta: Record<string, any>
  createdAt: Date
}

export type MessageType = 'text' | 'image' | 'file' | 'system'
export type StatusType = 'sent' | 'delivered' | 'read'

export interface SendMessageInput {
  senderId: string
  content: string
  type?: MessageType
}

export interface MessagePayload {
  id: string
  roomId: string
  senderId: string
  content: string
  type: MessageType
  createdAt: Date
  editedAt?: Date
}

export interface PaginatedMessages {
  roomId: string
  page: number
  limit: number
  total: number
  totalPages: number
  messages: MessagePayload[]
}

export type AuthVerifyFn = (token: string) => any
export type AuthMiddlewareFn = (socket: Socket, next: (err?: Error) => void) => void

export const MESSAGE_TYPES: {
  readonly TEXT: 'text'
  readonly IMAGE: 'image'
  readonly FILE: 'file'
  readonly SYSTEM: 'system'
}

export const STATUS: {
  readonly SENT: 'sent'
  readonly DELIVERED: 'delivered'
  readonly READ: 'read'
}

export function init(httpServer: HttpServer, options?: InitOptions): SocketIOServer
export function getIO(): SocketIOServer
export function authMiddleware(verifyToken: AuthVerifyFn): AuthMiddlewareFn

export function notifyUser(userId: string, event: string, data: any): void
export function broadcast(event: string, data: any): void
export function notifyRoom(roomId: string, event: string, data: any): void

export function createRoom(roomId: string, meta?: Record<string, any>): Room
export function joinRoom(socket: Socket, roomId: string, userMeta?: JoinRoomMeta): void
export function leaveRoom(socket: Socket, roomId: string): void
export function getRoomParticipants(roomId: string): RoomParticipant[]
export function closeRoom(roomId: string): void

export function sendMessage(roomId: string, message: SendMessageInput): MessagePayload
export function editMessage(roomId: string, messageId: string, newContent: string): void
export function deleteMessage(roomId: string, messageId: string): void
export function sendTyping(roomId: string, userId: string, isTyping: boolean): void
export function getRoomMessages(roomId: string, page?: number, limit?: number): PaginatedMessages

export function markDelivered(roomId: string, messageId: string, userId: string): void
export function markRead(roomId: string, messageId: string, userId: string): void
export function markAllRead(roomId: string, userId: string): void
