import { User } from './user.model';

export interface PrivateMessage {
  id?: string;
  sender: User;        // Sender of the message
  receiver: User;      // Receiver of the message
  content: string;     // Content of the message
  createdAt: Date;     // Creation date of the message
}
