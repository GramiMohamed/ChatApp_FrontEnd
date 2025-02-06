import { User } from './user.model';

export interface Message {
  id?: string;
  user: User;          // Sender of the message
  receiver?: User;     // Receiver of the message (optional for public messages)
  text: string;        // Content of the message
  createdAt: Date;     // Creation date of the message
}
