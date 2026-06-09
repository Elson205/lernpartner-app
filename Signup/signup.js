import { app } from "../firebase-config.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");

const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

function setValid(id, message) {
  const element = document.getElementById(id);
  element.innerHTML = message;
  element.className = "valid";
}

function setInvalid(id, message) {
  const element = document.getElementById(id);
  element.innerHTML = message;
  element.className = "invalid";
}

function setNeutral(id, message) {
  const element = document.getElementById(id);
  element.innerHTML = message;
  element.className = "neutral";
}

function isUniversityEmail(email) {
  return email.endsWith("@uni-wuppertal.de");
}

function isPasswordValid(password) {
  return password.length >= 6;
}

function passwordsMatch(password, confirmPassword) {
  return password !== "" && password === confirmPassword;
}

function checkFormValid() {
  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  const fullnameValid = fullname !== "";
  const emailValid = isUniversityEmail(email);
  const passwordValid = isPasswordValid(password);
  const confirmPasswordValid = passwordsMatch(password, confirmPassword);

  if (fullnameValid) {
    setValid("check-fullname", "✅ Vor- Nachname eingegeben");
  } else {
    setNeutral("check-fullname", "➖ Vor- Nachname eingeben");
  }

  if (emailValid) {
    setValid("check-email", "✅ Universitäts Email gültig");
  } else {
    setInvalid("check-email", "❌ Email muss mit @uni-wuppertal.de enden");
  }

  if (passwordValid) {
    setValid("check-password", "✅ Passwort gültig");
  } else {
    setInvalid("check-password", "❌ Passwort mindestens 6 Zeichen");
  }

  if (confirmPasswordValid) {
    setValid("check-confirm-password", "✅ Passwörter stimmen überein");
  } else {
    setInvalid("check-confirm-password", "❌ Passwörter stimmen nicht überein");
  }

  submitBtn.disabled = !(
    fullnameValid &&
    emailValid &&
    passwordValid &&
    confirmPasswordValid
  );
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  checkFormValid();

  if (submitBtn.disabled) {
    alert("Bitte fülle zuerst alle Pflichtfelder korrekt aus.");
    return;
  }

  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Konto wird erstellt...";

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid,
      fullname,
      email,

      photoURL: "user-placeholder.jpg",

      faculty: "",
      fachbereich: "",
      semester: "",

      aboutText: "",
      aboutHTML: "",

      activeCourses: [],

      profileCompleted: false,

      online: false,
      lastSeen: null,

      blockedUsers: [],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    alert("Konto erfolgreich erstellt ✅");
    window.location.href = "../Profile/profile.html";
  } catch (error) {
    console.error(error);

    alert("Registrierung fehlgeschlagen: " + error.message);

    submitBtn.disabled = false;
    submitBtn.textContent = "Konto erstellen";
  }
});

fullnameInput.addEventListener("input", checkFormValid);
emailInput.addEventListener("input", checkFormValid);
passwordInput.addEventListener("input", checkFormValid);
confirmPasswordInput.addEventListener("input", checkFormValid);

checkFormValid();