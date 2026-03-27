export const environment = {
  production: false,

  firebaseConfig: {
    apiKey: import.meta.env['NG_APP_FIREBASE_API_KEY'] || 'AIzaSyAy87sajNNmlyRBhsIWnjVu33W7CQZYJpg',
    authDomain: import.meta.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || 'task-manager-app-50490.firebaseapp.com',
    projectId: import.meta.env['NG_APP_FIREBASE_PROJECT_ID'] || 'task-manager-app-50490',
    storageBucket: import.meta.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || 'task-manager-app-50490.firebasestorage.app',
    messagingSenderId: import.meta.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '826466259075',
    appId: import.meta.env['NG_APP_FIREBASE_APP_ID'] || '1:826466259075:web:78601cc277072341634bb6'
  }

};
