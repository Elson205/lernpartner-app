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
  getDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
   MODIFICATION: Récupération des éléments HTML de la modal personnalisée
   Cette modal remplace les alert() classiques du navigateur.
========================= */
const customModal = document.getElementById("customModal");
const modalBox = document.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

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

/* =========================
   MODIFICATION: Fonction pour terminer une collaboration acceptée
   La demande passe à "ended" et le chat correspondant devient inactif.
========================= */
async function endCollaboration(requestId, otherUserId) {
  const chatId = createChatId(currentUser.uid, otherUserId);

  await updateDoc(doc(db, "partnerRequests", requestId), {
    status: "ended",
    endedAt: serverTimestamp(),
    endedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", chatId),
    {
      requestStatus: "ended",
      active: false,
      endedAt: serverTimestamp(),
      endedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
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
========================= */
function createReceivedCard(requestId, sender, senderId, status) {
  const card = document.createElement("div");
  card.className = "request-card";

  const showPendingActions = status === "pending";
  const showEndAction = status === "accepted";

  card.innerHTML = `
    <div class="request-header">
      <img
        src="${escapeHTML(sender.photoURL || "../user-placeholder.jpg")}"
        class="request-photo"
        alt="Profilbild"
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

    ${
      showPendingActions
        ? `
          <div class="request-actions">
            <button type="button" class="accept-btn">Akzeptieren</button>
            <button type="button" class="reject-btn">Ablehnen</button>
          </div>
        `
        : ""
    }

    ${
      showEndAction
        ? `
          <div class="request-actions">
            <button type="button" class="end-btn">Zusammenarbeit beenden</button>
          </div>
        `
        : ""
    }
  `;

  const acceptBtn = card.querySelector(".accept-btn");
  const rejectBtn = card.querySelector(".reject-btn");
  const endBtn = card.querySelector(".end-btn");

  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "partnerRequests", requestId), {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const chatId = createChatId(currentUser.uid, senderId);

        await setDoc(
          doc(db, "chats", chatId),
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
        await updateDoc(doc(db, "partnerRequests", requestId), {
          status: "rejected",
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
        src="${escapeHTML(receiver.photoURL || "../user-placeholder.jpg")}"
        class="request-photo"
        alt="Profilbild"
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

    ${
      showCancelAction
        ? `
          <div class="request-actions">
            <button type="button" class="cancel-btn">Anfrage abbrechen</button>
          </div>
        `
        : ""
    }

    ${
      showEndAction
        ? `
          <div class="request-actions">
            <button type="button" class="end-btn">Zusammenarbeit beenden</button>
          </div>
        `
        : ""
    }
  `;

  const cancelBtn = card.querySelector(".cancel-btn");
  const endBtn = card.querySelector(".end-btn");

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

async function loadRequests() {
  const receivedSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("receiverId", "==", currentUser.uid)
    )
  );

  receivedRequestsList.innerHTML = "";

  let hasReceived = false;

  for (const docSnap of receivedSnap.docs) {
    const data = docSnap.data();

    const sender = await getUser(data.senderId);

    if (!sender) continue;

    receivedRequestsList.appendChild(
      createReceivedCard(docSnap.id, sender, data.senderId, data.status)
    );

    hasReceived = true;
  }

  if (!hasReceived) {
    receivedRequestsList.innerHTML =
      '<p class="empty-message">Keine erhaltenen Anfragen.</p>';
  }

  const sentSnap = await getDocs(
    query(
      collection(db, "partnerRequests"),
      where("senderId", "==", currentUser.uid)
    )
  );

  sentRequestsList.innerHTML = "";

  let hasSent = false;

  for (const docSnap of sentSnap.docs) {
    const data = docSnap.data();

    const receiver = await getUser(data.receiverId);

    if (!receiver) continue;

    sentRequestsList.appendChild(
      createSentCard(docSnap.id, receiver, data.receiverId, data.status)
    );

    hasSent = true;
  }

  if (!hasSent) {
    sentRequestsList.innerHTML =
      '<p class="empty-message">Keine gesendeten Anfragen.</p>';
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