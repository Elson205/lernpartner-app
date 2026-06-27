import { app } from "../firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Modification : import du système global de badges de notification.
import {
  startNotificationBadges,
  stopNotificationBadges,
} from "../notification-badges.js";

const auth = getAuth(app);
const db = getFirestore(app);

const receivedRequestsList = document.getElementById("receivedRequestsList");
const sentRequestsList = document.getElementById("sentRequestsList");

const profileBtn = document.getElementById("profileBtn");
const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");
const chatBtn = document.getElementById("chatBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   MODIFICATION: Image de profil par défaut
   Cette image est utilisée si l'utilisateur n'a pas encore ajouté de photo.
========================= */
const DEFAULT_PROFILE_PHOTO = "../user-placeholder.jpg";

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal personnalisée
   Cette modal remplace les alert() classiques du navigateur.
========================= */
const customModal = document.getElementById("customModal");
const modalBox = document.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal profil détaillé
   Cette modal affiche les informations complètes de l'utilisateur lié à une demande.
========================= */
const requestProfileModal = document.getElementById("requestProfileModal");
const requestProfileBackdrop = document.getElementById("requestProfileBackdrop");
const closeRequestProfileModalBtn = document.getElementById(
  "closeRequestProfileModalBtn"
);

const requestProfilePhoto = document.getElementById("requestProfilePhoto");
const requestProfileName = document.getElementById("requestProfileName");
const requestProfileEmail = document.getElementById("requestProfileEmail");
const requestProfileFaculty = document.getElementById("requestProfileFaculty");
const requestProfileFachbereich = document.getElementById(
  "requestProfileFachbereich"
);
const requestProfileSemester = document.getElementById(
  "requestProfileSemester"
);
const requestProfileLanguages = document.getElementById(
  "requestProfileLanguages"
);
const requestProfileCourses = document.getElementById("requestProfileCourses");
const requestProfileAbout = document.getElementById("requestProfileAbout");

/* =========================
   MODIFICATION: Récupération des éléments HTML de la modal photo
   Cette modal permet d'agrandir la photo de profil.
========================= */
const profilePhotoModal = document.getElementById("profilePhotoModal");
const profilePhotoBackdrop = document.getElementById("profilePhotoBackdrop");
const closeProfilePhotoModalBtn = document.getElementById(
  "closeProfilePhotoModalBtn"
);
const largeProfilePhoto = document.getElementById("largeProfilePhoto");

let currentUser = null;

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
   Cela permet de fermer les messages simples sans action obligatoire.
========================= */
if (customModal) {
  customModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

/* =========================
   MODIFICATION: Protection contre l’injection HTML
   Cette fonction sécurise les textes venant de Firestore avant affichage.
========================= */
function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));

  return snap.exists()
    ? {
        id: uid,
        ...snap.data(),
      }
    : null;
}

/* =========================
   MODIFICATION: Fonction pour afficher une valeur propre
   Si une information est vide, on affiche "-".
========================= */
function displayValue(value) {
  return value ? value : "-";
}

/* =========================
   MODIFICATION: Fonction pour récupérer la photo d'un utilisateur
   Si photoURL n'existe pas, on affiche user-placeholder.jpg.
========================= */
function getUserPhotoURL(userData) {
  return userData.photoURL || DEFAULT_PROFILE_PHOTO;
}

/* =========================
   MODIFICATION: Fonction pour récupérer les langues
   On utilise languages en priorité, puis nationality comme fallback temporaire.
========================= */
function getUserLanguages(userData) {
  return userData.languages || userData.nationality || "";
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
   MODIFICATION: Statuts affichés pour les demandes
   Le statut "cancelled" n’est plus nécessaire, car une demande annulée est supprimée.
========================= */
function getStatusText(status) {
  if (status === "pending") return "Ausstehend";
  if (status === "accepted") return "Akzeptiert";
  if (status === "rejected") return "Abgelehnt";
  if (status === "ended") return "Beendet";

  return status || "Unbekannt";
}

// Modification : marque comme vues toutes les demandes concernant l'utilisateur actuel.
async function markRequestsAsSeen() {
  if (!currentUser) return;

  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", currentUser.uid)
  );

  const snapshot = await getDocs(requestsQuery);

  const updates = snapshot.docs.map((requestDocument) => {
    const requestData = requestDocument.data();
    const seenBy = requestData.seenBy || [];

    if (seenBy.includes(currentUser.uid)) {
      return null;
    }

    return updateDoc(doc(db, "partnerRequests", requestDocument.id), {
      seenBy: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp(),
    });
  });

  await Promise.all(updates.filter(Boolean));
}

/* =========================
   MODIFICATION: Ouverture de la modal profil détaillé
   Cette fonction affiche les informations de l'expéditeur ou du destinataire d'une demande.
========================= */
function showRequestProfile(userData) {
  if (
    !requestProfileModal ||
    !requestProfilePhoto ||
    !requestProfileName ||
    !requestProfileEmail ||
    !requestProfileFaculty ||
    !requestProfileFachbereich ||
    !requestProfileSemester ||
    !requestProfileLanguages ||
    !requestProfileCourses ||
    !requestProfileAbout
  ) {
    showModal(
      "error",
      "Profil konnte nicht geöffnet werden",
      "Die Profil-Elemente fehlen im HTML. Bitte überprüfe requests.html."
    );

    return;
  }

  const fullname = userData.fullname || "Unbekannter Nutzer";
  const email = userData.email || "";
  const photoURL = getUserPhotoURL(userData);
  const languages = getUserLanguages(userData);
  const courses = userData.activeCourses || [];
  const about =
    userData.aboutText || userData.about || "Keine Beschreibung angegeben.";

  requestProfilePhoto.src = photoURL;
  requestProfilePhoto.alt = `Profilbild von ${fullname}`;

  requestProfileName.textContent = fullname;
  requestProfileEmail.textContent = displayValue(email);
  requestProfileFaculty.textContent = displayValue(userData.faculty);
  requestProfileFachbereich.textContent = displayValue(userData.fachbereich);
  requestProfileSemester.textContent = displayValue(userData.semester);
  requestProfileLanguages.textContent = displayValue(languages);
  requestProfileAbout.textContent = about;

  renderRequestProfileCourses(courses);

  requestProfileModal.classList.remove("hidden");
}

/* =========================
   MODIFICATION: Affichage des cours dans la modal profil
   Les cours sont affichés sous forme de petits badges.
========================= */
function renderRequestProfileCourses(courses) {
  requestProfileCourses.innerHTML = "";

  if (!Array.isArray(courses) || courses.length === 0) {
    requestProfileCourses.innerHTML =
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

    requestProfileCourses.appendChild(courseChip);
  });

  if (requestProfileCourses.children.length === 0) {
    requestProfileCourses.innerHTML =
      '<p class="empty-message">Keine Kurse angegeben.</p>';
  }
}

/* =========================
   MODIFICATION: Fermeture de la modal profil détaillé
========================= */
function closeRequestProfileModal() {
  if (requestProfileModal) {
    requestProfileModal.classList.add("hidden");
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
   MODIFICATION: Événements de fermeture pour la modal profil
========================= */
if (closeRequestProfileModalBtn) {
  closeRequestProfileModalBtn.addEventListener("click", () => {
    closeRequestProfileModal();
  });
}

if (requestProfileBackdrop) {
  requestProfileBackdrop.addEventListener("click", () => {
    closeRequestProfileModal();
  });
}

/* =========================
   MODIFICATION: Clic sur la photo de profil pour l’ouvrir en grand
========================= */
if (requestProfilePhoto) {
  requestProfilePhoto.addEventListener("click", () => {
    openProfilePhotoModal(
      requestProfilePhoto.src,
      requestProfilePhoto.alt || "Profilbild groß"
    );
  });
}

/* =========================
   MODIFICATION: Événements de fermeture pour la modal photo
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
========================= */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeProfilePhotoModal();
  closeRequestProfileModal();
  closeModal();
});

/* =========================
   MODIFICATION : fin atomique d’une collaboration.
   La demande et le chat sont terminés ensemble, afin que les futures
   règles Firestore puissent vérifier les deux écritures avec getAfter().
========================= */
async function endCollaboration(requestId, otherUserId) {
  const chatId = createChatId(currentUser.uid, otherUserId);

  const batch = writeBatch(db);

  const requestRef = doc(db, "partnerRequests", requestId);
  const chatRef = doc(db, "chats", chatId);

  batch.update(requestRef, {
    status: "ended",
    endedAt: serverTimestamp(),
    endedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
    seenBy: [currentUser.uid],
  });

  batch.set(
    chatRef,
    {
      requestStatus: "ended",
      active: false,
      endedAt: serverTimestamp(),
      endedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/* =========================
   MODIFICATION: Suppression d’une demande envoyée encore en attente
   Quand l’utilisateur annule une demande, elle est supprimée de Firestore.
   Ainsi, elle disparaît des requêtes et ne bloque pas une future nouvelle demande.
========================= */
async function cancelSentRequest(requestId) {
  await deleteDoc(doc(db, "partnerRequests", requestId));
}

/* =========================
   MODIFICATION: Carte pour les demandes reçues
   Les demandes "pending" affichent Akzeptieren/Ablehnen.
   Les demandes "accepted" affichent un bouton pour terminer la collaboration.
   Un bouton "Profil ansehen" est toujours affiché.
========================= */
function createReceivedCard(requestId, sender, senderId, status) {
  const card = document.createElement("div");
  card.className = "request-card";

  const showPendingActions = status === "pending";
  const showEndAction = status === "accepted";

  card.innerHTML = `
    <div class="request-header">
      <img
        src="${escapeHTML(getUserPhotoURL(sender))}"
        class="request-photo"
        alt="Profilbild von ${escapeHTML(sender.fullname || "Unbekannter Nutzer")}"
      />

      <div>
        <h3 class="request-name">
          ${escapeHTML(sender.fullname || "Unbekannter Nutzer")}
        </h3>

        <div class="request-info">
          ${escapeHTML(sender.faculty || "")}
        </div>
      </div>
    </div>

    <span class="status-badge ${escapeHTML(status)}">
      ${escapeHTML(getStatusText(status))}
    </span>

    <div class="request-actions">
      <!-- Modification : bouton pour voir le profil détaillé de l'expéditeur -->
      <button type="button" class="profile-btn">Profil ansehen</button>

      ${
        showPendingActions
          ? `
            <button type="button" class="accept-btn">Akzeptieren</button>
            <button type="button" class="reject-btn">Ablehnen</button>
          `
          : ""
      }

      ${
        showEndAction
          ? `
            <button type="button" class="end-btn">Zusammenarbeit beenden</button>
          `
          : ""
      }
    </div>
  `;

  const profileViewBtn = card.querySelector(".profile-btn");
  const acceptBtn = card.querySelector(".accept-btn");
  const rejectBtn = card.querySelector(".reject-btn");
  const endBtn = card.querySelector(".end-btn");

  if (profileViewBtn) {
    profileViewBtn.addEventListener("click", () => {
      showRequestProfile(sender);
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      try {
        /* =========================
   MODIFICATION : acceptation atomique de la demande et création du chat.
   La demande passe à accepted et le chat est créé ou réactivé
   dans le même batch Firestore.
========================= */
        const chatId = createChatId(currentUser.uid, senderId);

        const batch = writeBatch(db);

        const requestRef = doc(db, "partnerRequests", requestId);
        const chatRef = doc(db, "chats", chatId);

        /* =========================
          MODIFICATION : enregistrement du chat lié à la demande.
          Le chatId permettra aux règles Firestore de vérifier que le chat
          créé correspond bien à cette demande acceptée.
        ========================= */
        batch.update(requestRef, {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          seenBy: [currentUser.uid],
          chatId,
        });
                /* =========================
          MODIFICATION : créer ou réactiver le chat privé.
          archivedBy est réinitialisé afin que les deux utilisateurs
          retrouvent le chat lorsqu’une nouvelle collaboration commence.
        ========================= */
        batch.set(
          chatRef,
          {
            participants: [currentUser.uid, senderId],
            requestId,
            requestStatus: "confirmed",
            active: true,

            createdAt: serverTimestamp(),

            lastMessage: "",
            lastMessageAt: serverTimestamp(),

            unreadCount: {
              [currentUser.uid]: 0,
              [senderId]: 0,
            },

            archivedBy: [],
          },
          { merge: true }
        );

        await batch.commit();

        showModal(
          "success",
          "Anfrage akzeptiert",
          "Die Anfrage wurde akzeptiert. Du wirst jetzt zum Chat weitergeleitet.",
          () => {
            window.location.href = `../Chat/chat.html?chatId=${encodeURIComponent(
              chatId
            )}`;
          }
        );
      } catch (error) {
        console.error(error);

        showModal(
          "error",
          "Fehler",
          "Die Anfrage konnte nicht akzeptiert werden. Bitte versuche es erneut."
        );
      }
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener("click", async () => {
      try {
        // Modification : quand une demande est refusée, seul celui qui refuse l'a déjà vue.
        await updateDoc(doc(db, "partnerRequests", requestId), {
          status: "rejected",
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          seenBy: [currentUser.uid],
        });

        showModal(
          "success",
          "Anfrage abgelehnt",
          "Die Anfrage wurde abgelehnt.",
          async () => {
            await loadRequests();
          }
        );
      } catch (error) {
        console.error(error);

        showModal(
          "error",
          "Fehler",
          "Die Anfrage konnte nicht abgelehnt werden. Bitte versuche es erneut."
        );
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener("click", async () => {
      showModal(
        "warning",
        "Zusammenarbeit beenden",
        "Möchtest du diese Lernpartnerschaft wirklich beenden?",
        async () => {
          try {
            await endCollaboration(requestId, senderId);

            showModal(
              "success",
              "Zusammenarbeit beendet",
              "Die Lernpartnerschaft wurde beendet.",
              async () => {
                await loadRequests();
              }
            );
          } catch (error) {
            console.error(error);

            showModal(
              "error",
              "Fehler",
              "Die Zusammenarbeit konnte nicht beendet werden. Bitte versuche es erneut."
            );
          }
        }
      );
    });
  }

  return card;
}

/* =========================
   MODIFICATION: Carte pour les demandes envoyées
   Une demande "pending" peut être annulée.
   Une demande "accepted" peut être terminée comme collaboration.
   Un bouton "Profil ansehen" est toujours affiché.
========================= */
function createSentCard(requestId, receiver, receiverId, status) {
  const card = document.createElement("div");
  card.className = "request-card";

  /* =========================
     MODIFICATION: Affichage conditionnel des actions
     Le bouton d’annulation apparaît seulement si la demande est encore en attente.
     Le bouton de fin apparaît seulement si la demande a déjà été acceptée.
  ========================= */
  const showCancelAction = status === "pending";
  const showEndAction = status === "accepted";

  card.innerHTML = `
    <div class="request-header">
      <img
        src="${escapeHTML(getUserPhotoURL(receiver))}"
        class="request-photo"
        alt="Profilbild von ${escapeHTML(receiver.fullname || "Unbekannter Nutzer")}"
      />

      <div>
        <h3 class="request-name">
          ${escapeHTML(receiver.fullname || "Unbekannter Nutzer")}
        </h3>

        <div class="request-info">
          ${escapeHTML(receiver.faculty || "")}
        </div>
      </div>
    </div>

    <span class="status-badge ${escapeHTML(status)}">
      ${escapeHTML(getStatusText(status))}
    </span>

    <div class="request-actions">
      <!-- Modification : bouton pour voir le profil détaillé du destinataire -->
      <button type="button" class="profile-btn">Profil ansehen</button>

      ${
        showCancelAction
          ? `
            <button type="button" class="cancel-btn">Anfrage abbrechen</button>
          `
          : ""
      }

      ${
        showEndAction
          ? `
            <button type="button" class="end-btn">Zusammenarbeit beenden</button>
          `
          : ""
      }
    </div>
  `;

  const profileViewBtn = card.querySelector(".profile-btn");
  const cancelBtn = card.querySelector(".cancel-btn");
  const endBtn = card.querySelector(".end-btn");

  if (profileViewBtn) {
    profileViewBtn.addEventListener("click", () => {
      showRequestProfile(receiver);
    });
  }

  /* =========================
     MODIFICATION: Annulation d’une demande envoyée
     La demande est supprimée afin que l’utilisateur puisse refaire une nouvelle demande plus tard.
  ========================= */
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      showModal(
        "warning",
        "Anfrage abbrechen",
        "Möchtest du diese Anfrage wirklich abbrechen?",
        async () => {
          try {
            await cancelSentRequest(requestId);

            showModal(
              "success",
              "Anfrage abgebrochen",
              "Deine Anfrage wurde erfolgreich abgebrochen.",
              async () => {
                await loadRequests();
              }
            );
          } catch (error) {
            console.error(error);

            showModal(
              "error",
              "Fehler",
              "Die Anfrage konnte nicht abgebrochen werden. Bitte versuche es erneut."
            );
          }
        }
      );
    });
  }

  /* =========================
     MODIFICATION: Terminer une collaboration acceptée depuis les demandes envoyées
     Si la demande a été acceptée, l’expéditeur peut aussi mettre fin à la collaboration.
  ========================= */
  if (endBtn) {
    endBtn.addEventListener("click", async () => {
      showModal(
        "warning",
        "Zusammenarbeit beenden",
        "Möchtest du diese Lernpartnerschaft wirklich beenden?",
        async () => {
          try {
            await endCollaboration(requestId, receiverId);

            showModal(
              "success",
              "Zusammenarbeit beendet",
              "Die Lernpartnerschaft wurde beendet.",
              async () => {
                await loadRequests();
              }
            );
          } catch (error) {
            console.error(error);

            showModal(
              "error",
              "Fehler",
              "Die Zusammenarbeit konnte nicht beendet werden. Bitte versuche es erneut."
            );
          }
        }
      );
    });
  }

  return card;
}

/* =========================
   MODIFICATION: chargement des demandes via participants
   Cette requête est compatible avec les règles Firestore sécurisées.
========================= */
async function loadRequests() {
  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", currentUser.uid)
  );

  const requestsSnapshot = await getDocs(requestsQuery);

  const receivedRequests = [];
  const sentRequests = [];

  requestsSnapshot.forEach((docSnap) => {
    const requestData = docSnap.data();

    if (requestData.receiverId === currentUser.uid) {
      receivedRequests.push({
        id: docSnap.id,
        ...requestData,
      });
    }

    if (requestData.senderId === currentUser.uid) {
      sentRequests.push({
        id: docSnap.id,
        ...requestData,
      });
    }
  });

  receivedRequestsList.innerHTML = "";

  if (receivedRequests.length === 0) {
    receivedRequestsList.innerHTML =
      '<p class="empty-message">Keine erhaltenen Anfragen.</p>';
  } else {
    for (const requestData of receivedRequests) {
      const sender = await getUser(requestData.senderId);

      if (!sender) {
        continue;
      }

      receivedRequestsList.appendChild(
        createReceivedCard(
          requestData.id,
          sender,
          requestData.senderId,
          requestData.status
        )
      );
    }
  }

  sentRequestsList.innerHTML = "";

  if (sentRequests.length === 0) {
    sentRequestsList.innerHTML =
      '<p class="empty-message">Keine gesendeten Anfragen.</p>';
  } else {
    for (const requestData of sentRequests) {
      const receiver = await getUser(requestData.receiverId);

      if (!receiver) {
        continue;
      }

      sentRequestsList.appendChild(
        createSentCard(
          requestData.id,
          receiver,
          requestData.receiverId,
          requestData.status
        )
      );
    }
  }
}

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

  try {
    // Modification : démarrage des badges de notification après connexion.
    startNotificationBadges(currentUser.uid);

    // Modification : l'ouverture de la page Requests marque les notifications comme vues.
    await markRequestsAsSeen();

    // Modification : chargement des demandes après le marquage comme vues.
    await loadRequests();
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Laden fehlgeschlagen",
      "Die Anfragen konnten nicht geladen werden."
    );
  }
});