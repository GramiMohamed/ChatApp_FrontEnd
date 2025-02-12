// private-chat.service.ts

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';
import { PrivateMessage } from '../models/PrivateMessage.model';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class PrivateChatService {
  private socket: Socket;
  private privateMessageSubject = new Subject<PrivateMessage>();
  private unreadCounts = new BehaviorSubject<Map<string, number>>(new Map());
  private typingSubject = new Subject<{ username: string, isTyping: boolean }>(); // Add typing subject

  constructor(private http: HttpClient) {
    this.socket = io(environment.socketUrl);

    this.socket.on('connect', () => {
      const currentUser = this.getCurrentUser();
      if (currentUser?.id) {
        this.socket.emit('userConnected', currentUser.id);
      }
    });

    this.socket.on('receivePrivateMessage', (privateMessage: PrivateMessage) => {
      const counts = this.unreadCounts.getValue();
      const receiverId = privateMessage.receiver.id;

      if (receiverId) {
        counts.set(receiverId, (counts.get(receiverId) || 0) + 1);
        this.unreadCounts.next(counts);
      } else {
        console.error('Receiver ID is undefined or invalid');
      }

      this.privateMessageSubject.next(privateMessage);
      this.notifyNewPrivateMessage(privateMessage);
    });

    // Handle typing events
    this.socket.on('typing', (data: { username: string, isTyping: boolean }) => {
      this.typingSubject.next(data);
    });

    this.socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  }

  private getCurrentUser(): User | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  notifyNewPrivateMessage(privateMessage: PrivateMessage) {
    const audio = new Audio('assets/sounds/message.mp3');
    audio.play();
  }

  sendPrivateMessage(privateMessage: PrivateMessage): void {
    console.log('Message data to send:', privateMessage);
    this.socket.emit('sendPrivateMessage', {
      senderId: privateMessage.sender.id,
      receiverId: privateMessage.receiver.id,
      content: privateMessage.content,
      createdAt: privateMessage.createdAt,
    });

    // Increment unread count for the SENDER (not the receiver)
    const counts = this.unreadCounts.getValue();
    const senderId = privateMessage.sender.id;
    if (senderId) {
      counts.set(senderId, (counts.get(senderId) || 0) + 1);
      this.unreadCounts.next(counts);
    }
  }

  getPrivateMessages(senderId: string, receiverId: string): Observable<{ messages: PrivateMessage[]; count: number }> {
    return this.http.get<{ messages: PrivateMessage[]; count: number }>(`${environment.apiUrl}/api/privateMessages/private/${senderId}/${receiverId}`);
  }

  getPrivateMessagesObservable(): Observable<PrivateMessage> {
    return this.privateMessageSubject.asObservable();
  }

  getUnreadCounts(): Observable<Map<string, number>> {
    return this.unreadCounts.asObservable();
  }

  resetUnreadCount(userId: string): void {
    const counts = this.unreadCounts.getValue();
    counts.set(userId, 0);
    this.unreadCounts.next(counts);
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/users/${userId}`).pipe(
      map((user: User) => ({ ...user, id: user._id }))
    );
  }

  disconnectUser(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser?.id) {
      this.socket.emit('userDisconnected', currentUser.id);
    }
    this.socket.disconnect();
  }

  incrementUnreadCountForUser(id: string | undefined): void {
    const counts = this.unreadCounts.getValue();
    if (id) {
      counts.set(id, (counts.get(id) || 0) + 1);
      this.unreadCounts.next(counts);
    }
  }

  // Send typing event to the server
  sendTypingEvent(receiverId: string, isTyping: boolean): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.socket.emit('typing', { username: currentUser.username, receiverId, isTyping });
    }
  }

  // Get observable of typing events
  getTypingObservable(): Observable<{ username: string, isTyping: boolean }> {
    return this.typingSubject.asObservable();
  }
}
