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
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
  arrayUnion,
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

// Modification : Firebase Storage reste désactivé tant que le projet n'est pas passé au plan Blaze.
const STORAGE_ENABLED = false;

const chatPage = document.getElementById("chatPage");

const contactsList = document.getElementById("contactsList");
const contactSearchInput = document.getElementById("contactSearchInput");

const chatPartnerName = document.getElementById("chatPartnerName");
const chatPartnerStatus = document.getElementById("chatPartnerStatus");
const activeText = document.getElementById("activeText");
const activeDot = document.getElementById("activeDot");
const backToContactsBtn = document.getElementById("backToContactsBtn");

const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");

// Modification : récupération du bouton d'envoi et du message de collaboration terminée.
const sendMessageBtn = document.getElementById("sendMessageBtn");
const endedChatNotice = document.getElementById("endedChatNotice");

/* =========================
   MODIFICATION: récupération des éléments du sélecteur d'emojis
   Ces éléments permettent d'ouvrir le picker et d'insérer un emoji dans le textarea.
========================= */
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const emojiOptions = document.querySelectorAll(".emoji-option");

const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileFaculty = document.getElementById("profileFaculty");
const profileFachbereich = document.getElementById("profileFachbereich");
const profileSemester = document.getElementById("profileSemester");
const profileLanguages = document.getElementById("profileLanguages");
const profileLastSeen = document.getElementById("profileLastSeen");
const requestStatus = document.getElementById("requestStatus");

const profileBtn = document.getElementById("profileBtn");
const coursesBtn = document.getElementById("coursesBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");
const chatBtn = document.getElementById("chatBtn");
const logoutBtn = document.getElementById("logoutBtn");

const photoModal = document.getElementById("photoModal");
const photoModalImage = document.getElementById("photoModalImage");
const photoModalName = document.getElementById("photoModalName");
const closePhotoModal = document.getElementById("closePhotoModal");

// Modification : éléments de la modal personnalisée.
const customModal = document.getElementById("customModal");
const modalBox = customModal?.querySelector(".modal-box");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* =========================
   MODIFICATION: éléments du menu trois points
   Ces éléments viennent du nouveau chat.html.
========================= */
const chatOptionsBtn = document.getElementById("chatOptionsBtn");
const chatOptionsMenu = document.getElementById("chatOptionsMenu");
const showMediaFilesBtn = document.getElementById("showMediaFilesBtn");
const showSharedLinksBtn = document.getElementById("showSharedLinksBtn");
const openMessageSearchBtn = document.getElementById("openMessageSearchBtn");

/* =========================
   MODIFICATION: éléments de la modal médias/fichiers
========================= */
const mediaFilesModal = document.getElementById("mediaFilesModal");
const mediaFilesBackdrop = document.getElementById("mediaFilesBackdrop");
const closeMediaFilesModalBtn = document.getElementById(
  "closeMediaFilesModalBtn"
);
const mediaFilesList = document.getElementById("mediaFilesList");

/* =========================
   MODIFICATION: éléments de la modal liens partagés
========================= */
const sharedLinksModal = document.getElementById("sharedLinksModal");
const sharedLinksBackdrop = document.getElementById("sharedLinksBackdrop");
const closeSharedLinksModalBtn = document.getElementById(
  "closeSharedLinksModalBtn"
);
const sharedLinksList = document.getElementById("sharedLinksList");

/* =========================
   MODIFICATION: éléments de la modal recherche dans la conversation
========================= */
const messageSearchModal = document.getElementById("messageSearchModal");
const messageSearchBackdrop = document.getElementById("messageSearchBackdrop");
const closeMessageSearchModalBtn = document.getElementById(
  "closeMessageSearchModalBtn"
);
const messageSearchInput = document.getElementById("messageSearchInput");
const messageSearchResults = document.getElementById("messageSearchResults");

let currentUser = null;
let chats = [];
let activeChatId = null;
let activeChat = null;
let activePartner = null;
let attachedFile = null;

/* =========================
   MODIFICATION: stockage local des messages actifs
   Cela permet d'afficher médias, fichiers, liens et résultats de recherche sans refaire une requête.
========================= */
let activeMessages = [];

const urlParams = new URLSearchParams(window.location.search);

// Modification : chatId reçu depuis Requests après acceptation d'une demande.
let pendingChatIdFromUrl = urlParams.get("chatId");

let unsubscribeChats = null;
let unsubscribeMessages = null;

const FILE_LIMITS = {
  image: 25 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  video: 500 * 1024 * 1024,
};

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Modification : fonction de fermeture de la modal personnalisée.
function closeModal() {
  if (!customModal) return;
  customModal.classList.add("hidden");
}

// Modification : fonction showModal pour remplacer les alert().
// Important : si les éléments HTML de la modal sont absents, le callback n'est pas exécuté automatiquement.
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

// Modification : fermeture de la modal avec clic sur le fond.
if (customModal) {
  customModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

function isMobile() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function openMobileChat() {
  if (isMobile()) {
    chatPage.classList.add("mobile-chat-open");
  }
}

function closeMobileChat() {
  chatPage.classList.remove("mobile-chat-open");
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
   MODIFICATION: normalisation pour les recherches
   Permet de chercher sans tenir compte des majuscules et accents.
========================= */
function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(timestamp) {
  if (!timestamp) return "-";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Modification : vérifie si la Lernpartnerschaft est terminée.
function isChatEnded(chat) {
  return chat?.active === false || chat?.requestStatus === "ended";
}

// Modification : met à jour le badge de statut dans le profil de droite.
function renderRequestStatus(chat) {
  if (!requestStatus) return;

  requestStatus.classList.remove("confirmed", "ended");

  if (isChatEnded(chat)) {
    requestStatus.textContent = "Lernpartnerschaft beendet";
    requestStatus.classList.add("ended");
    return;
  }

  requestStatus.textContent = "Lernpartnerschaft bestätigt";
  requestStatus.classList.add("confirmed");
}

// Modification : bloque ou débloque le formulaire selon l'état du chat.
function updateMessageFormState(chat) {
  const ended = isChatEnded(chat);
  const hasSelectedChat = Boolean(chat);

  if (endedChatNotice) {
    endedChatNotice.classList.toggle("hidden", !ended);
  }

  messageInput.disabled = !hasSelectedChat || ended;
  fileInput.disabled = !hasSelectedChat || ended;

  if (sendMessageBtn) {
    sendMessageBtn.disabled = !hasSelectedChat || ended;
  }

    /* =========================
    MODIFICATION: désactivation du bouton emoji si aucun chat n'est sélectionné ou si le chat est terminé
  ========================= */
  if (emojiBtn) {
    emojiBtn.disabled = !hasSelectedChat || ended;
  }

  if ((!hasSelectedChat || ended) && emojiPicker) {
    emojiPicker.classList.add("hidden");
  }

  messageForm.classList.toggle("disabled", !hasSelectedChat || ended);

  if (!hasSelectedChat) {
    messageInput.placeholder = "Wähle zuerst einen Chat aus.";
    return;
  }

  if (ended) {
    messageInput.placeholder = "Diese Lernpartnerschaft wurde beendet.";
    return;
  }

  messageInput.placeholder = "Textnachricht senden...";
}

function getFileCategory(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (ALLOWED_DOCUMENT_TYPES.includes(file.type)) return "document";

  return null;
}

function validateFile(file) {
  const category = getFileCategory(file);

  if (!category) {
    return {
      ok: false,
      message:
        "Dateityp nicht erlaubt. Erlaubt: PDF, Word, Excel, Bilder, Audio und Video.",
    };
  }

  const maxSize = FILE_LIMITS[category];

  if (file.size > maxSize) {
    return {
      ok: false,
      message:
        category === "image"
          ? "Bild zu groß. Maximum: 25 MB."
          : category === "document"
            ? "Dokument zu groß. Maximum: 50 MB."
            : category === "audio"
              ? "Audio zu groß. Maximum: 100 MB."
              : "Video zu groß. Maximum: 500 MB.",
    };
  }

  return {
    ok: true,
    category,
  };
}

function getFileIcon(fileType) {
  if (!fileType) return "📎";
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.startsWith("video/")) return "🎬";
  if (fileType.startsWith("audio/")) return "🎵";
  if (fileType.includes("pdf")) return "📄";
  if (fileType.includes("word")) return "📝";
  if (fileType.includes("excel") || fileType.includes("spreadsheet"))
    return "📊";

  return "📎";
}

function renderEmptyChat() {
  activeChatId = null;
  activeChat = null;
  activePartner = null;
  activeMessages = [];

  chatPartnerName.textContent = "Chat auswählen";
  chatPartnerStatus.textContent = "-";
  activeText.textContent = "Offline";
  activeDot.classList.add("offline");

  messagesList.innerHTML =
    '<p class="empty-message">Wähle einen Kontakt aus.</p>';

  profilePhoto.src = "../user-placeholder.jpg";
  profileName.textContent = "-";
  profileFaculty.textContent = "-";
  profileFachbereich.textContent = "-";
  profileSemester.textContent = "-";
  profileLanguages.textContent = "-";
  profileLastSeen.textContent = "-";

  renderRequestStatus(null);
  updateMessageFormState(null);
}

async function getUserData(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    return {
      id: uid,
      fullname: "Unbekannter Nutzer",
      photoURL: "../user-placeholder.jpg",
      faculty: "-",
      fachbereich: "-",
      semester: "-",
      languages: "-",
      online: false,
      lastSeen: null,
    };
  }

  return {
    id: uid,
    ...userSnap.data(),
  };
}

async function getPartnerData(chat) {
  const partnerId = chat.participants.find((id) => id !== currentUser.uid);

  if (!partnerId) return null;

  return getUserData(partnerId);
}

/* =========================
   MODIFICATION: charge les derniers messages d'un chat pour la recherche globale
   Firestore ne fait pas de recherche texte avancée, donc on charge les derniers messages côté client.
========================= */
async function getRecentMessagesForSearch(chatId) {
  const recentMessagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  const snapshot = await getDocs(recentMessagesQuery);

  return snapshot.docs.map((messageDocument) => ({
    id: messageDocument.id,
    ...messageDocument.data(),
  }));
}

async function enrichChatsWithPartnerData(chatDocs) {
  const enriched = await Promise.all(
    chatDocs.map(async (chat) => {
      const partner = await getPartnerData(chat);
      const recentMessages = await getRecentMessagesForSearch(chat.id);

      return {
        ...chat,
        partner,
        recentMessages,
      };
    })
  );

  return enriched.filter((chat) => chat.partner);
}

/* =========================
   MODIFICATION: trouve un extrait de message correspondant à la recherche globale
========================= */
function getMatchingMessagePreview(chat, queryText) {
  const normalizedQuery = normalizeText(queryText);

  if (!normalizedQuery) return "";

  const matchingMessage = (chat.recentMessages || []).find((message) => {
    if (message.deleted) return false;

    return normalizeText(message.text || "").includes(normalizedQuery);
  });

  return matchingMessage?.text || "";
}

function renderContacts(list = chats, searchValue = "") {
  contactsList.innerHTML = "";

  if (list.length === 0) {
    contactsList.innerHTML =
      '<p class="empty-message contacts-empty">Keine Chats gefunden.</p>';
    return;
  }

  list.forEach((chat) => {
    const partner = chat.partner;
    const unread = chat.unreadCount?.[currentUser.uid] || 0;

    const item = document.createElement("div");

    item.className =
      chat.id === activeChatId ? "contact-item active" : "contact-item";

    const lastMessage = chat.lastMessage || "Noch keine Nachricht";
    const lastMessageTime = formatTime(chat.lastMessageAt);
    const matchingPreview = getMatchingMessagePreview(chat, searchValue);

    item.innerHTML = `
      <div class="contact-avatar-wrapper">
        <img
          class="contact-avatar"
          src="${escapeHTML(partner.photoURL || "../user-placeholder.jpg")}"
          alt="Profilbild von ${escapeHTML(partner.fullname || "Kontakt")}"
        />

        ${partner.online ? '<span class="contact-online-dot"></span>' : ""}
      </div>

      <div>
        <h3 class="contact-name">
          ${escapeHTML(partner.fullname || "Kontakt")}
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </h3>

        <p class="contact-preview">${escapeHTML(lastMessage)}</p>

        ${
          matchingPreview
            ? `<span class="contact-match-hint">Gefunden: ${escapeHTML(
                matchingPreview
              )}</span>`
            : ""
        }
      </div>

      <span class="contact-time">${lastMessageTime}</span>
    `;

    const avatar = item.querySelector(".contact-avatar");

    avatar.addEventListener("click", (event) => {
      event.stopPropagation();

      openPhotoModal(
        partner.photoURL || "../user-placeholder.jpg",
        partner.fullname || "Kontakt"
      );
    });

    item.addEventListener("click", () => {
      selectChat(chat.id);
      openMobileChat();
    });

    contactsList.appendChild(item);
  });
}

function renderChatHeader(partner) {
  chatPartnerName.textContent = `Chat mit ${partner.fullname || "Kontakt"}`;

  if (partner.online) {
    chatPartnerStatus.textContent = "Jetzt online";
    activeText.textContent = "Active";
    activeDot.classList.remove("offline");
  } else {
    chatPartnerStatus.textContent = `Zuletzt online: ${formatDate(
      partner.lastSeen
    )}`;
    activeText.textContent = "Offline";
    activeDot.classList.add("offline");
  }
}

function openPhotoModal(photoURL, name) {
  photoModalImage.src = photoURL || "../user-placeholder.jpg";
  photoModalName.textContent = name || "Profilbild";

  // Modification : compatibilité avec le nouveau HTML qui utilise hidden.
  photoModal.classList.remove("hidden");
  photoModal.classList.add("open");
}

function closePhotoModalWindow() {
  photoModal.classList.remove("open");
  photoModal.classList.add("hidden");
}

closePhotoModal.addEventListener("click", closePhotoModalWindow);

photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModalWindow();
  }
});

function renderProfilePanel(partner) {
  profilePhoto.src = partner.photoURL || "../user-placeholder.jpg";
  profileName.textContent = partner.fullname || "Kontakt";
  profileFaculty.textContent = partner.faculty || "-";
  profileFachbereich.textContent = partner.fachbereich || "-";
  profileSemester.textContent = partner.semester || "-";

  // Modification : affichage des langues, avec fallback temporaire sur nationality pour les anciens profils.
  profileLanguages.textContent = partner.languages || partner.nationality || "-";

  profileLastSeen.textContent = partner.online
    ? "Jetzt online"
    : formatDate(partner.lastSeen);

  profilePhoto.onclick = () => {
    openPhotoModal(
      partner.photoURL || "../user-placeholder.jpg",
      partner.fullname || "Kontakt"
    );
  };
}

/* =========================
   MODIFICATION: ouvrir / fermer le sélecteur d'emojis
========================= */
function toggleEmojiPicker() {
  if (!emojiPicker || !emojiBtn) return;

  if (emojiBtn.disabled) {
    return;
  }

  emojiPicker.classList.toggle("hidden");
}

function closeEmojiPicker() {
  if (!emojiPicker) return;

  emojiPicker.classList.add("hidden");
}

/* =========================
   MODIFICATION: insérer un emoji à la position du curseur
   L'emoji est ajouté dans le textarea sans effacer le message déjà écrit.
========================= */
function insertEmojiIntoMessage(emoji) {
  if (!messageInput || messageInput.disabled) {
    return;
  }

  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;

  const currentText = messageInput.value;

  messageInput.value =
    currentText.slice(0, start) + emoji + currentText.slice(end);

  const newCursorPosition = start + emoji.length;

  messageInput.selectionStart = newCursorPosition;
  messageInput.selectionEnd = newCursorPosition;

  messageInput.focus();

  resizeMessageInput();
}

/* =========================
   MODIFICATION: ouvrir/fermer le menu trois points
========================= */
function toggleChatOptionsMenu() {
  if (!chatOptionsMenu) return;

  chatOptionsMenu.classList.toggle("hidden");
}

function closeChatOptionsMenu() {
  if (!chatOptionsMenu) return;

  chatOptionsMenu.classList.add("hidden");
}

if (chatOptionsBtn) {
  chatOptionsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleChatOptionsMenu();
  });
}

document.addEventListener("click", (event) => {
  if (!chatOptionsMenu || !chatOptionsBtn) return;

  const clickedInsideMenu = chatOptionsMenu.contains(event.target);
  const clickedMenuButton = chatOptionsBtn.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuButton) {
    closeChatOptionsMenu();
  }
});

/* =========================
   MODIFICATION: fonctions générales pour les nouvelles modals du chat
========================= */
function openChatContentModal(modal) {
  if (!modal) return;

  modal.classList.remove("hidden");
}

function closeChatContentModal(modal) {
  if (!modal) return;

  modal.classList.add("hidden");
}

function ensureActiveChatSelected() {
  if (!activeChatId) {
    showModal(
      "info",
      "Kein Chat ausgewählt",
      "Bitte wähle zuerst einen Chat aus."
    );

    return false;
  }

  return true;
}

/* =========================
   MODIFICATION: extraire les liens depuis un texte
========================= */
function extractLinksFromText(text = "") {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];

  return matches.map((url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    return `https://${url}`;
  });
}

/* =========================
   MODIFICATION: afficher les médias et fichiers du chat actif
========================= */
function showMediaAndFiles() {
  closeChatOptionsMenu();

  if (!ensureActiveChatSelected()) return;

  if (!mediaFilesList || !mediaFilesModal) return;

  const fileMessages = activeMessages.filter((message) => {
    return !message.deleted && message.fileURL && message.fileName;
  });

  if (fileMessages.length === 0) {
    mediaFilesList.innerHTML =
      '<p class="empty-message">Keine Medien oder Dateien gefunden.</p>';
    openChatContentModal(mediaFilesModal);
    return;
  }

  const imageMessages = fileMessages.filter((message) =>
    message.fileType?.startsWith("image/")
  );

  const otherFileMessages = fileMessages.filter(
    (message) => !message.fileType?.startsWith("image/")
  );

  let html = "";

  if (imageMessages.length > 0) {
    html += '<div class="media-grid">';

    imageMessages.forEach((message) => {
      html += `
        <div class="media-item">
          <a href="${escapeHTML(message.fileURL)}" target="_blank" rel="noopener noreferrer">
            <img
              src="${escapeHTML(message.fileURL)}"
              alt="${escapeHTML(message.fileName || "Bild")}"
            />
          </a>

          <a href="${escapeHTML(message.fileURL)}" target="_blank" rel="noopener noreferrer">
            ${escapeHTML(message.fileName || "Bild öffnen")}
          </a>
        </div>
      `;
    });

    html += "</div>";
  }

  if (otherFileMessages.length > 0) {
    otherFileMessages.forEach((message) => {
      html += `
        <div class="file-item">
          <div class="file-icon">${getFileIcon(message.fileType || "")}</div>

          <div class="file-details">
            <a href="${escapeHTML(message.fileURL)}" target="_blank" rel="noopener noreferrer">
              ${escapeHTML(message.fileName || "Datei")}
            </a>

            <small>${formatDate(message.createdAt)}</small>
          </div>
        </div>
      `;
    });
  }

  mediaFilesList.innerHTML = html;
  openChatContentModal(mediaFilesModal);
}

/* =========================
   MODIFICATION: afficher les liens partagés du chat actif
========================= */
function showSharedLinks() {
  closeChatOptionsMenu();

  if (!ensureActiveChatSelected()) return;

  if (!sharedLinksList || !sharedLinksModal) return;

  const links = [];

  activeMessages.forEach((message) => {
    if (message.deleted) return;

    const messageLinks = extractLinksFromText(message.text || "");

    messageLinks.forEach((url) => {
      links.push({
        url,
        createdAt: message.createdAt,
      });
    });
  });

  if (links.length === 0) {
    sharedLinksList.innerHTML =
      '<p class="empty-message">Keine Links gefunden.</p>';
    openChatContentModal(sharedLinksModal);
    return;
  }

  sharedLinksList.innerHTML = links
    .map(
      (link) => `
        <div class="link-item">
          <a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHTML(link.url)}
          </a>

          <small>${formatDate(link.createdAt)}</small>
        </div>
      `
    )
    .join("");

  openChatContentModal(sharedLinksModal);
}

/* =========================
   MODIFICATION: ouvrir la recherche dans la conversation
========================= */
function openMessageSearch() {
  closeChatOptionsMenu();

  if (!ensureActiveChatSelected()) return;

  if (!messageSearchModal || !messageSearchInput || !messageSearchResults) {
    return;
  }

  messageSearchInput.value = "";
  messageSearchResults.innerHTML =
    '<p class="empty-message">Gib einen Suchbegriff ein.</p>';

  openChatContentModal(messageSearchModal);

  setTimeout(() => {
    messageSearchInput.focus();
  }, 50);
}

/* =========================
   MODIFICATION: surligner le mot recherché dans les résultats
========================= */
function highlightSearchTerm(text, searchValue) {
  const safeText = escapeHTML(text);

  if (!searchValue.trim()) return safeText;

  const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");

  return safeText.replace(
    regex,
    '<span class="search-highlight">$1</span>'
  );
}

/* =========================
   MODIFICATION: chercher dans les messages du chat actif
========================= */
function searchInsideActiveConversation(searchValue) {
  if (!messageSearchResults) return;

  const normalizedSearch = normalizeText(searchValue.trim());

  if (!normalizedSearch) {
    messageSearchResults.innerHTML =
      '<p class="empty-message">Gib einen Suchbegriff ein.</p>';
    return;
  }

  const results = activeMessages.filter((message) => {
    if (message.deleted) return false;

    return normalizeText(message.text || "").includes(normalizedSearch);
  });

  if (results.length === 0) {
    messageSearchResults.innerHTML =
      '<p class="empty-message">Keine passenden Nachrichten gefunden.</p>';
    return;
  }

  messageSearchResults.innerHTML = results
    .map(
      (message) => `
        <div class="search-result-item">
          <p class="search-result-text">
            ${highlightSearchTerm(message.text || "", searchValue)}
          </p>

          <div class="search-result-meta">
            ${message.senderId === currentUser.uid ? "Du" : activePartner?.fullname || "Kontakt"}
            · ${formatDate(message.createdAt)}
          </div>
        </div>
      `
    )
    .join("");
}

/* =========================
   MODIFICATION: événements du sélecteur d'emojis
   Clic sur 🙂 ouvre le picker, clic sur un emoji l'insère dans le message.
========================= */
if (emojiBtn) {
  emojiBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleEmojiPicker();
  });
}

emojiOptions.forEach((emojiOption) => {
  emojiOption.addEventListener("click", (event) => {
    event.stopPropagation();

    insertEmojiIntoMessage(emojiOption.textContent);
  });
});

/* =========================
   MODIFICATION: fermeture du picker emoji en cliquant ailleurs
========================= */
document.addEventListener("click", (event) => {
  if (!emojiPicker || !emojiBtn) return;

  const clickedInsidePicker = emojiPicker.contains(event.target);
  const clickedEmojiButton = emojiBtn.contains(event.target);

  if (!clickedInsidePicker && !clickedEmojiButton) {
    closeEmojiPicker();
  }
});

if (showMediaFilesBtn) {
  showMediaFilesBtn.addEventListener("click", showMediaAndFiles);
}

if (showSharedLinksBtn) {
  showSharedLinksBtn.addEventListener("click", showSharedLinks);
}

if (openMessageSearchBtn) {
  openMessageSearchBtn.addEventListener("click", openMessageSearch);
}

if (messageSearchInput) {
  messageSearchInput.addEventListener("input", () => {
    searchInsideActiveConversation(messageSearchInput.value);
  });
}

if (closeMediaFilesModalBtn) {
  closeMediaFilesModalBtn.addEventListener("click", () => {
    closeChatContentModal(mediaFilesModal);
  });
}

if (mediaFilesBackdrop) {
  mediaFilesBackdrop.addEventListener("click", () => {
    closeChatContentModal(mediaFilesModal);
  });
}

if (closeSharedLinksModalBtn) {
  closeSharedLinksModalBtn.addEventListener("click", () => {
    closeChatContentModal(sharedLinksModal);
  });
}

if (sharedLinksBackdrop) {
  sharedLinksBackdrop.addEventListener("click", () => {
    closeChatContentModal(sharedLinksModal);
  });
}

if (closeMessageSearchModalBtn) {
  closeMessageSearchModalBtn.addEventListener("click", () => {
    closeChatContentModal(messageSearchModal);
  });
}

if (messageSearchBackdrop) {
  messageSearchBackdrop.addEventListener("click", () => {
    closeChatContentModal(messageSearchModal);
  });
}

/* =========================
   MODIFICATION: copier le texte d'un message
   Utilise Clipboard API avec fallback si le navigateur bloque navigator.clipboard.
========================= */
async function copyMessageText(text) {
  if (!text) {
    showModal("info", "Keine Nachricht", "Dieser Nachrichtentext ist leer.");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    showModal("success", "Kopiert", "Die Nachricht wurde kopiert.");
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Die Nachricht konnte nicht kopiert werden."
    );
  }
}

/* =========================
   MODIFICATION: supprimer un message envoyé
   Le message n'est pas supprimé physiquement, il est marqué comme supprimé.
========================= */
async function deleteMessage(messageId, senderId) {
  if (!activeChatId || !messageId) return;

  if (senderId !== currentUser.uid) {
    showModal(
      "warning",
      "Nicht erlaubt",
      "Du kannst nur deine eigenen Nachrichten löschen."
    );
    return;
  }

  showModal(
    "warning",
    "Nachricht löschen",
    "Möchtest du diese Nachricht wirklich löschen?",
    async () => {
      try {
        await updateDoc(doc(db, "chats", activeChatId, "messages", messageId), {
          text: "",
          fileURL: "",
          fileName: "",
          fileType: "",
          deleted: true,
          deletedAt: serverTimestamp(),
        });

        showModal("success", "Gelöscht", "Die Nachricht wurde gelöscht.");
      } catch (error) {
        console.error(error);

        showModal(
          "error",
          "Fehler",
          "Die Nachricht konnte nicht gelöscht werden."
        );
      }
    }
  );
}

function renderMessages(messages) {
  messagesList.innerHTML = "";

  if (messages.length === 0) {
    messagesList.innerHTML =
      '<p class="empty-message">Noch keine Nachrichten.</p>';
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("div");

    row.className =
      message.senderId === currentUser.uid
        ? "message-row sent"
        : "message-row received";

    const safeText = escapeHTML(message.text || "");
    const safeFileName = escapeHTML(message.fileName || "Datei");
    const fileIcon = getFileIcon(message.fileType || "");

    const isImage = message.fileType?.startsWith("image/");
    const isDeleted = message.deleted === true;

    const readBy = message.readBy || [];
    const partnerHasRead = activePartner && readBy.includes(activePartner.id);

    const checkMark =
      message.senderId === currentUser.uid ? (partnerHasRead ? "✓✓" : "✓") : "";

    row.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${
            isDeleted
              ? `<div class="message-deleted">Diese Nachricht wurde gelöscht.</div>`
              : `
                ${safeText ? `<div class="message-text">${safeText}</div>` : ""}

                ${
                  message.fileURL && isImage
                    ? `<a href="${escapeHTML(message.fileURL)}" target="_blank" rel="noopener noreferrer">
                         <img src="${escapeHTML(message.fileURL)}" class="chat-image" alt="${safeFileName}" />
                       </a>`
                    : ""
                }

                ${
                  message.fileURL && !isImage
                    ? `<div class="message-file">
                        <a href="${escapeHTML(message.fileURL)}" target="_blank" rel="noopener noreferrer">
                          ${fileIcon} ${safeFileName}
                        </a>
                      </div>`
                    : ""
                }
              `
          }
        </div>

        ${
          !isDeleted
            ? `
              <div class="message-actions">
                ${
                  message.text
                    ? `<button type="button" class="message-action-btn copy-btn">Kopieren</button>`
                    : ""
                }

                ${
                  message.senderId === currentUser.uid
                    ? `<button type="button" class="message-action-btn delete delete-btn">Löschen</button>`
                    : ""
                }
              </div>
            `
            : ""
        }

        <div class="message-time">
          ${formatTime(message.createdAt)} ${checkMark}
        </div>
      </div>
    `;

    const copyBtn = row.querySelector(".copy-btn");
    const deleteBtn = row.querySelector(".delete-btn");

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        copyMessageText(message.text || "");
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        deleteMessage(message.id, message.senderId);
      });
    }

    messagesList.appendChild(row);
  });

  messagesList.scrollTop = messagesList.scrollHeight;
}

function subscribeToChats() {
  if (unsubscribeChats) {
    unsubscribeChats();
  }

  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.uid)
  );

  unsubscribeChats = onSnapshot(
    chatsQuery,
    async (snapshot) => {
      const chatDocs = snapshot.docs
        .map((chatDocument) => ({
          id: chatDocument.id,
          ...chatDocument.data(),
        }))
        .sort((a, b) => {
          const dateA = a.lastMessageAt?.toMillis
            ? a.lastMessageAt.toMillis()
            : 0;

          const dateB = b.lastMessageAt?.toMillis
            ? b.lastMessageAt.toMillis()
            : 0;

          return dateB - dateA;
        });

      chats = await enrichChatsWithPartnerData(chatDocs);

      renderContacts(chats, contactSearchInput.value);

      // Modification : ouverture automatique du chat reçu dans l'URL.
      if (pendingChatIdFromUrl) {
        const requestedChat = chats.find(
          (chat) => chat.id === pendingChatIdFromUrl
        );

        if (requestedChat) {
          selectChat(requestedChat.id);
          openMobileChat();
          pendingChatIdFromUrl = null;
          return;
        }
      }

      if (!activeChatId && chats.length > 0 && !isMobile()) {
        selectChat(chats[0].id);
        return;
      }

      // Modification : si le chat actif change dans Firestore, on met à jour son état.
      if (activeChatId) {
        const updatedActiveChat = chats.find((chat) => chat.id === activeChatId);

        if (updatedActiveChat) {
          activeChat = updatedActiveChat;
          activePartner = updatedActiveChat.partner;

          renderChatHeader(activePartner);
          renderProfilePanel(activePartner);
          renderRequestStatus(activeChat);
          updateMessageFormState(activeChat);
          renderContacts(chats, contactSearchInput.value);
        } else {
          renderEmptyChat();
        }
      }
    },
    (error) => {
      console.error(error);
      contactsList.innerHTML =
        '<p class="empty-message contacts-empty">Chats konnten nicht geladen werden.</p>';

      showModal("error", "Fehler", "Chats konnten nicht geladen werden.");
    }
  );
}

function subscribeToMessages(chatId) {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(80)
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const messages = snapshot.docs.map((messageDocument) => ({
        id: messageDocument.id,
        ...messageDocument.data(),
      }));

      // Modification : sauvegarde locale des messages actifs pour médias/liens/recherche.
      activeMessages = messages;

      renderMessages(messages);
      await markMessagesAsRead(chatId, snapshot.docs);

      // Modification : si la modal recherche est ouverte, on met les résultats à jour automatiquement.
      if (
        messageSearchModal &&
        !messageSearchModal.classList.contains("hidden") &&
        messageSearchInput
      ) {
        searchInsideActiveConversation(messageSearchInput.value);
      }
    },
    (error) => {
      console.error(error);
      messagesList.innerHTML =
        '<p class="empty-message">Nachrichten konnten nicht geladen werden.</p>';

      showModal(
        "error",
        "Fehler",
        "Nachrichten konnten nicht geladen werden."
      );
    }
  );
}

async function markMessagesAsRead(chatId, messageDocs) {
  const unreadMessages = messageDocs.filter((messageDocument) => {
    const data = messageDocument.data();

    return (
      data.senderId !== currentUser.uid &&
      !(data.readBy || []).includes(currentUser.uid)
    );
  });

  for (const messageDocument of unreadMessages) {
    await updateDoc(doc(db, "chats", chatId, "messages", messageDocument.id), {
      readBy: arrayUnion(currentUser.uid),
    });
  }

  if (unreadMessages.length > 0) {
    await updateDoc(doc(db, "chats", chatId), {
      [`unreadCount.${currentUser.uid}`]: 0,
    });
  }
}

async function selectChat(chatId) {
  activeChatId = chatId;

  const chat = chats.find((item) => item.id === chatId);

  if (!chat) {
    renderEmptyChat();
    return;
  }

  activeChat = chat;
  activePartner = chat.partner;
  activeMessages = [];

  attachedFile = null;
  fileInput.value = "";
  filePreview.textContent = "";

  closeChatOptionsMenu();
  closeChatContentModal(mediaFilesModal);
  closeChatContentModal(sharedLinksModal);
  closeChatContentModal(messageSearchModal);

  renderContacts(chats, contactSearchInput.value);
  renderChatHeader(activePartner);
  renderProfilePanel(activePartner);

  // Modification : affichage du statut et blocage éventuel du formulaire.
  renderRequestStatus(activeChat);
  updateMessageFormState(activeChat);

  subscribeToMessages(chatId);
}

async function uploadAttachedFile(chatId, file) {
  const safeName = `${Date.now()}-${file.name.replaceAll("/", "-")}`;
  const fileRef = ref(storage, `chat-files/${chatId}/${safeName}`);

  await uploadBytes(fileRef, file);

  return getDownloadURL(fileRef);
}

async function sendMessage() {
  if (!activeChatId || !activePartner || !activeChat) {
    showModal(
      "info",
      "Kein Chat ausgewählt",
      "Bitte wähle zuerst einen Chat aus."
    );
    return;
  }

  // Modification : empêche l'envoi si la collaboration est terminée.
  if (isChatEnded(activeChat)) {
    showModal(
      "info",
      "Lernpartnerschaft beendet",
      "Diese Lernpartnerschaft wurde beendet. Du kannst keine neuen Nachrichten mehr senden."
    );
    return;
  }

  const text = messageInput.value.trim();

  if (!text && !attachedFile) {
    return;
  }

  let fileURL = "";
  let fileName = "";
  let fileType = "";

  // Modification : les pièces jointes restent bloquées tant que Firebase Storage n'est pas activé.
  if (attachedFile) {
    if (!STORAGE_ENABLED) {
      showModal(
        "info",
        "Dateianhänge deaktiviert",
        "Dateianhänge sind momentan deaktiviert. Firebase Storage ist noch nicht aktiviert."
      );
      return;
    }

    const validation = validateFile(attachedFile);

    if (!validation.ok) {
      showModal("warning", "Datei nicht erlaubt", validation.message);
      return;
    }

    fileURL = await uploadAttachedFile(activeChatId, attachedFile);
    fileName = attachedFile.name;
    fileType = attachedFile.type;
  }

  await addDoc(collection(db, "chats", activeChatId, "messages"), {
    senderId: currentUser.uid,
    text,
    fileURL,
    fileName,
    fileType,
    createdAt: serverTimestamp(),
    readBy: [currentUser.uid],
    edited: false,
    editedAt: null,
    deleted: false,
  });

  await updateDoc(doc(db, "chats", activeChatId), {
    lastMessage: text || `Datei: ${fileName}`,
    lastMessageAt: serverTimestamp(),
    [`unreadCount.${activePartner.id}`]: increment(1),
  });

  messageInput.value = "";
  resizeMessageInput();

  fileInput.value = "";
  attachedFile = null;
  filePreview.textContent = "";
}

async function setUserOnlineStatus(isOnline) {
  if (!currentUser) return;

  await setDoc(
    doc(db, "users", currentUser.uid),
    {
      online: isOnline,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   MODIFICATION: agrandissement automatique du textarea
   La zone grandit jusqu'à une limite quand le texte devient long.
========================= */
function resizeMessageInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 130)}px`;
}

messageInput.addEventListener("input", resizeMessageInput);

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await sendMessage();
  } catch (error) {
    console.error(error);

    showModal("error", "Fehler", "Nachricht konnte nicht gesendet werden.");
  }
});

/* =========================
   MODIFICATION: comportement type WhatsApp
   Enter envoie le message, Shift + Enter ajoute une nouvelle ligne.
========================= */
messageInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    try {
      await sendMessage();
    } catch (error) {
      console.error(error);

      showModal("error", "Fehler", "Nachricht konnte nicht gesendet werden.");
    }
  }
});

fileInput.addEventListener("change", () => {
  // Modification : remplacement de alert() par showModal().
  if (!STORAGE_ENABLED) {
    showModal(
      "info",
      "Dateianhänge deaktiviert",
      "Dateianhänge sind momentan deaktiviert."
    );

    fileInput.value = "";
    attachedFile = null;
    filePreview.textContent = "";
    return;
  }

  attachedFile = fileInput.files[0] || null;

  if (!attachedFile) {
    filePreview.textContent = "";
    return;
  }

  const validation = validateFile(attachedFile);

  if (!validation.ok) {
    showModal("warning", "Datei nicht erlaubt", validation.message);

    fileInput.value = "";
    attachedFile = null;
    filePreview.textContent = "";
    return;
  }

  filePreview.textContent = `Datei angehängt: ${attachedFile.name}`;
});

/* =========================
   MODIFICATION: recherche globale dans les contacts et les derniers messages
   La recherche regarde le nom du partenaire + les derniers messages chargés côté client.
========================= */
contactSearchInput.addEventListener("input", () => {
  const queryText = contactSearchInput.value.trim();
  const normalizedQuery = normalizeText(queryText);

  if (!normalizedQuery) {
    renderContacts(chats, "");
    return;
  }

  const filteredChats = chats.filter((chat) => {
    const partnerName = chat.partner.fullname || "";
    const partnerMatch = normalizeText(partnerName).includes(normalizedQuery);

    const messageMatch = (chat.recentMessages || []).some((message) => {
      if (message.deleted) return false;

      return normalizeText(message.text || "").includes(normalizedQuery);
    });

    return partnerMatch || messageMatch;
  });

  renderContacts(filteredChats, queryText);
});

backToContactsBtn.addEventListener("click", closeMobileChat);

window.addEventListener("resize", () => {
  if (!isMobile()) {
    closeMobileChat();
  }
});

window.addEventListener("beforeunload", () => {
  setUserOnlineStatus(false);
});

logoutBtn.addEventListener("click", async () => {
  try {
    await setUserOnlineStatus(false);

    // Modification : arrêt des badges avant la déconnexion.
    stopNotificationBadges();

    await signOut(auth);

    window.location.href = "../Login/login.html";
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Abmeldung fehlgeschlagen. Bitte versuche es erneut."
    );
  }
});

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

/* =========================
   MODIFICATION: fermeture globale avec Escape
   Ferme la photo, le menu, les modals médias/liens/recherche et la modal personnalisée.
========================= */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  closePhotoModalWindow();
  closeChatOptionsMenu();
  closeEmojiPicker();
  closeChatContentModal(mediaFilesModal);
  closeChatContentModal(sharedLinksModal);
  closeChatContentModal(messageSearchModal);
  closeModal();
});

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

  try {
    await setUserOnlineStatus(true);
    renderEmptyChat();
    subscribeToChats();
  } catch (error) {
    console.error(error);

    showModal("error", "Fehler", "Chat konnte nicht initialisiert werden.");
  }
});