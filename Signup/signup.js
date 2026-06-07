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

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Desactivation temporaire du stockage.
// Plus tard apres etre passe a Blaze on pourra de nouveau le reativer
const STORAGE_ENABLED = false;

const form = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");

const uploadPhoto = document.getElementById("uploadPhoto");
const profilePreview = document.getElementById("profilePreview");
const photoModal = document.getElementById("photoModal");
const photoModalImage = document.getElementById("photoModalImage");
const closePhotoModal = document.getElementById("closePhotoModal");

const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const facultyInput = document.getElementById("faculty");
const fachbereichInput = document.getElementById("fachbereich");
const semesterInput = document.getElementById("semester");

/* =========================
   QUILL EDITOR
========================= */
const quill = new Quill("#editor", {
  theme: "snow",
  placeholder: "Schreibe kurz etwas über dich...",

  modules: {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
    ],
  },
});

/* =========================
   PHOTO PREVIEW
========================= */
uploadPhoto.addEventListener("change", function () {
  const file = this.files[0];

  if (file) {
    profilePreview.src = URL.createObjectURL(file);
  }

  checkFormValid();
});

/* =========================
   VALIDATION HELPERS
========================= */
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

/* =========================
   VALIDATION EN TEMPS RÉEL
========================= */
function checkFormValid() {
  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();
  const about = quill.getText().trim();
  const photo = uploadPhoto.files.length;

  const fullnameValid = fullname !== "";
  const emailValid = isUniversityEmail(email);
  const passwordValid = isPasswordValid(password);
  const confirmPasswordValid = passwordsMatch(password, confirmPassword);
  const facultyValid = faculty !== "";
  const fachbereichValid = fachbereich !== "";
  const semesterValid = semester !== "";
  const aboutValid = about !== "";

  if (photo > 0) {
    setValid("check-photo", "✅ Profilbild hinzugefügt");
  } else {
    setNeutral("check-photo", "➖ Profilbild optional");
  }

  if (fullnameValid) {
    setValid("check-fullname", "✅ Vor- Nachname eingegeben");
  } else {
    setInvalid("check-fullname", "❌ Vor- Nachname fehlt");
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

  if (facultyValid) {
    setValid("check-faculty", "✅ Fakultät eingetragen");
  } else {
    setInvalid("check-faculty", "❌ Fakultät fehlt");
  }

  if (fachbereichValid) {
    setValid("check-fachbereich", "✅ Fachbereich eingetragen");
  } else {
    setInvalid("check-fachbereich", "❌ Fachbereich fehlt");
  }

  if (semesterValid) {
    setValid("check-semester", "✅ Semester ausgewählt");
  } else {
    setInvalid("check-semester", "❌ Semester fehlt");
  }

  if (aboutValid) {
    setValid("check-about", "✅ Beschreibung hinzugefügt");
  } else {
    setInvalid("check-about", "❌ Beschreibung fehlt");
  }

  submitBtn.disabled = !(
    fullnameValid &&
    emailValid &&
    passwordValid &&
    confirmPasswordValid &&
    facultyValid &&
    fachbereichValid &&
    semesterValid &&
    aboutValid
  );
}

/* =========================
   UPLOAD PHOTO
========================= */
async function uploadProfilePhoto(uid, file) {
  if (!file) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Nur Bilddateien sind erlaubt.");
  }

  const maxImageSize = 25 * 1024 * 1024;

  if (file.size > maxImageSize) {
    throw new Error("Das Profilbild darf maximal 25 MB groß sein.");
  }

  const safeFileName = `${Date.now()}-${file.name.replaceAll("/", "-")}`;
  const photoRef = ref(storage, `profile-photos/${uid}/${safeFileName}`);

  await uploadBytes(photoRef, file);

  return getDownloadURL(photoRef);
}

function openPhotoModal() {
  photoModalImage.src = profilePreview.src;
  photoModal.classList.add("open");
}

function closePhotoModalWindow() {
  photoModal.classList.remove("open");
}

profilePreview.addEventListener("click", openPhotoModal);

closePhotoModal.addEventListener("click", closePhotoModalWindow);

photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModalWindow();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModalWindow();
  }
});

/* =========================
   SUBMIT
========================= */
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
  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();

  const aboutText = quill.getText().trim();
  const aboutHTML = quill.root.innerHTML;

  const photoFile = uploadPhoto.files[0] || null;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Profil wird gespeichert...";

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const uid = userCredential.user.uid;
    // Plus tard lorsque Storage sera active il faudra supprimer cette partie(let et if) et garder uniquement:
    // const photoURL = await uploadProfilePhoto(uid, photoFile);
    let photoURL = "user-placeholder.jpg";

    if (photoFile && STORAGE_ENABLED) {
      photoURL = await uploadProfilePhoto(uid, photoFile);
    }

    await setDoc(doc(db, "users", uid), {
      uid,
      fullname,
      email,
      photoURL,

      faculty,
      fachbereich,
      semester,

      aboutText,
      aboutHTML,

      activeCourses: [],

      online: false,
      lastSeen: null,

      blockedUsers: [],

      createdAt: serverTimestamp(),
    });

    alert("Profil erfolgreich gespeichert ✅");
    window.location.href = "../Partners/partners.html";
  } catch (error) {
    console.error(error);

    alert("Registrierung fehlgeschlagen: " + error.message);

    submitBtn.textContent = "Profil speichern";
    checkFormValid();
  }
});

/* =========================
   EVENTS TEMPS RÉEL
========================= */
fullnameInput.addEventListener("input", checkFormValid);
emailInput.addEventListener("input", checkFormValid);
passwordInput.addEventListener("input", checkFormValid);
confirmPasswordInput.addEventListener("input", checkFormValid);
facultyInput.addEventListener("input", checkFormValid);
fachbereichInput.addEventListener("input", checkFormValid);
semesterInput.addEventListener("input", checkFormValid);

quill.on("text-change", checkFormValid);

checkFormValid();
