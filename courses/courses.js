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

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("addCourseForm");
const courseList = document.getElementById("courseList");
const searchInput = document.getElementById("searchInput");

const addCourseBtn = document.getElementById("addCourseBtn");
const logoutBtn = document.getElementById("logoutBtn");
const partnersBtn = document.getElementById("partnersBtn");
const chatBtn = document.getElementById("chatBtn");

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

function createCourseId(course) {
  return `${normalizeText(course.name)}_${normalizeText(course.semester)}_${normalizeText(course.faculty)}`;
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
      { merge: true }
    );

    courses = [];
    return;
  }

  const userData = userSnap.data();

  courses = Array.isArray(userData.activeCourses)
    ? userData.activeCourses
    : [];
}

async function saveCoursesToFirebase() {
  await updateDoc(doc(db, "users", currentUser.uid), {
    activeCourses: courses,
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

  confirmBtn.addEventListener("click", async () => {
    const confirmed = confirm("Möchtest du diesen Kurs wirklich löschen?");

    if (!confirmed) {
      card.classList.remove("blur");
      confirmBtn.style.display = "none";
      return;
    }

    courses.splice(index, 1);

    await saveCoursesToFirebase();

    renderCourses();
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
    courseList.innerHTML =
      '<p class="empty-message">Keine Kurse gefunden.</p>';
    return;
  }

  list.forEach((course) => {
    const realIndex = courses.findIndex(
      (item) => createCourseId(item) === createCourseId(course)
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

  if (!newCourse.name || !newCourse.semester || !newCourse.faculty) {
    alert("Bitte fülle alle Felder aus.");
    return;
  }

  const alreadyExists = courses.some(
    (course) => createCourseId(course) === createCourseId(newCourse)
  );

  if (alreadyExists) {
    alert("Dieser Kurs wurde bereits hinzugefügt.");
    return;
  }

  try {
    addCourseBtn.disabled = true;
    addCourseBtn.textContent = "Kurs wird gespeichert...";

    courses.push(newCourse);

    await saveCoursesToFirebase();

    form.reset();

    renderCourses();
  } catch (error) {
    console.error(error);
    alert("Kurs konnte nicht gespeichert werden.");
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

partnersBtn.addEventListener("click", () => {
  window.location.href = "../Partners/partners.html";
});

chatBtn.addEventListener("click", () => {
  window.location.href = "../Chat/chat.html";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../Login/login.html";
});

/* =========================
   INIT
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;

  try {
    await loadCoursesFromFirebase();
    renderCourses();
  } catch (error) {
    console.error(error);
    alert("Kurse konnten nicht geladen werden.");
  }
});