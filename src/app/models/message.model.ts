import { User } from "./user.model";

export interface Message {
  _id?: string; // Use _id for MongoDB consistency
  user: User; // Sender of the message (should always be populated)
  receiver?: User; // Receiver of the message (optional for public messages)
  text: string; // Content of the message
  createdAt: Date; // Date of creation
}
