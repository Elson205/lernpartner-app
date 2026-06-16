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

let currentUser = null;
let chats = [];
let activeChatId = null;
let activeChat = null;
let activePartner = null;
let attachedFile = null;

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

async function enrichChatsWithPartnerData(chatDocs) {
  const enriched = await Promise.all(
    chatDocs.map(async (chat) => {
      const partner = await getPartnerData(chat);

      return {
        ...chat,
        partner,
      };
    }),
  );

  return enriched.filter((chat) => chat.partner);
}

function renderContacts(list = chats) {
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
      </div>

      <span class="contact-time">${lastMessageTime}</span>
    `;

    const avatar = item.querySelector(".contact-avatar");

    avatar.addEventListener("click", (event) => {
      event.stopPropagation();

      openPhotoModal(
        partner.photoURL || "../user-placeholder.jpg",
        partner.fullname || "Kontakt",
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
      partner.lastSeen,
    )}`;
    activeText.textContent = "Offline";
    activeDot.classList.add("offline");
  }
}

function openPhotoModal(photoURL, name) {
  photoModalImage.src = photoURL || "../user-placeholder.jpg";
  photoModalName.textContent = name || "Profilbild";

  photoModal.classList.add("open");
}

function closePhotoModalWindow() {
  photoModal.classList.remove("open");
}

closePhotoModal.addEventListener("click", closePhotoModalWindow);

photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModalWindow();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModalWindow();
    closeModal();
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
      partner.fullname || "Kontakt",
    );
  };
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

        showModal(
          "success",
          "Gelöscht",
          "Die Nachricht wurde gelöscht."
        );
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
                    ? `<a href="${message.fileURL}" target="_blank" rel="noopener noreferrer">
                         <img src="${message.fileURL}" class="chat-image" alt="${safeFileName}" />
                       </a>`
                    : ""
                }

                ${
                  message.fileURL && !isImage
                    ? `<div class="message-file">
                        <a href="${message.fileURL}" target="_blank" rel="noopener noreferrer">
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
    where("participants", "array-contains", currentUser.uid),
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

      renderContacts();

      // Modification : ouverture automatique du chat reçu dans l'URL.
      if (pendingChatIdFromUrl) {
        const requestedChat = chats.find(
          (chat) => chat.id === pendingChatIdFromUrl,
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
          renderContacts();
        } else {
          renderEmptyChat();
        }
      }
    },
    (error) => {
      console.error(error);
      contactsList.innerHTML =
        '<p class="empty-message contacts-empty">Chats konnten nicht geladen werden.</p>';

      showModal(
        "error",
        "Fehler",
        "Chats konnten nicht geladen werden.",
      );
    },
  );
}

function subscribeToMessages(chatId) {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(80),
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const messages = snapshot.docs.map((messageDocument) => ({
        id: messageDocument.id,
        ...messageDocument.data(),
      }));

      renderMessages(messages);
      await markMessagesAsRead(chatId, snapshot.docs);
    },
    (error) => {
      console.error(error);
      messagesList.innerHTML =
        '<p class="empty-message">Nachrichten konnten nicht geladen werden.</p>';

      showModal(
        "error",
        "Fehler",
        "Nachrichten konnten nicht geladen werden.",
      );
    },
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

  attachedFile = null;
  fileInput.value = "";
  filePreview.textContent = "";

  renderContacts();
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
      "Bitte wähle zuerst einen Chat aus.",
    );
    return;
  }

  // Modification : empêche l'envoi si la collaboration est terminée.
  if (isChatEnded(activeChat)) {
    showModal(
      "info",
      "Lernpartnerschaft beendet",
      "Diese Lernpartnerschaft wurde beendet. Du kannst keine neuen Nachrichten mehr senden.",
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
        "Dateianhänge sind momentan deaktiviert. Firebase Storage ist noch nicht aktiviert.",
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
    { merge: true },
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

    showModal(
      "error",
      "Fehler",
      "Nachricht konnte nicht gesendet werden.",
    );
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

      showModal(
        "error",
        "Fehler",
        "Nachricht konnte nicht gesendet werden."
      );
    }
  }
});

fileInput.addEventListener("change", () => {
  // Modification : remplacement de alert() par showModal().
  if (!STORAGE_ENABLED) {
    showModal(
      "info",
      "Dateianhänge deaktiviert",
      "Dateianhänge sind momentan deaktiviert.",
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

contactSearchInput.addEventListener("input", () => {
  const queryText = contactSearchInput.value.toLowerCase().trim();

  const filteredChats = chats.filter((chat) => {
    const partnerName = chat.partner.fullname || "";
    return partnerName.toLowerCase().includes(queryText);
  });

  renderContacts(filteredChats);
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
      "Abmeldung fehlgeschlagen. Bitte versuche es erneut.",
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

onAuthStateChanged(auth, async (user) => {
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
    await setUserOnlineStatus(true);
    renderEmptyChat();
    subscribeToChats();
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Chat konnte nicht initialisiert werden.",
    );
  }
});