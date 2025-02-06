import { PrivateChatComponent } from './components/private-chat/private-chat.component';
import { Routes } from '@angular/router';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { ChatRoomComponent } from './components/chat-room/chat-room.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'chat-room', component: ChatRoomComponent },
  { path: 'private-chat/:id', component: PrivateChatComponent },
  { path: '', redirectTo: '/register', pathMatch: 'full' }

];
