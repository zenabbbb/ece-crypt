import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyAj3vJdxcWnQF6I2SaJLe8SR3Q4nyyJ2Zg",
  authDomain: "ecc-app-c3e5c.firebaseapp.com",
  projectId: "ecc-app-c3e5c",
  storageBucket: "ecc-app-c3e5c.firebasestorage.app",
  messagingSenderId: "678295702272",
  appId: "1:678295702272:web:15306246957b202ad281e5",
  measurementId: "G-D4QS755KKF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export shared instances
export const db = getFirestore(app);
export const auth = getAuth(app);
