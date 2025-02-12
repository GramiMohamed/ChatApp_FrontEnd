import { Component, OnInit, OnDestroy } from '@angular/core';
import { Message } from '../../models/message.model';
import { PrivateMessage } from '../../models/PrivateMessage.model';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PrivateChatService } from '../../services/private-chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.css'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  messages: (Message | PrivateMessage)[] = [];
  newMessage: string = '';
  currentUser: User | null = null;
  users: User[] = [];
  connectedUsers: User[] = [];
  showUserList: boolean = false;
  private messageSubscription!: Subscription;
  private connectedUsersSubscription!: Subscription;
  unreadCounts: Map<string, number> = new Map();
  loading: boolean = true;
  typingUsers: Set<string> = new Set();
  private typingSubscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private privateChatService: PrivateChatService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('ChatRoomComponent initialized');
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.chatService.setCurrentUser(this.currentUser);
    this.loading = true;

    this.fetchMessages();
    this.fetchUsers();
    this.fetchConnectedUsers();
    this.fetchUnreadCounts();

    this.typingSubscription = this.chatService.getTypingObservable().subscribe((event) => {
      if (event.isTyping) {
        this.typingUsers.add(event.username);
      } else {
        this.typingUsers.delete(event.username);
      }
    });

    this.messageSubscription = this.chatService.getMessagesObservable().subscribe((message: Message | PrivateMessage | { type: string, message: string }) => {
      if ('type' in message) {
        this.showSnackbar(message.message);
      } else {
        if (this.isPrivateMessage(message)) {
          // Notification pour un message privé (seulement si on est le destinataire)
          if (message.receiver.id === this.currentUser?.id) {
            this.showSnackbar(`New private message from ${message.sender.username}`);
          }
        } else {
          // Message public, ajouté à la liste
          this.messages.push(message);

          // ✅ Vérifier si le message vient d'un autre utilisateur avant d'afficher la notif
          if (message.user.id !== this.currentUser?.id) {
            this.showSnackbar(`${message.user.username}: ${message.text}`);
          }
        }
      }
    });

    this.showSnackbar('Welcome to the chat!');
  }

  fetchMessages() {
    this.chatService.getMessages().subscribe((messages: Message[]) => {
      console.log('Fetched messages:', messages);
      this.messages = messages;
      this.checkLoadingState();
    });
  }

  fetchUsers() {
    this.chatService.getUsers().subscribe((users: User[]) => {
      console.log('Fetched users:', users);
      this.users = users;
      this.checkLoadingState();
    });
  }

  onInputChange(): void {
    if (this.newMessage.trim().length > 0) {
      this.chatService.sendTypingEvent(true);
    } else {
      this.chatService.sendTypingEvent(false);
    }
  }

  fetchConnectedUsers() {
    this.chatService.getConnectedUsersObservable().subscribe((connectedUsers) => {
      console.log('Connected users:', connectedUsers);
      this.connectedUsers = connectedUsers;
    });
  }

  fetchUnreadCounts() {
    this.privateChatService.getUnreadCounts().subscribe((counts) => {
      this.unreadCounts = counts;
    });
  }

  checkLoadingState() {
    console.log('Messages:', this.messages);
    console.log('Users:', this.users);

    if (this.messages.length > 0 && this.users.length > 0) {
      console.log('Both messages and users are loaded. Setting loading to false.');
      this.loading = false;
    } else {
      console.log('Either messages or users are still loading.');
    }
  }

  getUnreadCount(user: User): number {
    return user.id ? this.unreadCounts.get(user.id) ?? 0 : 0;
  }

  showSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  isPrivateMessage(message: Message | PrivateMessage): message is PrivateMessage {
    return (message as PrivateMessage).sender !== undefined;
  }

  toggleUserList(): void {
    this.showUserList = !this.showUserList;
  }

  sendMessage() {
    if (!this.currentUser) return;

    if (!this.currentUser.id || !this.currentUser.username) {
      console.error('User ID or Username is not available');
      return;
    }

    if (!this.newMessage.trim().length) return;

    this.chatService.sendTypingEvent(false);
    this.chatService.sendMessage(this.currentUser.id, this.currentUser.username, this.newMessage);
    this.newMessage = '';
  }

  startPrivateChat(user: User): void {
    if (user.id) {
      this.privateChatService.resetUnreadCount(user.id);
      this.router.navigate([`/private-chat/${user.id}`]);
    }
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.connectedUsersSubscription) {
      this.connectedUsersSubscription.unsubscribe();
    }
    if (this.typingSubscription) {
      this.typingSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isUserConnected(user: any): boolean {
    return user.isConnected;
  }
}
