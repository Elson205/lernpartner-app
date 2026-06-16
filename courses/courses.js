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
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Modification : import du système global de badges de notification.
import {
  startNotificationBadges,
  stopNotificationBadges,
} from "../notification-badges.js";

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("addCourseForm");
const courseList = document.getElementById("courseList");
const searchInput = document.getElementById("searchInput");

const addCourseBtn = document.getElementById("addCourseBtn");

const profileBtn = document.getElementById("profileBtn");
const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");
const chatBtn = document.getElementById("chatBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal personnalisée
   Cette modal remplace les alert() et les messages classiques du navigateur.
========================= */
const customModal = document.getElementById("customModal");
const modalBox = document.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* =========================
   MODIFICATION: Fonction pour afficher une modal personnalisée
   Le callback permet d’exécuter une action seulement après le clic sur OK.
========================= */
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

/* =========================
   MODIFICATION: Fonction pour fermer la modal personnalisée
   Elle cache simplement la popup.
========================= */
function closeModal() {
  if (customModal) {
    customModal.classList.add("hidden");
  }
}

/* =========================
   MODIFICATION: Fermeture de la modal en cliquant sur l’arrière-plan flouté
   L’utilisateur peut fermer les messages simples en cliquant derrière.
========================= */
if (customModal) {
  customModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

let currentUser = null;
let courses = [];

/* =========================
   UTILITAIRES
========================= */

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCourse(course) {
  if (typeof course === "string") {
    return {
      name: course,
      semester: "",
      faculty: "",
    };
  }

  return {
    name: course?.name || "",
    semester: course?.semester || "",
    faculty: course?.faculty || "",
  };
}

function createCourseId(course) {
  const normalizedCourse = normalizeCourse(course);

  return `${normalizeText(normalizedCourse.name)}_${normalizeText(
    normalizedCourse.semester,
  )}_${normalizeText(normalizedCourse.faculty)}`;
}

/* =========================
   FIREBASE USER COURSES
========================= */

async function loadCoursesFromFirebase() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(
      userRef,
      {
        uid: currentUser.uid,
        email: currentUser.email,
        activeCourses: [],
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    courses = [];
    return;
  }

  const userData = userSnap.data();

  courses = Array.isArray(userData.activeCourses)
    ? userData.activeCourses.map(normalizeCourse)
    : [];
}

async function saveCoursesToFirebase() {
  await updateDoc(doc(db, "users", currentUser.uid), {
    activeCourses: courses,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   AFFICHAGE
========================= */

function createCourseCard(course, index) {
  const card = document.createElement("div");
  card.className = "course-card";

  card.innerHTML = `
    <h3>${escapeHTML(course.name)}</h3>
    <small>${escapeHTML(course.semester)}</small>
    <small>${escapeHTML(course.faculty)}</small>

    <button type="button" class="delete-btn">✖</button>
    <button type="button" class="confirm-delete">Delete</button>
  `;

  const deleteBtn = card.querySelector(".delete-btn");
  const confirmBtn = card.querySelector(".confirm-delete");

  deleteBtn.addEventListener("click", () => {
    card.classList.add("blur");
    confirmBtn.style.display = "block";
  });

  /* =========================
   MODIFICATION: Suppression du confirm() classique
   Le premier clic sur X affiche déjà le bouton Delete.
   Le clic sur Delete confirme directement la suppression du cours.
========================= */
  confirmBtn.addEventListener("click", async () => {
    try {
      courses.splice(index, 1);

      await saveCoursesToFirebase();

      renderCourses();

      showModal(
        "success",
        "Kurs gelöscht",
        "Der Kurs wurde erfolgreich gelöscht.",
      );
    } catch (error) {
      console.error(error);

      showModal(
        "error",
        "Löschen fehlgeschlagen",
        "Der Kurs konnte nicht gelöscht werden. Bitte versuche es erneut.",
      );

      card.classList.remove("blur");
      confirmBtn.style.display = "none";
    }
  });

  return card;
}

function renderCourses() {
  courseList.innerHTML = "";

  if (courses.length === 0) {
    courseList.innerHTML =
      '<p class="empty-message">Keine Kurse hinzugefügt.</p>';
    return;
  }

  courses.forEach((course, index) => {
    courseList.appendChild(createCourseCard(course, index));
  });
}

function renderFilteredCourses(list) {
  courseList.innerHTML = "";

  if (list.length === 0) {
    courseList.innerHTML = '<p class="empty-message">Keine Kurse gefunden.</p>';
    return;
  }

  list.forEach((course) => {
    const realIndex = courses.findIndex(
      (item) => createCourseId(item) === createCourseId(course),
    );

    courseList.appendChild(createCourseCard(course, realIndex));
  });
}

/* =========================
   AJOUTER UN COURS
========================= */

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newCourse = {
    name: form.courseName.value.trim(),
    semester: form.semester.value,
    faculty: form.faculty.value,
  };

  /* =========================
   MODIFICATION: Remplacement de alert() par une modal
   Ce message s’affiche si l’utilisateur n’a pas rempli tous les champs.
========================= */
  if (!newCourse.name || !newCourse.semester || !newCourse.faculty) {
    showModal(
      "warning",
      "Pflichtfelder fehlen",
      "Bitte fülle alle Felder aus.",
    );

    return;
  }

  const alreadyExists = courses.some(
    (course) => createCourseId(course) === createCourseId(newCourse),
  );

  /* =========================
   MODIFICATION: Remplacement de alert() par une modal
   Ce message s’affiche si le cours existe déjà dans la liste.
========================= */
  if (alreadyExists) {
    showModal(
      "info",
      "Kurs bereits vorhanden",
      "Dieser Kurs wurde bereits hinzugefügt.",
    );

    return;
  }

  try {
    addCourseBtn.disabled = true;
    addCourseBtn.textContent = "Kurs wird gespeichert...";

    courses.push(newCourse);

    await saveCoursesToFirebase();

    form.reset();

    renderCourses();

    /* =========================
   MODIFICATION: Message de succès après ajout d’un cours
   L’utilisateur reçoit une confirmation visuelle après l’enregistrement.
========================= */
    showModal(
      "success",
      "Kurs hinzugefügt",
      "Der Kurs wurde erfolgreich hinzugefügt.",
    );
  } catch (error) {
    console.error(error);
    /* =========================
   MODIFICATION: Remplacement de alert() par une modal d’erreur
   Ce message s’affiche si Firestore ne peut pas enregistrer le cours.
========================= */
    showModal(
      "error",
      "Speichern fehlgeschlagen",
      "Kurs konnte nicht gespeichert werden.",
    );
  } finally {
    addCourseBtn.disabled = false;
    addCourseBtn.textContent = "Kurs hinzufügen";
  }
});

/* =========================
   RECHERCHE
========================= */

searchInput.addEventListener("input", function () {
  const query = normalizeText(this.value);

  const filteredCourses = courses.filter((course) => {
    const name = normalizeText(course.name);
    const semester = normalizeText(course.semester);
    const faculty = normalizeText(course.faculty);

    return (
      name.includes(query) ||
      semester.includes(query) ||
      faculty.includes(query)
    );
  });

  renderFilteredCourses(filteredCourses);
});

/* =========================
   HEADER NAVIGATION
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
      // Modification : arrêt des badges avant la déconnexion.
      stopNotificationBadges();
      await signOut(auth);
      window.location.href = "../Login/login.html";
    } catch (error) {
      console.error(error);
      /* =========================
   MODIFICATION: Remplacement de alert() par une modal d’erreur
   Ce message s’affiche si la déconnexion échoue.
========================= */
      showModal(
        "error",
        "Abmeldung fehlgeschlagen",
        "Du konntest nicht abgemeldet werden. Bitte versuche es erneut.",
      );
    }
  });
}

/* =========================
   INIT
========================= */

onAuthStateChanged(auth, async (user) => {
  /* =========================
   MODIFICATION: Message avant redirection si l’utilisateur n’est pas connecté
   La redirection vers Login se fait seulement après le clic sur OK.
========================= */
  if (!user) {
    showModal(
      "warning",
      "Nicht angemeldet",
      "Bitte melde dich zuerst an.",
      () => {
        window.location.href = "../Login/login.html";
      },
    );

    return;
  }

  currentUser = user;

  // Modification : démarrage des badges de notification après connexion.
  startNotificationBadges(currentUser.uid);

  try {
    await loadCoursesFromFirebase();
    renderCourses();
  } catch (error) {
    console.error(error);
    /* =========================
   MODIFICATION: Remplacement de alert() par une modal d’erreur
   Ce message s’affiche si les cours ne peuvent pas être chargés depuis Firestore.
========================= */
    showModal(
      "error",
      "Laden fehlgeschlagen",
      "Kurse konnten nicht geladen werden.",
    );
  }
});
