import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private currentUser: User | null = null;

  constructor(private http: HttpClient) {}

  login(user: User): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, user).pipe(
      tap((response: any) => {
        this.currentUser = response.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      }),
      catchError(this.handleError<any>('login'))
    );
  }

  register(user: User): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, user).pipe(
      catchError(this.handleError<any>('register'))
    );
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const storedUser = localStorage.getItem('currentUser');
      this.currentUser = storedUser ? JSON.parse(storedUser) : null;
    }
    return this.currentUser;
  }

  logout(): void {
    if (this.currentUser) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { userId: this.currentUser.id }).subscribe(() => {
        console.log('User disconnected from server');
      });
    }

    this.currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.reload();
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
