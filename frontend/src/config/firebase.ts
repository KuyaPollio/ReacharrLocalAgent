import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBEs3N0_2zE2x3SkSg1SsXkzXw1IgW-jO8",
  authDomain: "managarr-7c808.firebaseapp.com",
  projectId: "managarr-7c808",
  storageBucket: "managarr-7c808.firebasestorage.app",
  messagingSenderId: "26472322553",
  appId: "1:26472322553:web:725b4fbf2ce15d0f099928",
  measurementId: "G-N8X3HXSVH4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 