import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    const user: User = { username: this.username, password: this.password };
    this.authService.login(user).subscribe(response => {
      console.log('User logged in:', response);
      // Store only the user information without the token
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      // Navigate to the chat-room page after successful login
      this.router.navigate(['/chat-room']);
    }, error => {
      this.errorMessage = error.error.message || 'Login failed';
    });
  }
}
