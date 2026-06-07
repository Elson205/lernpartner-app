import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDictl2QJDISXwOCoQXVbP22cMNvDCfb5w",
  authDomain: "lernpartner-app.firebaseapp.com",
  projectId: "lernpartner-app",
  storageBucket: "lernpartner-app.firebasestorage.app",
  messagingSenderId: "777997794237",
  appId: "1:777997794237:web:cd3c60b36a6839ae25f0d4"
};

export const app = initializeApp(firebaseConfig);