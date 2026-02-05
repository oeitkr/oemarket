import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 🔥 동기적으로 초기화 (브라우저에서만)
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export { getToken, onMessage, isSupported };
// 👑 관리자 전용 마스터 키 (이메일)
export const ADMIN_EMAIL = "gas1730@gmail.com";

// 👑 사용자가 관리자인지 확인해주는 도구
export const checkIsAdmin = (user: any) => {
  return user?.email === ADMIN_EMAIL;
};