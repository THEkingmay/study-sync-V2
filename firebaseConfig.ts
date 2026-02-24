import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth  } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCfcGne7zung3dTwOwV7_UYb4iSD0378mI',
  authDomain: "study-sync-467ee.firebaseapp.com",
  projectId: "study-sync-467ee",
  storageBucket: "study-sync-467ee.firebasestorage.app",
  messagingSenderId: "61091536233",
  appId: "1:61091536233:web:f19da8e217242862f831f8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export{db ,auth}