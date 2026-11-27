import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```[span_5](start_span)[span_5](end_span)

5. انزل لتحت ودوس على **Commit changes** (عشان يحفظ الملف جوه المستودع)[span_6](start_span)[span_6](end_span).

---
