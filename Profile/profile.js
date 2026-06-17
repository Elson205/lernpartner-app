import { app } from "../firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// Modification : import du système global de badges de notification.
import {
  startNotificationBadges,
  stopNotificationBadges,
} from "../notification-badges.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase Storage est temporairement désactivé.
// Plus tard, après le passage à Blaze, il suffira de mettre true.
const STORAGE_ENABLED = false;

/* =========================
   ELEMENTS HTML
========================= */

const form = document.getElementById("profileForm");
const submitBtn = document.getElementById("submitBtn");

const uploadPhoto = document.getElementById("uploadPhoto");
const profilePreview = document.getElementById("profilePreview");

const photoModal = document.getElementById("photoModal");
const photoModalImage = document.getElementById("photoModalImage");
const closePhotoModal = document.getElementById("closePhotoModal");

const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const facultyInput = document.getElementById("faculty");
const fachbereichInput = document.getElementById("fachbereich");
const semesterInput = document.getElementById("semester");

// Modification : remplacement définitif de nationality par languages.
const languagesInput = document.getElementById("languages");

// Modification : support de deux id possibles pour éviter de casser ton HTML actuel.
// Id conseillé dans le HTML : languageSuggestions
// Ancien id possible : countrySuggestions
const languageSuggestions =
  document.getElementById("languageSuggestions") ||
  document.getElementById("countrySuggestions");

/* =========================
   MODAL PERSONNALISÉE
========================= */

const customModal = document.getElementById("customModal");
const modalBox = document.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function showModal(type, title, message, callback = null) {
  if (
    !customModal ||
    !modalBox ||
    !modalIcon ||
    !modalTitle ||
    !modalMessage ||
    !modalCloseBtn
  ) {
    console.error("Modal elements are missing.");
    console.error(`${title}: ${message}`);
    return;
  }

  const icons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };

  modalBox.className = `modal-box ${type}`;
  modalIcon.textContent = icons[type] || "ℹ️";
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  customModal.classList.remove("hidden");

  modalCloseBtn.onclick = () => {
    closeModal();

    if (typeof callback === "function") {
      callback();
    }
  };
}

function closeModal() {
  if (customModal) {
    customModal.classList.add("hidden");
  }
}

if (customModal) {
  customModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

/* =========================
   NAVIGATION
========================= */

const profileBtn = document.getElementById("profileBtn");
const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");
const chatBtn = document.getElementById("chatBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   VARIABLES GLOBALES
========================= */

let currentUser = null;
let currentUserData = null;
let selectedPhotoFile = null;

/* =========================
   MODIFICATION: LISTE DES LANGUES
   Cette liste remplace la liste des pays pour éviter une séparation par nationalité.
========================= */

const languages = [
  "Deutsch",
  "Englisch",
  "Französisch",
  "Spanisch",
  "Italienisch",
  "Portugiesisch",
  "Niederländisch",
  "Polnisch",
  "Ukrainisch",
  "Russisch",
  "Türkisch",
  "Arabisch",
  "Chinesisch",
  "Japanisch",
  "Koreanisch",
  "Hindi",
  "Bengalisch",
  "Urdu",
  "Persisch",
  "Kurdisch",
  "Rumänisch",
  "Bulgarisch",
  "Griechisch",
  "Tschechisch",
  "Ungarisch",
  "Schwedisch",
  "Norwegisch",
  "Finnisch",
  "Dänisch",
  "Swahili",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Amharisch",
  "Andere",
];

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
   HELPERS
========================= */

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

// Modification : helper pour supporter check-languages et l'ancien check-nationality.
function setLanguageStatus(type, message) {
  const languageCheckId = document.getElementById("check-languages")
    ? "check-languages"
    : "check-nationality";

  if (type === "valid") {
    setValid(languageCheckId, message);
  } else if (type === "invalid") {
    setInvalid(languageCheckId, message);
  } else {
    setNeutral(languageCheckId, message);
  }
}

/* =========================
   MODIFICATION: AUTOCOMPLETE SPRACHEN
   Remplace l'ancien autocomplete Nationalität.
========================= */

function renderLanguageSuggestions(searchValue) {
  if (!languageSuggestions || !languagesInput) return;

  languageSuggestions.innerHTML = "";

  const query = normalizeText(searchValue.trim());

  if (!query) {
    languageSuggestions.classList.remove("open");
    return;
  }

  const filteredLanguages = languages.filter((language) =>
    normalizeText(language).startsWith(query)
  );

  if (filteredLanguages.length === 0) {
    languageSuggestions.classList.remove("open");
    return;
  }

  filteredLanguages.forEach((language) => {
    const item = document.createElement("div");

    item.className = "autocomplete-item";
    item.textContent = language;

    item.addEventListener("click", () => {
      languagesInput.value = language;
      languageSuggestions.classList.remove("open");
      checkProfileValid();
    });

    languageSuggestions.appendChild(item);
  });

  languageSuggestions.classList.add("open");
}

/* =========================
   VALIDATION PROFIL
========================= */

function checkProfileValid() {
  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();

  // Modification : récupération du champ languages au lieu de nationality.
  const languagesValue = languagesInput ? languagesInput.value.trim() : "";

  const about = quill.getText().trim();

  const fullnameValid = fullname !== "";
  const emailValid = email !== "";
  const facultyValid = faculty !== "";
  const fachbereichValid = fachbereich !== "";
  const semesterValid = semester !== "";
  const aboutValid = about !== "";

  const hasRealPhoto =
    selectedPhotoFile || !profilePreview.src.includes("user-placeholder.jpg");

  if (hasRealPhoto) {
    setValid("check-photo", "✅ Profilbild ausgewählt");
  } else {
    setNeutral("check-photo", "➖ Profilbild optional");
  }

  if (fullnameValid) {
    setValid("check-fullname", "✅ Name gespeichert");
  } else {
    setInvalid("check-fullname", "❌ Name fehlt");
  }

  if (emailValid) {
    setValid("check-email", "✅ Email gespeichert");
  } else {
    setInvalid("check-email", "❌ Email fehlt");
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

  // Modification : le champ Sprachen est optionnel, comme Nationalität avant.
  if (languagesValue) {
    setLanguageStatus("valid", "✅ Sprachen hinzugefügt");
  } else {
    setLanguageStatus("neutral", "➖ Sprachen optional");
  }

  if (aboutValid) {
    setValid("check-about", "✅ Beschreibung hinzugefügt");
  } else {
    setNeutral("check-about", " ➖ Beschreibung optional");
  }

  const profileIsValid =
    fullnameValid &&
    emailValid &&
    facultyValid &&
    fachbereichValid &&
    semesterValid;

  submitBtn.disabled = !profileIsValid;

  return profileIsValid;
}

/* =========================
   UPLOAD PHOTO
========================= */

async function uploadProfilePhoto(uid, file) {
  if (!file) {
    return currentUserData?.photoURL || "../user-placeholder.jpg";
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

/* =========================
   PROFIL LADEN
========================= */

async function loadUserProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    showModal(
      "warning",
      "Profil nicht gefunden",
      "Profil nicht gefunden. Bitte registriere dich erneut.",
      () => {
        window.location.href = "../Signup/signup.html";
      }
    );

    return;
  }

  currentUserData = userSnap.data();

  fullnameInput.value = currentUserData.fullname || "";
  emailInput.value = currentUserData.email || currentUser.email || "";

  facultyInput.value = currentUserData.faculty || "";
  fachbereichInput.value = currentUserData.fachbereich || "";
  semesterInput.value = currentUserData.semester || "";

  // Modification : affichage de languages avec fallback temporaire sur nationality pour les anciens profils.
  if (languagesInput) {
    languagesInput.value =
      currentUserData.languages || currentUserData.nationality || "";
  }

  profilePreview.src = currentUserData.photoURL || "../user-placeholder.jpg";

  if (currentUserData.aboutHTML) {
    quill.root.innerHTML = currentUserData.aboutHTML;
  } else if (currentUserData.aboutText) {
    quill.setText(currentUserData.aboutText);
  }

  checkProfileValid();
}

/* =========================
   PHOTO PREVIEW
========================= */

uploadPhoto.addEventListener("change", function () {
  const file = this.files[0];

  if (!file) {
    selectedPhotoFile = null;
    checkProfileValid();
    return;
  }

  selectedPhotoFile = file;
  profilePreview.src = URL.createObjectURL(file);

  checkProfileValid();
});

/* =========================
   MODAL PHOTO
========================= */

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
   PROFIL SPEICHERN
========================= */

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const isValid = checkProfileValid();

  if (!isValid) {
    showModal(
      "warning",
      "Pflichtfelder fehlen",
      "Bitte fülle zuerst alle Pflichtfelder korrekt aus."
    );

    return;
  }

  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();

  // Modification : sauvegarde des langues au lieu de la nationalité.
  const languagesValue = languagesInput ? languagesInput.value.trim() : "";

  const aboutText = quill.getText().trim();
  const aboutHTML = quill.root.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Profil wird gespeichert...";

    let photoURL = currentUserData?.photoURL || "../user-placeholder.jpg";

    if (selectedPhotoFile && STORAGE_ENABLED) {
      photoURL = await uploadProfilePhoto(currentUser.uid, selectedPhotoFile);
    }

    await updateDoc(doc(db, "users", currentUser.uid), {
      photoURL,

      faculty,
      fachbereich,
      semester,

      // Modification : nouveau champ Firestore.
      languages: languagesValue,

      aboutText,
      aboutHTML,

      profileCompleted: isValid,

      updatedAt: serverTimestamp(),
    });

    showModal(
      "success",
      "Profil gespeichert",
      "Dein Profil wurde erfolgreich gespeichert.",
      () => {
        window.location.href = "../Courses/courses.html";
      }
    );
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Speichern fehlgeschlagen",
      "Profil konnte nicht gespeichert werden: " + error.message
    );

    submitBtn.textContent = "Profil speichern";
    checkProfileValid();
  }
});

/* =========================
   EVENTS VALIDATION
========================= */

facultyInput.addEventListener("input", checkProfileValid);
fachbereichInput.addEventListener("input", checkProfileValid);
semesterInput.addEventListener("input", checkProfileValid);

// Modification : autocomplete du champ Sprachen.
if (languagesInput) {
  languagesInput.addEventListener("input", () => {
    renderLanguageSuggestions(languagesInput.value);
    checkProfileValid();
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".autocomplete") && languageSuggestions) {
    languageSuggestions.classList.remove("open");
  }
});

quill.on("text-change", checkProfileValid);

/* =========================
   EVENTS NAVIGATION
========================= */

if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "../Profile/profile.html";
  });
}

if (coursesBtn) {
  coursesBtn.addEventListener("click", () => {
    window.location.href = "../Courses/courses.html";
  });
}

if (partnersBtn) {
  partnersBtn.addEventListener("click", () => {
    window.location.href = "../Partners/partners.html";
  });
}

if (requestsBtn) {
  requestsBtn.addEventListener("click", () => {
    window.location.href = "../Partners/requests.html";
  });
}

if (chatBtn) {
  chatBtn.addEventListener("click", () => {
    window.location.href = "../Chat/chat.html";
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      stopNotificationBadges();
      await signOut(auth);
      window.location.href = "../Login/login.html";
    } catch (error) {
      console.error(error);

      showModal(
        "error",
        "Abmeldung fehlgeschlagen",
        "Du konntest nicht abgemeldet werden. Bitte versuche es erneut."
      );
    }
  });
}

/* =========================
   AUTH INIT
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showModal(
      "warning",
      "Nicht angemeldet",
      "Bitte melde dich zuerst an.",
      () => {
        window.location.href = "../Login/login.html";
      }
    );

    return;
  }

  currentUser = user;

  startNotificationBadges(currentUser.uid);

  await loadUserProfile();
});