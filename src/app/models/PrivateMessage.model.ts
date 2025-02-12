import { User } from "./user.model";

export interface PrivateMessage {
  _id?: string; // Use _id from MongoDB for consistency
  sender: User; // Sender of the private message
  receiver: User; // Receiver of the private message
  content: string; // Content of the message
  createdAt: Date; // Date when the message was created
}
