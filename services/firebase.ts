import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCbtUQVa3u6l0POoq8Y1kV_Az-IYW09TMw",
  authDomain: "dsabaocao.firebaseapp.com",
  projectId: "dsabaocao",
  storageBucket: "dsabaocao.firebasestorage.app",
  messagingSenderId: "1010072382940",
  appId: "1:1010072382940:web:2c5da5890767ec3f847319",
  measurementId: "G-JWQ8E7FWDX"
};

// Initialize Firebase
const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
export const db = app.firestore();
export const auth = app.auth();

// Initialize analytics (safe check)
let analytics;
try {
  analytics = app.analytics();
} catch (e) {
  console.log("Analytics not initialized in this environment.");
}

export const ensureAuth = async () => {
  try {
    // Authenticate anonymously to access Firestore (assuming Rules allow auth users)
    await auth.signInAnonymously();
  } catch (error) {
    console.error("Firebase Anonymous Auth Error:", error);
  }
};