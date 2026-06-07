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

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Desactivation temporaire du stockage.
// Plus tard apres etre passe a Blaze on pourra de nouveau le reativer
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

const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileFaculty = document.getElementById("profileFaculty");
const profileFachbereich = document.getElementById("profileFachbereich");
const profileSemester = document.getElementById("profileSemester");
const profileLastSeen = document.getElementById("profileLastSeen");

const logoutBtn = document.getElementById("logoutBtn");
const partnersBtn = document.getElementById("partnersBtn");
const requestsBtn = document.getElementById("requestsBtn");

const photoModal = document.getElementById("photoModal");
const photoModalImage = document.getElementById("photoModalImage");
const photoModalName = document.getElementById("photoModalName");
const closePhotoModal = document.getElementById("closePhotoModal");

let currentUser = null;
let chats = [];
let activeChatId = null;
let activePartner = null;
let attachedFile = null;

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
  chatPartnerName.textContent = "Chat auswählen";
  chatPartnerStatus.textContent = "-";
  activeText.textContent = "Offline";
  activeDot.classList.add("offline");

  messagesList.innerHTML =
    '<p class="empty-message">Wähle einen Kontakt aus.</p>';

  profilePhoto.src = "user-placeholder.jpg";
  profileName.textContent = "-";
  profileFaculty.textContent = "-";
  profileFachbereich.textContent = "-";
  profileSemester.textContent = "-";
  profileLastSeen.textContent = "-";
}

async function getUserData(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    return {
      id: uid,
      fullname: "Unbekannter Nutzer",
      photoURL: "user-placeholder.jpg",
      faculty: "-",
      fachbereich: "-",
      semester: "-",
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
          src="${escapeHTML(partner.photoURL || "user-placeholder.jpg")}"
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
        partner.photoURL || "user-placeholder.jpg",
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
  photoModalImage.src = photoURL || "user-placeholder.jpg";
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
  }
});

function renderProfilePanel(partner) {
  profilePhoto.src = partner.photoURL || "user-placeholder.jpg";
  profileName.textContent = partner.fullname || "Kontakt";
  profileFaculty.textContent = partner.faculty || "-";
  profileFachbereich.textContent = partner.fachbereich || "-";
  profileSemester.textContent = partner.semester || "-";

  profileLastSeen.textContent = partner.online
    ? "Jetzt online"
    : formatDate(partner.lastSeen);

  profilePhoto.onclick = () => {
    openPhotoModal(
      partner.photoURL || "user-placeholder.jpg",
      partner.fullname || "Kontakt",
    );
  };
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

    const readBy = message.readBy || [];
    const partnerHasRead = activePartner && readBy.includes(activePartner.id);

    const checkMark =
      message.senderId === currentUser.uid ? (partnerHasRead ? "✓✓" : "✓") : "";

    row.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${safeText ? `<div>${safeText}</div>` : ""}

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
        </div>

        <div class="message-time">
          ${formatTime(message.createdAt)} ${checkMark}
        </div>
      </div>
    `;

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
    orderBy("lastMessageAt", "desc"),
  );

  unsubscribeChats = onSnapshot(
    chatsQuery,
    async (snapshot) => {
      const chatDocs = snapshot.docs.map((chatDocument) => ({
        id: chatDocument.id,
        ...chatDocument.data(),
      }));

      chats = await enrichChatsWithPartnerData(chatDocs);

      renderContacts();

      if (!activeChatId && chats.length > 0 && !isMobile()) {
        selectChat(chats[0].id);
      }

      if (activeChatId) {
        const activeChat = chats.find((chat) => chat.id === activeChatId);

        if (activeChat) {
          activePartner = activeChat.partner;
          renderChatHeader(activePartner);
          renderProfilePanel(activePartner);
        }
      }
    },
    (error) => {
      console.error(error);
      contactsList.innerHTML =
        '<p class="empty-message contacts-empty">Chats konnten nicht geladen werden.</p>';
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

  activePartner = chat.partner;

  attachedFile = null;
  fileInput.value = "";
  filePreview.textContent = "";

  renderContacts();
  renderChatHeader(activePartner);
  renderProfilePanel(activePartner);
  subscribeToMessages(chatId);
}

async function uploadAttachedFile(chatId, file) {
  const safeName = `${Date.now()}-${file.name.replaceAll("/", "-")}`;
  const fileRef = ref(storage, `chat-files/${chatId}/${safeName}`);

  await uploadBytes(fileRef, file);

  return getDownloadURL(fileRef);
}

async function sendMessage() {
  if (!activeChatId || !activePartner) {
    alert("Bitte wähle zuerst einen Chat aus.");
    return;
  }

  const text = messageInput.value.trim();

  if (!text && !attachedFile) {
    return;
  }

  let fileURL = "";
  let fileName = "";
  let fileType = "";

  //Modifier cette partie plus tard apres l'ajout du Storage (Supprimer le attachedFile du sessous et ajouter celui en commentaire)

  /*if (attachedFile) {
    const validation = validateFile(attachedFile);

    if (!validation.ok) {
      alert(validation.message);
      return;
    }

    fileURL = await uploadAttachedFile(activeChatId, attachedFile);
    fileName = attachedFile.name;
    fileType = attachedFile.type;
  }*/

  if (attachedFile) {
    if (!STORAGE_ENABLED) {
      alert(
        "Dateianhänge sind momentan deaktiviert. Firebase Storage ist noch nicht aktiviert.",
      );
      return;
    }

    const validation = validateFile(attachedFile);

    if (!validation.ok) {
      alert(validation.message);
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

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await sendMessage();
  } catch (error) {
    console.error(error);
    alert("Nachricht konnte nicht gesendet werden.");
  }
});

fileInput.addEventListener("change", () => {
  // Affichage d'un message d'alerte pour preciser que le Storage n'est pas encore disponible
  if (!STORAGE_ENABLED) {
    alert("Dateianhänge sind momentan deaktiviert.");
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
    alert(validation.message);
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
  await setUserOnlineStatus(false);
  await signOut(auth);
  window.location.href = "../Login/login.html";
});

partnersBtn.addEventListener("click", () => {
  window.location.href = "../Partners/partners.html";
});

requestsBtn.addEventListener("click", () => {
  window.location.href = "../Partners/requests.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;

  try {
    await setUserOnlineStatus(true);
    renderEmptyChat();
    subscribeToChats();
  } catch (error) {
    console.error(error);
    alert("Chat konnte nicht initialisiert werden.");
  }
});
