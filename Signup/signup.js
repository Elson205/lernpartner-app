import { app } from "../firebase-config.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth(app);
auth.languageCode = "de";

const db = getFirestore(app);

const form = document.getElementById("registrationForm");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");

const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

/* =========================
   MESSAGES DE VALIDATION
========================= */

function setValid(id, message) {
  const element = document.getElementById(id);

  if (!element) return;

  element.innerHTML = message;
  element.className = "valid";
}

function setInvalid(id, message) {
  const element = document.getElementById(id);

  if (!element) return;

  element.innerHTML = message;
  element.className = "invalid";
}

function setNeutral(id, message) {
  const element = document.getElementById(id);

  if (!element) return;

  element.innerHTML = message;
  element.className = "neutral";
}

function showMessage(type, message) {
  if (!formMessage) return;

  formMessage.className = `form-message ${type}`;
  formMessage.textContent = message;
}

function clearMessage() {
  if (!formMessage) return;

  formMessage.className = "form-message";
  formMessage.textContent = "";
}

/* =========================
   VALIDATION
========================= */

// Pendant le développement, Gmail est autorisé pour tester la vérification email.
// Plus tard, pour la vraie version, garde uniquement @uni-wuppertal.de.
function isUniversityEmail(email) {
  const cleanedEmail = email.toLowerCase().trim();

  return (
    cleanedEmail.endsWith("@uni-wuppertal.de") ||
    cleanedEmail.endsWith("@gmail.com")
  );
}

function isPasswordValid(password) {
  return password.length >= 6;
}

function passwordsMatch(password, confirmPassword) {
  return password !== "" && password === confirmPassword;
}

/* =========================
   MODIFICATION: état initial neutre des contrôles Signup
   Les erreurs rouges ne s'affichent pas directement au chargement de la page.
========================= */
function resetSignupChecks() {
  setNeutral("check-fullname", "➖ Vor- Nachname eingeben");
  setNeutral("check-email", "➖ Universitäts Email eingeben");
  setNeutral("check-password", "➖ Passwort eingeben");
  setNeutral("check-confirm-password", "➖ Passwort bestätigen");

  submitBtn.disabled = true;
}

/* =========================
   MODIFICATION: validation progressive du formulaire
   Les messages restent neutres tant que l'utilisateur n'a rien saisi.
========================= */
function checkFormValid() {
  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  const fullnameValid = fullname !== "";
  const emailValid = isUniversityEmail(email);
  const passwordValid = isPasswordValid(password);
  const confirmPasswordValid = passwordsMatch(password, confirmPassword);

  if (fullname === "") {
    setNeutral("check-fullname", "➖ Vor- Nachname eingeben");
  } else if (fullnameValid) {
    setValid("check-fullname", "✅ Vor- Nachname eingegeben");
  }

  if (email === "") {
    setNeutral("check-email", "➖ Universitäts Email eingeben");
  } else if (emailValid) {
    setValid("check-email", "✅ Uni-E-Mail-Adresse erkannt");
  } else {
    setInvalid(
      "check-email",
      "❌ Bitte nutze deine Uni-E-Mail-Adresse. Für Tests ist auch Gmail erlaubt."
    );
  }

  if (password === "") {
    setNeutral("check-password", "➖ Passwort eingeben");
  } else if (passwordValid) {
    setValid("check-password", "✅ Passwort gültig");
  } else {
    setInvalid("check-password", "❌ Passwort mindestens 6 Zeichen");
  }

  if (confirmPassword === "") {
    setNeutral("check-confirm-password", "➖ Passwort bestätigen");
  } else if (confirmPasswordValid) {
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

  return (
    fullnameValid &&
    emailValid &&
    passwordValid &&
    confirmPasswordValid
  );
}

/* =========================
   REGISTRATION
========================= */

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  clearMessage();

  const formIsValid = checkFormValid();

  if (!formIsValid) {
    showMessage("error", "Bitte fülle zuerst alle Pflichtfelder korrekt aus.");
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
      password
    );

    const user = userCredential.user;
    const uid = user.uid;

    const loginUrl = new URL("../Login/login.html", window.location.href);
    loginUrl.searchParams.set("email", email);

    const actionCodeSettings = {
      url: loginUrl.toString(),
      handleCodeInApp: false,
    };

    await sendEmailVerification(user, actionCodeSettings);

    await setDoc(doc(db, "users", uid), {
      uid,
      fullname,
      email,

      photoURL: "../user-placeholder.jpg",

      faculty: "",
      fachbereich: "",
      semester: "",
      nationality: "",

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

    await signOut(auth);

    showMessage(
      "success",
      "Konto erfolgreich erstellt. Bitte bestätige jetzt deine E-Mail-Adresse. Wir haben dir einen Bestätigungslink gesendet."
    );

    submitBtn.textContent = "Weiterleitung zur Anmeldung...";

    setTimeout(() => {
      window.location.href = "../Login/login.html";
    }, 4000);
  } catch (error) {
  console.error("Signup error:", error);
  console.error("Firebase error code:", error.code);

  let errorMessage = "Registrierung fehlgeschlagen. Bitte versuche es erneut.";

  if (error.code === "auth/email-already-in-use") {
    errorMessage = "Diese E-Mail-Adresse wird bereits verwendet.";
  } else if (error.code === "auth/invalid-email") {
    errorMessage = "Diese E-Mail-Adresse ist ungültig.";
  } else if (error.code === "auth/weak-password") {
    errorMessage = "Das Passwort ist zu schwach.";
  } else if (error.code === "auth/unauthorized-continue-uri") {
    errorMessage =
      "Die Weiterleitungsadresse ist in Firebase nicht autorisiert. Bitte füge localhost oder 127.0.0.1 unter Authorized domains hinzu.";
  } else if (error.code === "auth/invalid-continue-uri") {
    errorMessage =
      "Die Weiterleitungsadresse für die E-Mail-Bestätigung ist ungültig.";
  } else if (error.code === "auth/network-request-failed") {
    errorMessage =
      "Netzwerkfehler. Bitte überprüfe deine Internetverbindung.";
  } else if (error.code === "auth/too-many-requests") {
    errorMessage =
      "Zu viele Anfragen. Bitte warte einen Moment und versuche es später erneut.";
  }

  showMessage("error", errorMessage);

  submitBtn.disabled = false;
  submitBtn.textContent = "Konto erstellen";
}
});

/* =========================
   LIVE VALIDATION
========================= */

fullnameInput.addEventListener("input", () => {
  clearMessage();
  checkFormValid();
});

emailInput.addEventListener("input", () => {
  clearMessage();
  checkFormValid();
});

passwordInput.addEventListener("input", () => {
  clearMessage();
  checkFormValid();
});

confirmPasswordInput.addEventListener("input", () => {
  clearMessage();
  checkFormValid();
});

resetSignupChecks();