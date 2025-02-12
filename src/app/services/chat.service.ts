// chat.service.ts

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Message } from '../models/message.model';
import { PrivateMessage } from '../models/PrivateMessage.model';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { PrivateChatService } from './private-chat.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket: Socket;
  private messageSubject = new Subject<Message | { type: string; message: string }>();
  private connectedUsersSubject = new BehaviorSubject<User[]>([]);
  private typingSubject = new Subject<{ username: string, isTyping: boolean }>();
  private currentUser!: User;

  constructor(private http: HttpClient, private privateChatService: PrivateChatService) {
    this.socket = io(environment.socketUrl);

    const storedUser = this.getCurrentUser();
    if (storedUser) {
      this.currentUser = storedUser;
    }

    // WebSocket connection handling
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      if (this.currentUser?.id) {
        this.socket.emit('userConnected', this.currentUser.id);
      }
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('WebSocket connection error', err);
    });

    // Handle receiving public messages
    this.socket.on('receiveMessage', (message: Message) => {
      this.messageSubject.next(message);
    });

    // Handle receiving private messages
    this.socket.on('receivePrivateMessage', (message: PrivateMessage) => {
      const mappedMessage: Message = {
        user: message.sender,
        receiver: message.receiver,
        text: message.content,
        createdAt: message.createdAt,
      };

      this.messageSubject.next(mappedMessage);

      // Update unread count for the recipient
      this.privateChatService.incrementUnreadCountForUser(message.receiver.id);
    });

    // Handle notifications (e.g., new messages)
    this.socket.on('newMessageNotification', (notification: { type: string; message: string }) => {
      this.messageSubject.next(notification);
    });

    // Handle updating the list of connected users
    this.socket.on('updateUserList', (connectedUsers: User[]) => {
      this.connectedUsersSubject.next(connectedUsers);
    });

    // Handle typing events
    this.socket.on('typing', (data: { username: string, isTyping: boolean }) => {
      this.typingSubject.next(data);
    });
  }

  // Set the current logged-in user
  setCurrentUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Get the current logged-in user from local storage
  getCurrentUser(): User | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  // Send a public message
  // chat.service.ts
sendMessage(userId: string, username: string, content: string): void {
  if (!userId || !username || !content.trim()) {
    console.error('Invalid message data');
    return;
  }

  const messageData = { userId, username, content };

  // Envoyer le message via WebSocket
  this.socket.emit('sendMessage', messageData);

  // Envoyer le message au backend pour l'enregistrer en base de données
  this.http.post(`${environment.apiUrl}/api/messages`, messageData).subscribe({
    next: (response) => {
      console.log('Message enregistré en DB', response);
    },
    error: (err) => {
      console.error('Erreur lors de l’enregistrement du message', err);
    }
  });
}


  // Send a private message between two users
  sendPrivateMessage(senderId: string, receiverId: string, content: string): void {
    if (!senderId || !receiverId || !content) return;

    this.socket.emit('sendPrivateMessage', { senderId, receiverId, content, createdAt: new Date() });
  }

  // Get observable of all messages (both public and private)
  getMessagesObservable(): Observable<Message | { type: string; message: string }> {
    return this.messageSubject.asObservable();
  }

  // Fetch all messages from the backend API
  getMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/api/messages`);
  }

  // Fetch all users from the backend API
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/api/users`).pipe(
      map((users) => users.map((user) => ({ ...user, id: user._id })))
    );
  }

  // Get observable of connected users via WebSocket
  getConnectedUsersObservable(): Observable<User[]> {
    return this.connectedUsersSubject.asObservable();
  }

  // Fetch connected users from the backend API
  getConnectedUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/api/users/connected`).pipe(
      map((users) => users.map((user) => ({ ...user, id: user._id }))),
      catchError((error) => {
        console.error('Error fetching connected users:', error);
        return of([]); // Return an empty array if error occurs
      })
    );
  }

  // Send typing event to the server
  sendTypingEvent(isTyping: boolean): void {
    if (this.currentUser) {
      this.socket.emit('typing', { username: this.currentUser.username, isTyping });
    }
  }

  // Get observable of typing events
  getTypingObservable(): Observable<{ username: string, isTyping: boolean }> {
    return this.typingSubject.asObservable();
  }
}
