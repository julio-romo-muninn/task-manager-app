import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth, signInWithPopup, GoogleAuthProvider, 
         signOut, user } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<any>;
  private readonly RAILWAY_API_URL = 'https://task-manager-app-production-0fb2.up.railway.app';

  constructor(private auth: Auth, private http: HttpClient) {
    this.user$ = user(this.auth);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);

    // Mirror user to Railway MySQL
    if (result.user) {
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };

      try {
        const response = await fetch(`${this.RAILWAY_API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        console.log('User mirrored to Railway:', response.status);
      } catch (error) {
        console.error('Failed to mirror user to Railway:', error);
      }
    }

    return result;
  }

  logout() {
    return signOut(this.auth);
  }

}