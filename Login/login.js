import { app } from "../firebase-config.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth(app);
auth.languageCode = "de";

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const formMessage = document.getElementById("formMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const resendVerificationBtn = document.getElementById("resendVerificationBtn");

function showMessage(type, message) {
  formMessage.className = `form-message ${type}`;
  formMessage.textContent = message;
}

function clearMessage() {
  formMessage.className = "form-message";
  formMessage.textContent = "";
}

function hideResendButton() {
  if (resendVerificationBtn) {
    resendVerificationBtn.classList.add("hidden");
  }
}

function showResendButton() {
  if (resendVerificationBtn) {
    resendVerificationBtn.classList.remove("hidden");
  }
}

function createActionCodeSettings(email) {
  const loginUrl = new URL("../Login/login.html", window.location.href);
  loginUrl.searchParams.set("email", email);

  return {
    url: loginUrl.toString(),
    handleCodeInApp: false,
  };
}

function getErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Bitte gib eine gültige E-Mail-Adresse ein.";

    case "auth/user-not-found":
      return "Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.";

    case "auth/wrong-password":
      return "Das Passwort ist falsch.";

    case "auth/invalid-credential":
      return "Die E-Mail-Adresse oder das Passwort ist falsch.";

    case "auth/too-many-requests":
      return "Zu viele fehlgeschlagene Versuche. Bitte versuche es später erneut.";

    case "auth/network-request-failed":
      return "Netzwerkfehler. Bitte überprüfe deine Internetverbindung.";

    case "auth/unauthorized-continue-uri":
      return "Die Weiterleitungsadresse ist in Firebase nicht autorisiert. Bitte prüfe die Authorized domains.";

    case "auth/invalid-continue-uri":
      return "Die Weiterleitungsadresse für die E-Mail-Bestätigung ist ungültig.";

    default:
      return "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
  }
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.textContent = isLoading ? "Anmeldung..." : "Anmelden";
}

/* =========================
   EMAIL AUS URL VORBELEGEN
========================= */

const urlParams = new URLSearchParams(window.location.search);
const emailFromUrl = urlParams.get("email");

if (emailFromUrl) {
  emailInput.value = emailFromUrl;
  passwordInput.focus();

  showMessage(
    "success",
    "Deine E-Mail-Adresse wurde bestätigt. Bitte gib dein Passwort ein und melde dich an."
  );
}

/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearMessage();
  hideResendButton();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("error", "Bitte fülle alle Felder aus.");
    return;
  }

  try {
    setLoading(true);

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await user.reload();

    if (!user.emailVerified) {
      showMessage(
        "error",
        "Bitte bestätige zuerst deine E-Mail-Adresse. Du kannst dir unten einen neuen Bestätigungslink senden lassen."
      );

      showResendButton();

      await signOut(auth);

      setLoading(false);
      return;
    }

    showMessage("success", "Anmeldung erfolgreich. Du wirst weitergeleitet...");

    setTimeout(() => {
      window.location.href = "../Partners/partners.html";
    }, 1000);
  } catch (error) {
    console.error("Login error:", error);
    console.error("Firebase error code:", error.code);

    showMessage("error", getErrorMessage(error.code));

    setLoading(false);
  }
});

/* =========================
   BESTÄTIGUNGSLINK ERNEUT SENDEN
========================= */

if (resendVerificationBtn) {
  resendVerificationBtn.addEventListener("click", async () => {
    clearMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage(
        "error",
        "Bitte gib zuerst deine E-Mail-Adresse und dein Passwort ein."
      );
      return;
    }

    try {
      resendVerificationBtn.disabled = true;
      resendVerificationBtn.textContent = "Link wird gesendet...";

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      if (user.emailVerified) {
        showMessage(
          "success",
          "Deine E-Mail-Adresse ist bereits bestätigt. Du kannst dich jetzt anmelden."
        );

        hideResendButton();
        await signOut(auth);
        return;
      }

      const actionCodeSettings = createActionCodeSettings(email);

      await sendEmailVerification(user, actionCodeSettings);

      await signOut(auth);

      showMessage(
        "success",
        "Ein neuer Bestätigungslink wurde gesendet. Bitte überprüfe dein Postfach und deinen Spam-Ordner."
      );

      hideResendButton();
    } catch (error) {
      console.error("Resend verification error:", error);
      console.error("Firebase error code:", error.code);

      showMessage("error", getErrorMessage(error.code));
    } finally {
      resendVerificationBtn.disabled = false;
      resendVerificationBtn.textContent = "Bestätigungslink erneut senden";
    }
  });
}

/* =========================
   LIVE RESET
========================= */

emailInput.addEventListener("input", () => {
  clearMessage();
  hideResendButton();
});

passwordInput.addEventListener("input", () => {
  clearMessage();
  hideResendButton();
});