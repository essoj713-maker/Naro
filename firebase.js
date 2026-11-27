import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAN-mmAHnb63ioSCNKp-5D2DWhnr1izqUY",
  authDomain: "naro-8f586.firebaseapp.com",
  projectId: "naro-8f586",
  storageBucket: "naro-8f586.firebasestorage.app",
  messagingSenderId: "727934120850",
  appId: "1:727934120850:web:b302ce60ac959302a0074b",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span)

3. دوس على **Commit changes** عشان تحفظه.

---

أول ما تعمل الخطوة دي، قول لي **"تم"** عشان نروح للخطوة اللي بعدها (تفعيل الخدمات من Firebase أو ربط أول ملف زي `Auth.js` أو `Chat.js`)[span_8](start_span)[span_8](end_span).
