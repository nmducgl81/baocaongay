// @ts-ignore
import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";

// Config đã được cập nhật từ Firebase Console của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCbtUQVa3u6loPOoq8Y1kV_Az-IYWO9TMw",
  authDomain: "dsabaocao.firebaseapp.com",
  projectId: "dsabaocao",
  storageBucket: "dsabaocao.firebasestorage.app",
  messagingSenderId: "1010072382940",
  appId: "1:1010072382940:web:2c5da5890767ec3f847319",
  measurementId: "G-JWQ8E7FWDX"
};

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("✅ Firebase Service Initialized");
} catch (error) {
  console.error("❌ Firebase init error:", error);
  console.warn("⚠️ App running in Offline Mode due to Firebase error.");
}

export { db, auth };

// Trả về object chứa trạng thái và mã lỗi
export const ensureAuth = async (): Promise<{ success: boolean; error?: string }> => {
  if (!auth) return { success: false, error: 'no-auth-instance' };
  try {
    // Đăng nhập ẩn danh để có quyền đọc/ghi database
    await signInAnonymously(auth);
    console.log("✅ Firebase Auth: Signed in anonymously");
    return { success: true };
  } catch (error: any) {
    // Xử lý các lỗi quota hoặc config
    const errorCode = error.code;
    
    if (errorCode === 'auth/configuration-not-found' || errorCode === 'auth/operation-not-allowed') {
       console.warn(`⚠️ Firebase Config Error (${errorCode}): Switching to Offline Mode.`);
    } else if (errorCode === 'resource-exhausted') {
       console.warn(`⚠️ Firebase Quota Exceeded: Switching to Offline Mode.`);
    } else {
       console.error("❌ Firebase Auth Error:", errorCode, error.message);
    }
    
    // Trả về false để App chuyển sang dùng LocalStorage
    return { success: false, error: errorCode };
  }
};