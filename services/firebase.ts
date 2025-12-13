import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
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
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const db = firebase.firestore();
export const auth = firebase.auth();

// Initialize analytics (safe check)
try {
  firebase.analytics();
} catch (e) {
  console.log("Analytics not supported in this environment.");
}

export const ensureAuth = async () => {
  try {
    await auth.signInAnonymously();
  } catch (error) {
    console.error("Firebase Anonymous Auth Error:", error);
  }
};