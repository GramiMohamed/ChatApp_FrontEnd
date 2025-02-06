import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Message } from '../models/message.model';
import { PrivateMessage } from '../models/PrivateMessage.model';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket;
  private messageSubject = new Subject<Message | PrivateMessage>();

  constructor(private http: HttpClient) {
    // Connect to the Socket.io server
    this.socket = io(environment.socketUrl);

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('WebSocket connection error', err);
    });

    // Listen for incoming messages
    this.socket.on('receiveMessage', (message: Message) => {
      this.messageSubject.next(message);
    });

    this.socket.on('receivePrivateMessage', (privateMessage: PrivateMessage) => {
      this.messageSubject.next(privateMessage);
    });
  }

  // Get message observable
  getMessagesObservable(): Observable<Message | PrivateMessage> {
    return this.messageSubject.asObservable();
  }

  // Send a message via WebSocket
  sendMessage(userId: string, username: string, text: string, receiverId?: string): void {
    if (!userId || !username || !text) {
      console.error('Missing parameters for sendMessage');
      return;
    }
    const message = { userId, username, text, receiverId };
    this.socket.emit('sendMessage', message);
  }

  // Fetch all users and map _id to id
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/api/users`).pipe(
      map(users => users.map(user => ({ ...user, id: user._id })))
    );
  }

  // Fetch all messages from the database via API
  getMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/api/messages`);
  }

  // Fetch private messages between two users
  getPrivateMessages(senderId: string, receiverId: string): Observable<PrivateMessage[]> {
    return this.http.get<PrivateMessage[]>(`${environment.apiUrl}/api/privateMessages/private/${senderId}/${receiverId}`);
  }

  // Fetch a user by their ID and map _id to id
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/users/${userId}`).pipe(
      map(user => ({ ...user, id: user._id }))
    );
  }
}
