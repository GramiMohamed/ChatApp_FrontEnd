import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { PrivateMessage } from '../../models/PrivateMessage.model';
import { User } from '../../models/user.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  messages: PrivateMessage[] = [];
  newMessage: string = '';
  currentUser: User | null = null;
  receiverId: string = '';
  receiverUser: User | null = null;
  private realTimeMessageSubscription!: Subscription;

  @ViewChild('messageContainer') messageContainer!: ElementRef;

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

    // Récupérer l'ID du destinataire depuis l'URL
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

    // Écoute des messages en temps réel
    this.realTimeMessageSubscription = this.chatService.getMessagesObservable().subscribe((message: PrivateMessage | Message) => {
      if ('sender' in message && 'receiver' in message) {
        // C'est un message privé
        this.messages.push(message as PrivateMessage);
        this.scrollToBottom();
      }
    });

  }

  // Charger les détails de l'utilisateur destinataire
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

  // Charger l'historique des messages privés
  loadPrivateMessages(): void {
    if (!this.currentUser?.id) return;
    this.chatService.getPrivateMessages(this.currentUser.id, this.receiverId).subscribe(
      (messages: PrivateMessage[]) => {
        this.messages = messages.map(msg => ({ ...msg, createdAt: new Date(msg.createdAt) }));
        this.scrollToBottom();
      },
      (error) => {
        console.error('Error fetching private messages', error);
      }
    );
  }

  // Envoyer un message privé
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentUser?.id) return;

    const newMsg: PrivateMessage = {
      sender: this.currentUser,
      receiver: this.receiverUser!,
      content: this.newMessage,
      createdAt: new Date()
    };

    this.messages.push(newMsg); // Ajouter immédiatement pour affichage instantané
    this.scrollToBottom();

    this.chatService.sendMessage(this.currentUser.id, this.currentUser.username, this.newMessage, this.receiverId);
    this.newMessage = ''; // Réinitialiser le champ de saisie
  }

  // Faire défiler vers le bas automatiquement
  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  // Retour à la liste des chats
  backToChatRoom(): void {
    this.router.navigate(['/chat-room']);
  }

  // Désabonnement lors de la destruction du composant
  ngOnDestroy(): void {
    if (this.realTimeMessageSubscription) {
      this.realTimeMessageSubscription.unsubscribe();
    }
  }
}
