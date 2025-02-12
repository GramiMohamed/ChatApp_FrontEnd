import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PrivateMessage } from '../../models/PrivateMessage.model';
import { User } from '../../models/user.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PrivateChatService } from '../../services/private-chat.service';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  privateMessages: PrivateMessage[] = [];
  newMessage: string = '';
  currentUser: User | null = null;
  receiverId: string = '';
  receiverUser: User | null = null;
  private privateMessageSubscription: Subscription | null = null;
  private typingSubscription: Subscription | null = null;
  isTyping: boolean = false;
  typingUsername: string = '';

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(
    private privateChatService: PrivateChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      console.error('User not found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }

    this.route.paramMap.subscribe(params => {
      this.receiverId = params.get('id') ?? '';
      if (!this.receiverId) {
        console.error('Receiver ID is missing');
        this.router.navigate(['/chat-room']);
      } else {
        this.loadReceiverDetails();
        this.loadPrivateMessages();
      }
    });

    // Écouter les messages privés reçus
    this.privateMessageSubscription = this.privateChatService.getPrivateMessagesObservable().subscribe((msg: PrivateMessage) => {
      this.privateMessages.push(msg);
      this.scrollToBottom();
      this.notifyUser(msg);
    });

    // Écouter les événements de frappe (typing)
    this.typingSubscription = this.privateChatService.getTypingObservable().subscribe((event) => {
      this.isTyping = event.isTyping;
      this.typingUsername = event.isTyping ? event.username : '';
    });

    // Demander la permission pour afficher les notifications si ce n'est pas encore fait
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  // Charger les infos de l'utilisateur destinataire
  loadReceiverDetails(): void {
    this.privateChatService.getUserById(this.receiverId).subscribe(
      (user: User) => {
        if (!user) {
          console.error('User not found');
          this.router.navigate(['/chat-room']);
        } else {
          this.receiverUser = user;
        }
      },
      (error) => {
        console.error('Error loading user details', error);
        this.router.navigate(['/chat-room']);
      }
    );
  }

  // Charger les anciens messages privés
  loadPrivateMessages(): void {
    if (!this.currentUser?.id) return;

    this.privateChatService.getPrivateMessages(this.currentUser.id, this.receiverId).subscribe(
      (response: { messages: PrivateMessage[] }) => {
        this.privateMessages = response.messages.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        this.scrollToBottom();
      },
      (error) => {
        console.error('Error fetching private messages', error);
      }
    );
  }

  // Envoyer un message privé
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentUser?.id || !this.receiverUser?.id) return;

    const newMsg: PrivateMessage = {
      sender: { id: this.currentUser.id, username: this.currentUser.username },
      receiver: { id: this.receiverUser.id, username: this.receiverUser.username },
      content: this.newMessage,
      createdAt: new Date(),
    };

    this.privateChatService.sendPrivateMessage(newMsg);
    this.newMessage = '';
    this.scrollToBottom();
    this.privateChatService.sendTypingEvent(this.receiverId, false);
  }

  // Afficher une notification (Snackbar + Notification système)
  private notifyUser(msg: PrivateMessage): void {
    if (msg.sender.id !== this.currentUser?.id) {
      // Afficher un Snackbar
      this.snackBar.open(`New message from ${msg.sender.username}: ${msg.content}`, 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      // Afficher une notification système si l'utilisateur n'est pas sur la page
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(`New message from ${msg.sender.username}`, {
          body: msg.content,
          icon: '/assets/chat-icon.png',
        });
      }
    }
  }

  // Faire défiler la conversation vers le bas
  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageContainer) {
        const container = this.messageContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  // Gestion de l'événement de frappe
  onInputChange(): void {
    if (this.newMessage.trim().length > 0) {
      this.privateChatService.sendTypingEvent(this.receiverId, true);
    } else {
      this.privateChatService.sendTypingEvent(this.receiverId, false);
    }
  }

  // Quitter le chat privé
  backToChatRoom(): void {
    this.router.navigate(['/chat-room']);
  }

  // Désinscription des observables à la destruction du composant
  ngOnDestroy(): void {
    this.privateMessageSubscription?.unsubscribe();
    this.typingSubscription?.unsubscribe();
  }
}
