import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class RegisterComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    const user: User = { username: this.username, password: this.password };
    this.authService.register(user).subscribe({
      next: response => {
        console.log('User registered:', response);
        this.router.navigate(['/login']); // Navigate to login after successful registration
      },
      error: err => {
        console.error('Registration failed:', err);
        this.errorMessage = err.error.error || 'Registration failed';
      }
    });
  }
}
