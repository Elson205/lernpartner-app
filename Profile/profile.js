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

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const STORAGE_ENABLED = false;

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

const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let currentUserData = null;
let selectedPhotoFile = null;

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

function checkProfileValid() {
  const fullname = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();
  const about = quill.getText().trim();

  const fullnameValid = fullname !== "";
  const emailValid = email !== "";
  const facultyValid = faculty !== "";
  const fachbereichValid = fachbereich !== "";
  const semesterValid = semester !== "";
  const aboutValid = about !== "";

  if (selectedPhotoFile || profilePreview.src.includes("user-placeholder.jpg") === false) {
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

  if (aboutValid) {
    setValid("check-about", "✅ Beschreibung hinzugefügt");
  } else {
    setInvalid("check-about", "❌ Beschreibung fehlt");
  }

  submitBtn.disabled = !(
    fullnameValid &&
    emailValid &&
    facultyValid &&
    fachbereichValid &&
    semesterValid &&
    aboutValid
  );

  return (
    fullnameValid &&
    emailValid &&
    facultyValid &&
    fachbereichValid &&
    semesterValid &&
    aboutValid
  );
}

async function uploadProfilePhoto(uid, file) {
  if (!file) {
    return currentUserData?.photoURL || "user-placeholder.jpg";
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

async function loadUserProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    alert("Profil nicht gefunden. Bitte registriere dich erneut.");
    window.location.href = "../Signup/signup.html";
    return;
  }

  currentUserData = userSnap.data();

  fullnameInput.value = currentUserData.fullname || "";
  emailInput.value = currentUserData.email || currentUser.email || "";

  facultyInput.value = currentUserData.faculty || "";
  fachbereichInput.value = currentUserData.fachbereich || "";
  semesterInput.value = currentUserData.semester || "";

  profilePreview.src = currentUserData.photoURL || "user-placeholder.jpg";

  if (currentUserData.aboutHTML) {
    quill.root.innerHTML = currentUserData.aboutHTML;
  } else if (currentUserData.aboutText) {
    quill.setText(currentUserData.aboutText);
  }

  checkProfileValid();
}

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

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const isValid = checkProfileValid();

  if (!isValid) {
    alert("Bitte fülle zuerst alle Pflichtfelder korrekt aus.");
    return;
  }

  const faculty = facultyInput.value.trim();
  const fachbereich = fachbereichInput.value.trim();
  const semester = semesterInput.value.trim();

  const aboutText = quill.getText().trim();
  const aboutHTML = quill.root.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Profil wird gespeichert...";

    let photoURL = currentUserData?.photoURL || "user-placeholder.jpg";

    if (selectedPhotoFile && STORAGE_ENABLED) {
      photoURL = await uploadProfilePhoto(currentUser.uid, selectedPhotoFile);
    }

    await updateDoc(doc(db, "users", currentUser.uid), {
      photoURL,

      faculty,
      fachbereich,
      semester,

      aboutText,
      aboutHTML,

      profileCompleted: true,

      updatedAt: serverTimestamp(),
    });

    alert("Profil erfolgreich gespeichert ✅");
    window.location.href = "../Courses/courses.html";
  } catch (error) {
    console.error(error);

    alert("Profil konnte nicht gespeichert werden: " + error.message);

    submitBtn.textContent = "Profil speichern";
    checkProfileValid();
  }
});

facultyInput.addEventListener("input", checkProfileValid);
fachbereichInput.addEventListener("input", checkProfileValid);
semesterInput.addEventListener("input", checkProfileValid);
quill.on("text-change", checkProfileValid);

coursesBtn.addEventListener("click", () => {
  window.location.href = "../Courses/courses.html";
});

partnersBtn.addEventListener("click", () => {
  window.location.href = "../Partners/partners.html";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../Login/login.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;

  await loadUserProfile();
});