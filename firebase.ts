import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA21LTgLF_C9mgNCdOoXOZ2TcQbMEUvsSk",
  authDomain: "variable3-d31ca.firebaseapp.com",
  projectId: "variable3-d31ca",
  storageBucket: "variable3-d31ca.firebasestorage.app",
  messagingSenderId: "538234227104",
  appId: "1:538234227104:web:67e19e8514b4ca6eef3cc5",
  measurementId: "G-MVRDRFQ0KX",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

