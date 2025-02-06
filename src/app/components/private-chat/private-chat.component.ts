import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Message } from '../../models/message.model';
import { PrivateMessage } from '../../models/PrivateMessage.model';
import { User } from '../../models/user.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.css'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  messages: (Message | PrivateMessage)[] = [];
  newMessage: string = '';
  currentUser: User | null = null;
  receiverId: string = '';
  receiverUser: User | null = null;
  private messageSubscription!: Subscription;
  private realTimeMessageSubscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      console.error('User not found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }

    // Fetch the receiver ID from the URL parameters
    this.route.paramMap.subscribe(params => {
      this.receiverId = params.get('id') ?? '';
      if (!this.receiverId) {
        console.error('Receiver ID is missing');
        this.router.navigate(['/chat']);
      } else {
        this.loadReceiverDetails();
        this.loadPrivateMessages();
      }
    });

    // Subscribe to real-time message updates
    this.realTimeMessageSubscription = this.chatService.getMessagesObservable().subscribe((message: Message | PrivateMessage) => {
      // Display messages that belong to the private conversation
      if (this.isPrivateMessage(message) && (message.sender.id === this.receiverId || message.receiver.id === this.receiverId)) {
        this.messages.push(message);
      }
    });
  }

  // Check if the message is a private message
  isPrivateMessage(message: Message | PrivateMessage): message is PrivateMessage {
    return (message as PrivateMessage).sender !== undefined;
  }

  // Load receiver details (user)
  loadReceiverDetails(): void {
    this.chatService.getUserById(this.receiverId).subscribe(
      (user: User) => {
        this.receiverUser = user;
      },
      (error) => {
        console.error('Error fetching receiver details', error);
      }
    );
  }

  // Load private messages between the current user and the receiver
  loadPrivateMessages(): void {
    if (!this.currentUser?.id) return; // Use id instead of _id
    this.chatService.getPrivateMessages(this.currentUser.id, this.receiverId).subscribe(
      (messages: PrivateMessage[]) => {
        this.messages = messages;
      },
      (error) => {
        console.error('Error fetching private messages', error);
      }
    );
  }

  // Send a message
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentUser?.id) return; // Use id instead of _id
    console.log('Sending message:', this.newMessage);
    this.chatService.sendMessage(this.currentUser.id, this.currentUser.username, this.newMessage, this.receiverId);
    this.newMessage = ''; // Reset the message field
  }

  // Back to the chat list
  backToChatRoom(): void {
    this.router.navigate(['/chat']);
  }

  // Unsubscribe when the component is destroyed
  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.realTimeMessageSubscription) {
      this.realTimeMessageSubscription.unsubscribe();
    }
  }
}
