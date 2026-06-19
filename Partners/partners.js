import { app } from "../firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
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

// Modification : import du système global de badges de notification.
import {
  startNotificationBadges,
  stopNotificationBadges,
} from "../notification-badges.js";

const auth = getAuth(app);
const db = getFirestore(app);

const searchForm = document.getElementById("partnerSearchForm");
const searchInput = document.getElementById("partnerSearchInput");
const partnersList = document.getElementById("partnersList");
const suggestionsList = document.getElementById("suggestionsList");

const profileBtn = document.getElementById("profileBtn");
const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");
const chatBtn = document.getElementById("chatBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   MODIFICATION: Image par défaut du profil
   Cette constante évite de répéter le chemin de l'image par défaut dans plusieurs fonctions.
========================= */
const DEFAULT_PROFILE_PHOTO = "../user-placeholder.jpg";

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal personnalisée
   Ces éléments remplacent les alert() classiques par une popup au centre de la page.
========================= */
const customModal = document.getElementById("customModal");
const modalBox = document.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal profil détaillé
   Ces éléments permettent d'afficher un vrai profil complet au lieu d'un simple texte dans showModal().
========================= */
const partnerProfileModal = document.getElementById("partnerProfileModal");
const partnerProfileBackdrop = document.getElementById(
  "partnerProfileBackdrop"
);
const closePartnerProfileModalBtn = document.getElementById(
  "closePartnerProfileModalBtn"
);

const partnerProfilePhoto = document.getElementById("partnerProfilePhoto");
const partnerProfileName = document.getElementById("partnerProfileName");
const partnerProfileEmail = document.getElementById("partnerProfileEmail");
const partnerProfileFaculty = document.getElementById("partnerProfileFaculty");
const partnerProfileFachbereich = document.getElementById(
  "partnerProfileFachbereich"
);
const partnerProfileSemester = document.getElementById(
  "partnerProfileSemester"
);
const partnerProfileLanguages = document.getElementById(
  "partnerProfileLanguages"
);
const partnerProfileCourses = document.getElementById("partnerProfileCourses");
const partnerProfileAbout = document.getElementById("partnerProfileAbout");

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal photo
   Cette modal permet d'agrandir la photo de profil quand l'utilisateur clique dessus.
========================= */
const profilePhotoModal = document.getElementById("profilePhotoModal");
const profilePhotoBackdrop = document.getElementById("profilePhotoBackdrop");
const closeProfilePhotoModalBtn = document.getElementById(
  "closeProfilePhotoModalBtn"
);
const largeProfilePhoto = document.getElementById("largeProfilePhoto");

/* =========================
   MODIFICATION: Fonction pour afficher une modal personnalisée
   Cette fonction remplace alert() et permet aussi d’exécuter une action après le clic sur OK.
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
   MODIFICATION: Fonction pour fermer la modal
   Elle cache simplement la popup personnalisée.
========================= */
function closeModal() {
  if (customModal) {
    customModal.classList.add("hidden");
  }
}

/* =========================
   MODIFICATION: Fermeture de la modal en cliquant sur l’arrière-plan flouté
   L’utilisateur peut fermer la popup avec le bouton OK ou en cliquant derrière.
========================= */
if (customModal) {
  customModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

let currentUser = null;
let currentUserData = null;
let allUsers = [];
let myCourses = [];

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

function getCourseName(course) {
  if (typeof course === "string") {
    return course;
  }

  if (course && typeof course === "object") {
    return course.name || "";
  }

  return "";
}

function getCourseFaculty(course) {
  if (course && typeof course === "object") {
    return course.faculty || "";
  }

  return "";
}

function getCourseSemester(course) {
  if (course && typeof course === "object") {
    return course.semester || "";
  }

  return "";
}

/* =========================
   MODIFICATION: Fonction utilitaire pour récupérer les langues
   On utilise d'abord languages, puis nationality comme fallback temporaire pour les anciens profils.
========================= */
function getUserLanguages(userData) {
  return userData.languages || userData.nationality || "";
}

/* =========================
   MODIFICATION: Fonction utilitaire pour récupérer la bonne photo de profil
   Si l'utilisateur n'a pas encore de photo, on affiche une image par défaut.
========================= */
function getUserPhotoURL(userData) {
  return userData.photoURL || DEFAULT_PROFILE_PHOTO;
}

/* =========================
   MODIFICATION: Fonction pour afficher "-" si une valeur est vide
   Cela rend l'affichage de la modal plus propre.
========================= */
function displayValue(value) {
  return value ? value : "-";
}

/* =========================
   PROFIL COMPLET ?
========================= */

function hasCompletedProfile(userData) {
  return (
    userData.fullname &&
    userData.email &&
    userData.faculty &&
    userData.fachbereich &&
    userData.semester
  );
}

function hasCourses(userData) {
  return (
    Array.isArray(userData.activeCourses) && userData.activeCourses.length > 0
  );
}

function redirectIfProfileOrCoursesMissing(userData) {
  if (!hasCompletedProfile(userData)) {
    showModal(
      "warning",
      "Profil unvollständig",
      "Bitte vervollständige zuerst dein Profil, bevor du Lernpartner suchen kannst.",
      () => {
        window.location.href = "../Profile/profile.html";
      }
    );

    return true;
  }

  if (!hasCourses(userData)) {
    showModal(
      "warning",
      "Keine Kurse gefunden",
      "Bitte füge zuerst mindestens einen Kurs hinzu, bevor du Lernpartner suchen kannst.",
      () => {
        window.location.href = "../Courses/courses.html";
      }
    );

    return true;
  }

  return false;
}

/* =========================
   CHARGER UTILISATEUR ACTUEL
========================= */

async function loadCurrentUserProfile() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));

  if (!userSnap.exists()) {
    showModal(
      "warning",
      "Konto nicht gefunden",
      "Bitte erstelle zuerst ein Konto.",
      () => {
        window.location.href = "../Signup/signup.html";
      }
    );

    return false;
  }

  currentUserData = userSnap.data();

  const shouldRedirect = redirectIfProfileOrCoursesMissing(currentUserData);

  if (shouldRedirect) {
    return false;
  }

  myCourses = currentUserData.activeCourses || [];

  return true;
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
    .filter((user) => user.id !== currentUser.uid)
    .filter((user) => hasCompletedProfile(user))
    .filter((user) => hasCourses(user));
}

/* =========================
   AFFICHAGE CARTE PARTENAIRE
========================= */

function createPartnerCard(user, commonCourses) {
  const card = document.createElement("article");
  card.className = "partner-card";

  const fullname = user.fullname || "Unbekannter Nutzer";
  const photoURL = getUserPhotoURL(user);
  const faculty = user.faculty || "-";
  const fachbereich = user.fachbereich || "-";
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
          <div>${escapeHTML(fachbereich)}</div>
          <div>Semester: ${escapeHTML(semester)}</div>
        </div>
      </div>
    </div>

    <div class="partner-section">
      <strong>Gemeinsame Kurse:</strong>
      ${
        commonCourses.length > 0
          ? escapeHTML(commonCourses.join(", "))
          : "Keine"
      }
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

function getCommonCoursesBetweenUsers(userCourses, searchedValue) {
  const normalizedQuery = normalizeText(searchedValue);

  return userCourses
    .map((course) => getCourseName(course))
    .filter((courseName) =>
      normalizeText(courseName).includes(normalizedQuery)
    );
}

function searchPartners(searchValue) {
  const normalizedQuery = normalizeText(searchValue);

  if (!normalizedQuery) {
    renderPartners([]);
    return;
  }

  const results = allUsers
    .map((user) => {
      const userCourses = user.activeCourses || [];

      const commonCourses = getCommonCoursesBetweenUsers(
        userCourses,
        searchValue
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
   PROFIL DÉTAILLÉ
========================= */

/* =========================
   MODIFICATION: Ouverture de la modal profil détaillé
   Cette fonction remplace l'ancien showProfile() qui affichait seulement du texte dans showModal().
========================= */
function showProfile(user) {
  if (
    !partnerProfileModal ||
    !partnerProfilePhoto ||
    !partnerProfileName ||
    !partnerProfileEmail ||
    !partnerProfileFaculty ||
    !partnerProfileFachbereich ||
    !partnerProfileSemester ||
    !partnerProfileLanguages ||
    !partnerProfileCourses ||
    !partnerProfileAbout
  ) {
    showModal(
      "error",
      "Profil konnte nicht geöffnet werden",
      "Die Profil-Elemente fehlen im HTML. Bitte überprüfe partners.html."
    );

    return;
  }

  const fullname = user.fullname || "Unbekannter Nutzer";
  const email = user.email || "";
  const photoURL = getUserPhotoURL(user);
  const languages = getUserLanguages(user);
  const courses = user.activeCourses || [];
  const about = user.aboutText || user.about || "Keine Beschreibung angegeben.";

  partnerProfilePhoto.src = photoURL;
  partnerProfilePhoto.alt = `Profilbild von ${fullname}`;

  partnerProfileName.textContent = fullname;
  partnerProfileEmail.textContent = displayValue(email);
  partnerProfileFaculty.textContent = displayValue(user.faculty);
  partnerProfileFachbereich.textContent = displayValue(user.fachbereich);
  partnerProfileSemester.textContent = displayValue(user.semester);
  partnerProfileLanguages.textContent = displayValue(languages);
  partnerProfileAbout.textContent = about;

  renderProfileCourses(courses);

  partnerProfileModal.classList.remove("hidden");
}

/* =========================
   MODIFICATION: Affichage des cours dans la modal profil
   Les cours sont affichés sous forme de petits badges lisibles.
========================= */
function renderProfileCourses(courses) {
  partnerProfileCourses.innerHTML = "";

  if (!Array.isArray(courses) || courses.length === 0) {
    partnerProfileCourses.innerHTML =
      '<p class="empty-message">Keine Kurse angegeben.</p>';
    return;
  }

  courses.forEach((course) => {
    const name = getCourseName(course);
    const semester = getCourseSemester(course);
    const faculty = getCourseFaculty(course);

    if (!name) return;

    const courseChip = document.createElement("span");
    courseChip.className = "profile-course-chip";

    const details = [];

    if (semester) {
      details.push(semester);
    }

    if (faculty) {
      details.push(faculty);
    }

    courseChip.textContent =
      details.length > 0 ? `${name} · ${details.join(" · ")}` : name;

    partnerProfileCourses.appendChild(courseChip);
  });

  if (partnerProfileCourses.children.length === 0) {
    partnerProfileCourses.innerHTML =
      '<p class="empty-message">Keine Kurse angegeben.</p>';
  }
}

/* =========================
   MODIFICATION: Fermeture de la modal profil détaillé
========================= */
function closePartnerProfileModal() {
  if (partnerProfileModal) {
    partnerProfileModal.classList.add("hidden");
  }
}

/* =========================
   MODIFICATION: Ouverture de la photo de profil en grand
========================= */
function openProfilePhotoModal(photoURL, altText = "Profilbild groß") {
  if (!profilePhotoModal || !largeProfilePhoto) {
    return;
  }

  largeProfilePhoto.src = photoURL || DEFAULT_PROFILE_PHOTO;
  largeProfilePhoto.alt = altText;

  profilePhotoModal.classList.remove("hidden");
}

/* =========================
   MODIFICATION: Fermeture de la modal photo
========================= */
function closeProfilePhotoModal() {
  if (profilePhotoModal) {
    profilePhotoModal.classList.add("hidden");
  }
}

/* =========================
   MODIFICATION: Événements de fermeture pour la modal profil détaillé
   L'utilisateur peut fermer avec X ou en cliquant sur l'arrière-plan.
========================= */
if (closePartnerProfileModalBtn) {
  closePartnerProfileModalBtn.addEventListener("click", () => {
    closePartnerProfileModal();
  });
}

if (partnerProfileBackdrop) {
  partnerProfileBackdrop.addEventListener("click", () => {
    closePartnerProfileModal();
  });
}

/* =========================
   MODIFICATION: Clic sur la photo de profil pour l'ouvrir en grand
========================= */
if (partnerProfilePhoto) {
  partnerProfilePhoto.addEventListener("click", () => {
    openProfilePhotoModal(
      partnerProfilePhoto.src,
      partnerProfilePhoto.alt || "Profilbild groß"
    );
  });
}

/* =========================
   MODIFICATION: Événements de fermeture pour la modal photo
   L'utilisateur peut fermer avec X ou en cliquant sur l'arrière-plan sombre.
========================= */
if (closeProfilePhotoModalBtn) {
  closeProfilePhotoModalBtn.addEventListener("click", () => {
    closeProfilePhotoModal();
  });
}

if (profilePhotoBackdrop) {
  profilePhotoBackdrop.addEventListener("click", () => {
    closeProfilePhotoModal();
  });
}

/* =========================
   MODIFICATION: Fermeture des modals avec la touche Escape
   Cela rend l'interface plus naturelle comme dans les applications modernes.
========================= */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeProfilePhotoModal();
  closePartnerProfileModal();
  closeModal();
});

/* =========================
   DEMANDE PARTENAIRE
========================= */

/* =========================
   MODIFICATION: Vérification uniquement des demandes encore actives
   Une ancienne demande refusée, terminée ou supprimée ne bloque plus une nouvelle demande.
========================= */
async function requestAlreadyExists(senderId, receiverId) {
  const directRequestSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId)
    )
  );

  const reverseRequestSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("senderId", "==", receiverId),
      where("receiverId", "==", senderId)
    )
  );

  const allRequests = [...directRequestSnap.docs, ...reverseRequestSnap.docs];

  return allRequests.some((docSnap) => {
    const requestData = docSnap.data();

    return (
      requestData.status === "pending" ||
      requestData.status === "accepted"
    );
  });
}

async function sendRequest(user) {
  if (!currentUser) {
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

  const senderId = currentUser.uid;
  const receiverId = user.id;

  if (senderId === receiverId) {
    showModal(
      "warning",
      "Nicht möglich",
      "Du kannst dir selbst keine Anfrage senden."
    );

    return;
  }

  /* =========================
     MODIFICATION: Blocage uniquement si une demande active existe déjà
     Les demandes supprimées, refusées ou terminées ne bloquent plus une nouvelle demande.
  ========================= */
  const activeRequestExists = await requestAlreadyExists(senderId, receiverId);

  if (activeRequestExists) {
    showModal(
      "info",
      "Anfrage bereits vorhanden",
      "Zwischen euch existiert bereits eine offene Anfrage oder aktive Lernpartnerschaft."
    );

    return;
  }

  /* =========================
     MODIFICATION: Ajout de updatedAt lors de la création de la demande
     Cela permet de trier ou suivre plus facilement les demandes dans Firestore.
  ========================= */
  await addDoc(collection(db, "partnerRequests"), {
    senderId,
    receiverId,
    participants: [senderId, receiverId],
    status: "pending",
    seenBy: [senderId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    acceptedAt: null,
    rejectedAt: null,
    endedAt: null,
  });

  showModal(
    "success",
    "Anfrage gesendet",
    "Deine Lernpartner-Anfrage wurde erfolgreich gesendet."
  );
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
    const courseName = getCourseName(course);
    const courseSemester = getCourseSemester(course);
    const courseFaculty = getCourseFaculty(course);

    if (!courseName) return;

    const item = document.createElement("div");
    item.className = "suggestion-item";

    item.innerHTML = `
      <strong>Gemeinsamer Kurs:</strong><br />
      ${escapeHTML(courseName)}
      ${
        courseSemester || courseFaculty
          ? `<br /><small>${escapeHTML(courseSemester)} ${
              courseFaculty ? "- " + escapeHTML(courseFaculty) : ""
            }</small>`
          : ""
      }
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

      showModal(
        "error",
        "Abmeldung fehlgeschlagen",
        "Du konntest nicht abgemeldet werden. Bitte versuche es erneut."
      );
    }
  });
}

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

  // Modification : démarrage des badges de notification après connexion.
  startNotificationBadges(currentUser.uid);

  const profileCanContinue = await loadCurrentUserProfile();

  if (!profileCanContinue) {
    return;
  }

  await loadUsers();

  renderSuggestions();

  if (myCourses.length > 0) {
    const firstCourse = getCourseName(myCourses[0]);

    searchInput.value = firstCourse;
    searchPartners(firstCourse);
  } else {
    renderPartners([]);
  }
});