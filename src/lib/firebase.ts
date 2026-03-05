import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Helper to get config from Env or LocalStorage
const getFirebaseConfig = () => {
  // 1. Try Environment Variables (Render/Vite)
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }

  // 2. Try Local Storage (User configured via Settings)
  const localConfig = localStorage.getItem("firebase_settings");
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch (e) {
      console.error("Invalid local firebase config", e);
      return null;
    }
  }

  return null;
};

const config = getFirebaseConfig();

// Initialize Firebase only if config exists
let app;
let db: Firestore | null = null;

if (config && config.apiKey) {
  try {
    app = initializeApp(config);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.log("Firebase not configured - App running in Local Mode");
}

export { db };
export const isFirebaseReady = !!db;
