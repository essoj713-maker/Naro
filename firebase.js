import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE } from './config';

export const ready = !!FIREBASE.apiKey;
const app = ready ? initializeApp(FIREBASE) : null;
export const auth = ready ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }) : null;
export const db = ready ? getFirestore(app) : null;
