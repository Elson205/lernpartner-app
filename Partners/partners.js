import { app } from "../firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const searchForm = document.getElementById("partnerSearchForm");
const searchInput = document.getElementById("partnerSearchInput");
const partnersList = document.getElementById("partnersList");
const suggestionsList = document.getElementById("suggestionsList");

let currentUser = null;
let allUsers = [];
let myCourses = [];

/* =========================
   UTILITAIRES
========================= */

function normalizeText(text = "") {
  return text
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

/* =========================
   CHARGER UTILISATEUR ACTUEL
========================= */

async function loadCurrentUserProfile() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));

  if (!userSnap.exists()) {
    alert("Bitte zuerst dein Profil vervollständigen.");
    window.location.href = "../Signup/signup.html";
    return;
  }

  const userData = userSnap.data();
  myCourses = userData.activeCourses || [];
}

/* =========================
   CHARGER TOUS LES UTILISATEURS
========================= */

async function loadUsers() {
  const usersSnap = await getDocs(collection(db, "users"));

  allUsers = usersSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((user) => user.id !== currentUser.uid);
}

/* =========================
   AFFICHAGE CARTE PARTENAIRE
========================= */

function createPartnerCard(user, commonCourses) {
  const card = document.createElement("article");
  card.className = "partner-card";

  const fullname = user.fullname || "Unbekannter Nutzer";
  const photoURL = user.photoURL || "user-placeholder.jpg";
  const faculty = user.faculty || "-";
  const semester = user.semester || "-";
  const about = user.aboutText || user.about || "-";

  card.innerHTML = `
    <div class="partner-header">
      <img
        class="partner-photo"
        src="${escapeHTML(photoURL)}"
        alt="Profilbild von ${escapeHTML(fullname)}"
      />

      <div>
        <h3 class="partner-name">${escapeHTML(fullname)}</h3>

        <div class="partner-meta">
          <div>${escapeHTML(faculty)}</div>
          <div>Semester: ${escapeHTML(semester)}</div>
        </div>
      </div>
    </div>

    <div class="partner-section">
      <strong>Gemeinsame Kurse:</strong>
      ${commonCourses.length > 0 ? escapeHTML(commonCourses.join(", ")) : "Keine"}
    </div>

    <div class="partner-section partner-about">
      <strong>Über mich</strong>
      ${escapeHTML(about)}
    </div>

    <div class="partner-actions">
      <button class="profile-btn" type="button">
        Profil ansehen
      </button>

      <button class="request-btn" type="button">
        Anfrage senden
      </button>
    </div>
  `;

  card.querySelector(".profile-btn").addEventListener("click", () => {
    showProfile(user);
  });

  card.querySelector(".request-btn").addEventListener("click", async () => {
    await sendRequest(user);
  });

  return card;
}

function renderPartners(results) {
  partnersList.innerHTML = "";

  if (results.length === 0) {
    partnersList.innerHTML =
      '<p class="empty-message">Keine passenden Lernpartner gefunden.</p>';
    return;
  }

  results.forEach((result) => {
    partnersList.appendChild(
      createPartnerCard(result.user, result.commonCourses)
    );
  });
}

/* =========================
   RECHERCHE PARTENAIRE
========================= */

function searchPartners(searchValue) {
  const normalizedQuery = normalizeText(searchValue);

  if (!normalizedQuery) {
    renderPartners([]);
    return;
  }

  const results = allUsers
    .map((user) => {
      const courses = user.activeCourses || user.courses || [];

      const commonCourses = courses.filter((course) =>
        normalizeText(course).includes(normalizedQuery)
      );

      return {
        user,
        commonCourses,
      };
    })
    .filter((result) => result.commonCourses.length > 0);

  renderPartners(results);
}

/* =========================
   PROFIL
========================= */

function showProfile(user) {
  const courses = user.activeCourses || user.courses || [];

  alert(
    `Profil von ${user.fullname || "Unbekannter Nutzer"}\n\n` +
      `Fakultät: ${user.faculty || "-"}\n` +
      `Fachbereich: ${user.fachbereich || "-"}\n` +
      `Semester: ${user.semester || "-"}\n` +
      `Kurse: ${courses.join(", ") || "-"}\n\n` +
      `Über mich:\n${user.aboutText || user.about || "-"}`
  );
}

/* =========================
   DEMANDE PARTENAIRE
========================= */

async function requestAlreadyExists(senderId, receiverId) {
  const directRequestSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId)
    )
  );

  if (!directRequestSnap.empty) {
    return true;
  }

  const reverseRequestSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("senderId", "==", receiverId),
      where("receiverId", "==", senderId)
    )
  );

  return !reverseRequestSnap.empty;
}

async function sendRequest(user) {
  if (!currentUser) {
    alert("Bitte zuerst anmelden.");
    window.location.href = "../Login/login.html";
    return;
  }

  const senderId = currentUser.uid;
  const receiverId = user.id;

  if (senderId === receiverId) {
    alert("Du kannst dir selbst keine Anfrage senden.");
    return;
  }

  const exists = await requestAlreadyExists(senderId, receiverId);

  if (exists) {
    alert("Zwischen euch existiert bereits eine Anfrage oder Lernpartnerschaft.");
    return;
  }

  await addDoc(collection(db, "partnerRequests"), {
    senderId,
    receiverId,
    status: "pending",
    createdAt: serverTimestamp(),
    acceptedAt: null,
    rejectedAt: null,
  });

  alert("Anfrage gesendet ✅");
}

/* =========================
   SUGGESTIONS
========================= */

function renderSuggestions() {
  suggestionsList.innerHTML = "";

  if (!Array.isArray(myCourses) || myCourses.length === 0) {
    suggestionsList.innerHTML =
      '<p class="empty-message">Noch keine Kurse hinzugefügt.</p>';
    return;
  }

  myCourses.forEach((course) => {
    const courseName = typeof course === "string" ? course : course.name;

    if (!courseName) return;

    const item = document.createElement("div");
    item.className = "suggestion-item";

    item.innerHTML = `
      <strong>Gemeinsamer Kurs:</strong><br />
      ${escapeHTML(courseName)}
    `;

    item.addEventListener("click", () => {
      searchInput.value = courseName;
      searchPartners(courseName);
    });

    suggestionsList.appendChild(item);
  });
}

/* =========================
   EVENTS
========================= */

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchPartners(searchInput.value);
});

searchInput.addEventListener("input", () => {
  searchPartners(searchInput.value);
});

/* =========================
   INIT
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Bitte zuerst anmelden.");
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;

  await loadCurrentUserProfile();
  await loadUsers();

  renderSuggestions();

  if (myCourses.length > 0) {
    const firstCourse =
      typeof myCourses[0] === "string" ? myCourses[0] : myCourses[0].name;

    searchInput.value = firstCourse;
    searchPartners(firstCourse);
  } else {
    renderPartners([]);
  }
});