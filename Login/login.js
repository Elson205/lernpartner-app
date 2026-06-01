import { app } from "../firebase-config.js";

import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Anmeldung...";

    await signInWithEmailAndPassword(auth, email, password);

    window.location.href = "../Partners/partners.html";
  } catch (error) {
    console.error(error);
    alert("Anmeldung fehlgeschlagen: " + error.message);

    loginBtn.disabled = false;
    loginBtn.textContent = "Anmelden";
  }
});