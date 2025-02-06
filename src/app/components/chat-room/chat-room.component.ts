import { Component, OnInit, OnDestroy } from '@angular/core';
import { Message } from '../../models/message.model';
import { PrivateMessage } from '../../models/PrivateMessage.model';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  showUserList: boolean = false;
  private messageSubscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit called'); // Initial log
    this.currentUser = this.authService.getCurrentUser();
    console.log('Current user on init:', this.currentUser); // Log user details

    if (!this.currentUser) {
      console.error('User not found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }

    // Fetch existing messages
    this.chatService.getMessages().subscribe((messages: Message[]) => {
      this.messages = messages;
    });

    // Fetch users
    this.chatService.getUsers().subscribe((users: User[]) => {
      console.log('Fetched users:', users); // Additional log
      this.users = users;
    });

    // Listen for new messages via WebSocket
    this.messageSubscription = this.chatService.getMessagesObservable().subscribe((message: Message | PrivateMessage) => {
      console.log('Received message:', message); // Additional log
      if (this.isPrivateMessage(message)) {
        this.messages.push(message);
      } else {
        this.messages.push(message);
      }
    });
  }

  // Check if the message is a private message
  isPrivateMessage(message: Message | PrivateMessage): message is PrivateMessage {
    return (message as PrivateMessage).sender !== undefined;
  }

  toggleUserList(): void {
    this.showUserList = !this.showUserList;
  }

  sendMessage() {
    console.log('sendMessage called'); // Initial log

    if (!this.currentUser) {
      console.error('Current user is not available');
      return;
    }

    if (!this.currentUser.id) { // Use id instead of _id
      console.error('User ID is not available');
      return;
    }

    console.log('Current user:', this.currentUser); // Log user details
    console.log('Message to send:', this.newMessage); // Log message details

    if (this.newMessage.trim().length === 0) {
      console.log('Message is empty, not sending');
      return;
    }

    this.chatService.sendMessage(this.currentUser.id, this.currentUser.username, this.newMessage);
    console.log('Message sent'); // Log after sending message
    this.newMessage = ''; // Reset the message field
    console.log('Message field reset'); // Log after resetting message field
  }

  startPrivateChat(user: User): void {
    console.log('Starting private chat with user:', user); // Additional log
    console.log('User ID:', user.id); // Additional log
    if (!user.id) { // Check for id
      console.error('Receiver ID is missing');
      return;
    }

    console.log('Navigating to private chat with user ID:', user.id); // Log the user ID being used for navigation
    this.router.navigate([`/private-chat/${user.id}`]);
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }
}
