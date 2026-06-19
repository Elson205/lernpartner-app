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
  arrayRemove,
  deleteField,
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

/* =========================
   MODIFICATION: éléments HTML pour la création des groupes d'étude
   Ces éléments viennent de la nouvelle modal ajoutée dans chat.html.
========================= */
const newGroupBtn = document.getElementById("newGroupBtn");
const groupModal = document.getElementById("groupModal");
const groupModalBackdrop = document.getElementById("groupModalBackdrop");
const closeGroupModalBtn = document.getElementById("closeGroupModalBtn");
const groupForm = document.getElementById("groupForm");
const groupNameInput = document.getElementById("groupNameInput");
const acceptedPartnersList = document.getElementById("acceptedPartnersList");
const groupMembersCounter = document.getElementById("groupMembersCounter");
const createGroupBtn = document.getElementById("createGroupBtn");

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
const profileInfo = document.querySelector(".profile-info");

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
   MODIFICATION: éléments de la modal informations
   Cette modal affiche le profil du contact ou les informations du groupe.
========================= */
const openChatInfoBtn = document.getElementById("openChatInfoBtn");
const chatInfoModal = document.getElementById("chatInfoModal");
const chatInfoBackdrop = document.getElementById("chatInfoBackdrop");
const closeChatInfoModalBtn = document.getElementById(
  "closeChatInfoModalBtn"
);
const chatInfoTitle = document.getElementById("chatInfoTitle");
const chatInfoContent = document.getElementById("chatInfoContent");

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

/* =========================
   MODIFICATION: éléments de la modal profil membre de groupe
   Ces éléments permettent d'afficher le profil détaillé d'un membre d'une Lerngruppe.
========================= */
const groupMemberProfileModal = document.getElementById(
  "groupMemberProfileModal"
);
const groupMemberProfileBackdrop = document.getElementById(
  "groupMemberProfileBackdrop"
);
const closeGroupMemberProfileModalBtn = document.getElementById(
  "closeGroupMemberProfileModalBtn"
);
const groupMemberProfileContent = document.getElementById(
  "groupMemberProfileContent"
);

/* =========================
   MODIFICATION: éléments HTML pour ajouter des membres à un groupe existant
   Ces éléments correspondent à la modal de gestion des participants.
========================= */
const manageGroupMembersModal = document.getElementById(
  "manageGroupMembersModal"
);
const manageGroupMembersBackdrop = document.getElementById(
  "manageGroupMembersBackdrop"
);
const closeManageGroupMembersModalBtn = document.getElementById(
  "closeManageGroupMembersModalBtn"
);
const manageGroupMembersForm = document.getElementById(
  "manageGroupMembersForm"
);
const availableGroupPartnersList = document.getElementById(
  "availableGroupPartnersList"
);
const manageGroupMembersCounter = document.getElementById(
  "manageGroupMembersCounter"
);
const addGroupMembersBtn = document.getElementById("addGroupMembersBtn");

/* =========================
   MODIFICATION: liste des anciens membres retirés du groupe
   Elle permet à un admin de les réintégrer.
========================= */
const removedGroupMembersList = document.getElementById(
  "removedGroupMembersList"
);

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

/* =========================
   MODIFICATION: cache des partenaires acceptés pour créer une Lerngruppe
   Il évite de recharger les mêmes profils tant que la modal reste ouverte.
========================= */
let acceptedPartnersForGroup = [];
let availablePartnersForActiveGroup = [];

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

const DEFAULT_PROFILE_PHOTO = "../user-placeholder.jpg";
const DEFAULT_GROUP_ICON = "👥";

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

/* =========================
   MODIFICATION: un membre retiré est bloqué comme un chat terminé
   Il garde l'accès à l'historique, mais ne peut plus écrire.
========================= */
function isChatEnded(chat) {
  return (
    chat?.active === false ||
    chat?.requestStatus === "ended" ||
    isRemovedFromGroup(chat)
  );
}

/* =========================
   MODIFICATION: helpers pour distinguer chat privé et groupe
   Les anciens chats privés sans champ type restent supportés avec le fallback "private".
========================= */
function getChatType(chat) {
  return chat?.type || "private";
}

function isGroupChat(chat) {
  return getChatType(chat) === "group";
}

/* =========================
   MODIFICATION: vérifier si un utilisateur a été retiré d'une Lerngruppe
   Un membre retiré garde le groupe dans ses contacts, mais ne peut plus participer.
========================= */
function isRemovedFromGroup(chat, userId = currentUser?.uid) {
  if (!isGroupChat(chat) || !userId) {
    return false;
  }

  return Array.isArray(chat.removedMembers)
    ? chat.removedMembers.includes(userId)
    : false;
}

/* =========================
   MODIFICATION: récupérer la date de retrait d'un membre
   Cette date permet de masquer les nouveaux messages pour un membre retiré.
========================= */
function getGroupRemovalDate(chat, userId = currentUser?.uid) {
  if (!chat || !userId) {
    return null;
  }

  return chat.removedMemberDetails?.[userId]?.removedAt || null;
}

/* =========================
   MODIFICATION: récupérer uniquement les membres actifs du groupe
   Les membres retirés ne doivent plus apparaître dans la liste active du groupe.
========================= */
function getActiveGroupParticipantIds(chat) {
  const removedMembers = chat?.removedMembers || [];

  return (chat?.participants || []).filter(
    (participantId) => !removedMembers.includes(participantId)
  );
}

function getChatMembers(chat) {
  return Array.isArray(chat?.members) ? chat.members : [];
}

/* =========================
   MODIFICATION: membres visibles dans le panneau du groupe
   Les membres retirés ne sont plus visibles pour les membres encore actifs.
========================= */
function getVisibleGroupMembers(chat) {
  const removedMembers = chat?.removedMembers || [];

  return getChatMembers(chat).filter(
    (member) => !removedMembers.includes(member.id)
  );
}

function getMemberNameById(chat, uid) {
  const member = getChatMembers(chat).find((user) => user.id === uid);

  return member?.fullname || member?.email || "Kontakt";
}

/* =========================
   MODIFICATION: alias pour afficher le nom d'un membre dans les messages de groupe
   Cette fonction évite l'erreur si renderMessages utilise getMemberName().
========================= */
function getMemberName(chat, uid) {
  return getMemberNameById(chat, uid);
}

function getMemberPhotoById(chat, uid) {
  const member = getChatMembers(chat).find((user) => user.id === uid);

  return member?.photoURL || DEFAULT_PROFILE_PHOTO;
}

// Modification : met à jour le badge de statut dans le profil de droite.
function renderRequestStatus(chat) {
  if (!requestStatus) return;

  requestStatus.classList.remove("confirmed", "ended");

  if (!chat) {
    requestStatus.textContent = "-";
    requestStatus.classList.add("confirmed");
    return;
  }

  if (isGroupChat(chat)) {
    if (isRemovedFromGroup(chat)) {
      requestStatus.textContent = "Aus Lerngruppe entfernt";
      requestStatus.classList.add("ended");
      return;
    }

    requestStatus.textContent = "Lerngruppe aktiv";
    requestStatus.classList.add("confirmed");
    return;
  }

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

  if (endedChatNotice && ended) {
    endedChatNotice.textContent = isRemovedFromGroup(chat)
      ? "Du wurdest aus dieser Lerngruppe entfernt. Du kannst keine neuen Nachrichten senden oder empfangen."
      : "Diese Lernpartnerschaft wurde beendet.";
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
    messageInput.placeholder = isRemovedFromGroup(chat)
      ? "Du wurdest aus dieser Lerngruppe entfernt."
      : "Diese Lernpartnerschaft wurde beendet.";

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

  profilePhoto.src = DEFAULT_PROFILE_PHOTO;
  profileName.textContent = "-";

  if (profileInfo) {
    profileInfo.innerHTML = `
      <p><strong>Fakultät:</strong> <span>-</span></p>
      <p><strong>Fachbereich:</strong> <span>-</span></p>
      <p><strong>Semester:</strong> <span>-</span></p>
      <p><strong>Sprachen:</strong> <span>-</span></p>
      <p><strong>Zuletzt online:</strong> <span>-</span></p>
    `;
  }

  updateChatInfoMenuLabel(null);
  renderRequestStatus(null);
  updateMessageFormState(null);
}

async function getUserData(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    return {
      id: uid,
      fullname: "Unbekannter Nutzer",
      photoURL: DEFAULT_PROFILE_PHOTO,
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
      const recentMessages = await getRecentMessagesForSearch(chat.id);

      /* =========================
         MODIFICATION: les groupes n'ont pas de partner unique
         On charge donc tous les membres et on garde la logique privée pour les anciens chats.
      ========================= */
      if (isGroupChat(chat)) {
        const members = await Promise.all(
          (chat.participants || []).map((memberId) => getUserData(memberId))
        );

        return {
          ...chat,
          members,
          recentMessages,
        };
      }

      const partner = await getPartnerData(chat);

      return {
        ...chat,
        partner,
        recentMessages,
      };
    })
  );

  return enriched.filter((chat) => isGroupChat(chat) || chat.partner);
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
    const unread = chat.unreadCount?.[currentUser.uid] || 0;
    const isGroup = isGroupChat(chat);
    const partner = chat.partner;

    const chatName = isGroup
      ? chat.groupName || "Lerngruppe"
      : partner?.fullname || "Kontakt";

    const avatarURL = isGroup ? "" : partner?.photoURL || DEFAULT_PROFILE_PHOTO;
    const memberCount = isGroup
      ? getActiveGroupParticipantIds(chat).length
      : 0;

    const item = document.createElement("div");

    item.className =
      chat.id === activeChatId ? "contact-item active" : "contact-item";

    const lastMessage = chat.lastMessage || "Noch keine Nachricht";
    const lastMessageTime = formatTime(chat.lastMessageAt);
    const matchingPreview = getMatchingMessagePreview(chat, searchValue);

    item.innerHTML = `
      <div class="contact-avatar-wrapper">
        ${
          isGroup
            ? `<div class="contact-avatar group-avatar" aria-label="Lerngruppe">${DEFAULT_GROUP_ICON}</div>`
            : `<img
                class="contact-avatar"
                src="${escapeHTML(avatarURL)}"
                alt="Profilbild von ${escapeHTML(chatName)}"
              />`
        }

        ${!isGroup && partner?.online ? '<span class="contact-online-dot"></span>' : ""}
      </div>

      <div>
        <h3 class="contact-name">
          ${isGroup ? "👥 " : ""}${escapeHTML(chatName)}
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </h3>

        <p class="contact-preview">${
          isGroup && !chat.lastMessage
            ? `${memberCount} Mitglieder`
            : escapeHTML(lastMessage)
        }</p>

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

    if (!isGroup && avatar) {
      avatar.addEventListener("click", (event) => {
        event.stopPropagation();

        openPhotoModal(
          partner.photoURL || DEFAULT_PROFILE_PHOTO,
          partner.fullname || "Kontakt"
        );
      });
    }

    item.addEventListener("click", () => {
      selectChat(chat.id);
      openMobileChat();
    });

    contactsList.appendChild(item);
  });
}

function renderChatHeader(chat) {
  if (isGroupChat(chat)) {
    const membersCount = getActiveGroupParticipantIds(chat).length;

    chatPartnerName.textContent = chat.groupName || "Lerngruppe";
    chatPartnerStatus.textContent = `${membersCount} Mitglieder`;

    activeText.textContent = "Gruppe";
    activeDot.classList.remove("offline");

    return;
  }

  const partner = chat.partner || activePartner;

  chatPartnerName.textContent = `Chat mit ${partner?.fullname || "Kontakt"}`;

  if (partner?.online) {
    chatPartnerStatus.textContent = "Jetzt online";
    activeText.textContent = "Active";
    activeDot.classList.remove("offline");
  } else {
    chatPartnerStatus.textContent = `Zuletzt online: ${formatDate(
      partner?.lastSeen
    )}`;
    activeText.textContent = "Offline";
    activeDot.classList.add("offline");
  }
}

function openPhotoModal(photoURL, name) {
  photoModalImage.src = photoURL || DEFAULT_PROFILE_PHOTO;
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
  profilePhoto.src = partner.photoURL || DEFAULT_PROFILE_PHOTO;
  profileName.textContent = partner.fullname || "Kontakt";

  if (profileInfo) {
    profileInfo.innerHTML = `
      <p><strong>Fakultät:</strong> <span>${escapeHTML(partner.faculty || "-")}</span></p>

      <p>
        <strong>Fachbereich:</strong>
        <span>${escapeHTML(partner.fachbereich || "-")}</span>
      </p>

      <p><strong>Semester:</strong> <span>${escapeHTML(partner.semester || "-")}</span></p>

      <p>
        <strong>Sprachen:</strong>
        <span>${escapeHTML(partner.languages || partner.nationality || "-")}</span>
      </p>

      <p>
        <strong>Zuletzt online:</strong>
        <span>${escapeHTML(partner.online ? "Jetzt online" : formatDate(partner.lastSeen))}</span>
      </p>
    `;
  }

  profilePhoto.onclick = () => {
    openPhotoModal(
      partner.photoURL || DEFAULT_PROFILE_PHOTO,
      partner.fullname || "Kontakt"
    );
  };
}

/* =========================
   MODIFICATION: préparation des cours d'un membre pour l'affichage du profil
   Les cours actifs sont affichés sous forme de petits badges.
========================= */
function renderMemberCourses(activeCourses = []) {
  if (!Array.isArray(activeCourses) || activeCourses.length === 0) {
    return '<p class="empty-message">Keine Kurse angegeben.</p>';
  }

  return `
    <div class="group-member-courses">
      ${activeCourses
        .map((course) => {
          const courseName =
            typeof course === "string" ? course : course.name || "Kurs";

          return `
            <span class="group-member-course-tag">
              ${escapeHTML(courseName)}
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

/* =========================
   MODIFICATION: vérification de la relation de Lernpartnerschaft
   Seules les demandes pending et les partenariats accepted bloquent une nouvelle demande.
========================= */
async function getPartnerRequestState(memberId) {
  if (!currentUser || !memberId) {
    return null;
  }

  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", currentUser.uid)
  );

  const snapshot = await getDocs(requestsQuery);

  const relatedRequests = snapshot.docs
    .map((requestDocument) => ({
      id: requestDocument.id,
      ...requestDocument.data(),
    }))
    .filter((request) => {
      return (
        request.participants?.includes(memberId) &&
        (request.status === "pending" || request.status === "accepted")
      );
    });

  const acceptedRequest = relatedRequests.find(
    (request) => request.status === "accepted"
  );

  if (acceptedRequest) {
    return acceptedRequest;
  }

  return relatedRequests.find((request) => request.status === "pending") || null;
}

/* =========================
   MODIFICATION: créer une demande de Lernpartnerschaft depuis un groupe
   La demande est créée seulement si aucune demande active n'existe déjà.
========================= */
async function sendPartnerRequestFromGroup(memberId) {
  if (!currentUser || !memberId) {
    return;
  }

  if (memberId === currentUser.uid) {
    showModal(
      "info",
      "Eigener Benutzer",
      "Du kannst dir selbst keine Lernpartner-Anfrage senden."
    );
    return;
  }

  try {
    const existingRequest = await getPartnerRequestState(memberId);

    if (existingRequest?.status === "accepted") {
      showModal(
        "info",
        "Bereits Lernpartner",
        "Ihr seid bereits als Lernpartner verbunden."
      );
      return;
    }

    if (existingRequest?.status === "pending") {
      const message =
        existingRequest.senderId === currentUser.uid
          ? "Du hast dieser Person bereits eine Anfrage gesendet."
          : "Diese Person hat dir bereits eine Anfrage gesendet. Du kannst sie unter Anfragen beantworten.";

      showModal("info", "Anfrage bereits vorhanden", message);
      return;
    }

    await addDoc(collection(db, "partnerRequests"), {
      senderId: currentUser.uid,
      receiverId: memberId,
      participants: [currentUser.uid, memberId],
      status: "pending",
      seenBy: [currentUser.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showModal(
      "success",
      "Anfrage gesendet",
      "Die Lernpartner-Anfrage wurde erfolgreich gesendet."
    );

    closeGroupMemberProfileModal();
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Die Lernpartner-Anfrage konnte nicht gesendet werden."
    );
  }
}

/* =========================
   MODIFICATION: préparer le bouton dans le profil membre
   Le bouton change selon la relation déjà existante.
========================= */
async function renderGroupMemberPartnerAction(memberId) {
  if (memberId === currentUser.uid) {
    return `
      <p class="group-member-partner-note">
        Das ist dein eigenes Profil.
      </p>
    `;
  }

  const existingRequest = await getPartnerRequestState(memberId);

  if (existingRequest?.status === "accepted") {
    return `
      <button
        type="button"
        class="group-member-partner-btn"
        disabled
      >
        Bereits Lernpartner
      </button>
    `;
  }

  if (existingRequest?.status === "pending") {
    const buttonText =
      existingRequest.senderId === currentUser.uid
        ? "Anfrage bereits gesendet"
        : "Anfrage erhalten";

    return `
      <button
        type="button"
        class="group-member-partner-btn"
        disabled
      >
        ${buttonText}
      </button>
    `;
  }

  return `
    <button
      type="button"
      id="sendPartnerRequestFromGroupBtn"
      class="group-member-partner-btn"
      data-member-id="${escapeHTML(memberId)}"
    >
      Als Lernpartner hinzufügen
    </button>
  `;
}

/* =========================
   MODIFICATION: ouvrir la modal du profil d'un membre du groupe
   Cette modal affiche les informations du membre sans quitter la page Chat.
========================= */
/* =========================
   MODIFICATION: modal profil membre avec bouton de demande de partenariat
   Elle affiche le profil puis permet d'envoyer une demande si aucune relation active n'existe.
========================= */
async function openGroupMemberProfileModal(memberId) {
  if (!groupMemberProfileModal || !groupMemberProfileContent) {
    return;
  }

  const member = getChatMembers(activeChat).find(
    (user) => user.id === memberId
  );

  if (!member) {
    showModal(
      "error",
      "Profil nicht gefunden",
      "Das Profil dieses Mitglieds konnte nicht geladen werden."
    );
    return;
  }

  groupMemberProfileContent.innerHTML =
    '<p class="empty-message">Profil wird geladen...</p>';

  groupMemberProfileModal.classList.remove("hidden");

  try {
    const memberName = member.fullname || "Mitglied";
    const memberEmail = member.email || "-";
    const memberPhoto = member.photoURL || DEFAULT_PROFILE_PHOTO;
    const memberLanguages = member.languages || member.nationality || "-";
    const memberAbout = member.aboutText || "-";

    const memberCoursesHTML = renderMemberCourses(member.activeCourses || []);

    const partnerActionHTML = await renderGroupMemberPartnerAction(memberId);

    groupMemberProfileContent.innerHTML = `
      <div class="group-member-profile-header">
        <img
          src="${escapeHTML(memberPhoto)}"
          alt="Profilbild von ${escapeHTML(memberName)}"
          class="group-member-profile-photo"
        />

        <div class="group-member-profile-title">
          <h3>${escapeHTML(memberName)}</h3>
          <p>${escapeHTML(memberEmail)}</p>
        </div>
      </div>

      <div class="group-member-profile-info">
        <p>
          <strong>Fakultät:</strong>
          <span>${escapeHTML(member.faculty || "-")}</span>
        </p>

        <p>
          <strong>Fachbereich:</strong>
          <span>${escapeHTML(member.fachbereich || "-")}</span>
        </p>

        <p>
          <strong>Semester:</strong>
          <span>${escapeHTML(member.semester || "-")}</span>
        </p>

        <p>
          <strong>Sprachen:</strong>
          <span>${escapeHTML(memberLanguages)}</span>
        </p>

        <p>
          <strong>Über mich:</strong>
          <span>${escapeHTML(memberAbout)}</span>
        </p>

        <div>
          <strong>Kurse:</strong>
          ${memberCoursesHTML}
        </div>
      </div>

      <div class="group-member-actions">
        ${partnerActionHTML}
      </div>
    `;

    const sendPartnerRequestBtn = document.getElementById(
      "sendPartnerRequestFromGroupBtn"
    );

    if (sendPartnerRequestBtn) {
      sendPartnerRequestBtn.addEventListener("click", async () => {
        sendPartnerRequestBtn.disabled = true;
        sendPartnerRequestBtn.textContent = "Anfrage wird gesendet...";

        await sendPartnerRequestFromGroup(
          sendPartnerRequestBtn.dataset.memberId
        );
      });
    }
  } catch (error) {
    console.error(error);

    groupMemberProfileContent.innerHTML =
      '<p class="empty-message">Profil konnte nicht geladen werden.</p>';

    showModal(
      "error",
      "Fehler",
      "Das Profil dieses Mitglieds konnte nicht geladen werden."
    );
  }
}

/* =========================
   MODIFICATION: fermer la modal du profil d'un membre de groupe
========================= */
function closeGroupMemberProfileModal() {
  if (!groupMemberProfileModal) return;

  groupMemberProfileModal.classList.add("hidden");

  if (groupMemberProfileContent) {
    groupMemberProfileContent.innerHTML =
      '<p class="empty-message">Profil wird geladen...</p>';
  }
}

/* =========================
   MODIFICATION: vérifie si l'utilisateur actuel est admin du groupe
   Le créateur reste aussi admin grâce au fallback createdBy.
========================= */
function isCurrentUserGroupAdmin(chat = activeChat) {
  if (!currentUser || !isGroupChat(chat)) {
    return false;
  }

  return (
    chat.admins?.includes(currentUser.uid) ||
    chat.createdBy === currentUser.uid
  );
}

/* =========================
   MODIFICATION: fermer la modal de gestion des membres
========================= */
function closeManageGroupMembersModal() {
  if (!manageGroupMembersModal) {
    return;
  }

  manageGroupMembersModal.classList.add("hidden");

  if (manageGroupMembersForm) {
    manageGroupMembersForm.reset();
  }

  availablePartnersForActiveGroup = [];

  if (availableGroupPartnersList) {
    availableGroupPartnersList.innerHTML =
      '<p class="empty-message">Partner werden geladen...</p>';
  }

  /* =========================
    MODIFICATION: réinitialiser la section des membres retirés
  ========================= */
  if (removedGroupMembersList) {
    removedGroupMembersList.innerHTML =
      '<p class="empty-message">Keine entfernten Mitglieder.</p>';
  }

  updateManageGroupMembersCounter();
}

/* =========================
   MODIFICATION: récupérer les partenaires acceptés non présents dans le groupe
   Un admin ne peut ajouter que ses propres Lernpartner acceptés.
========================= */
async function loadAvailablePartnersForActiveGroup() {
  if (!currentUser || !activeChat || !isGroupChat(activeChat)) {
    return;
  }

  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", currentUser.uid)
  );

  const snapshot = await getDocs(requestsQuery);

  const existingParticipantIds = new Set(activeChat.participants || []);

  const availablePartnerIds = [
    ...new Set(
      snapshot.docs
        .map((requestDocument) => requestDocument.data())
        .filter((request) => request.status === "accepted")
        .map((request) =>
          request.participants?.find(
            (participantId) => participantId !== currentUser.uid
          )
        )
        .filter(
          (partnerId) =>
            partnerId &&
            partnerId !== currentUser.uid &&
            !existingParticipantIds.has(partnerId)
        )
    ),
  ];

  availablePartnersForActiveGroup = await Promise.all(
    availablePartnerIds.map((partnerId) => getUserData(partnerId))
  );

  renderAvailablePartnersForActiveGroup();
}

/* =========================
   MODIFICATION: afficher les partenaires qui peuvent être ajoutés
   Les membres déjà présents dans le groupe ne sont jamais affichés.
========================= */
function renderAvailablePartnersForActiveGroup() {
  if (!availableGroupPartnersList) {
    return;
  }

  if (availablePartnersForActiveGroup.length === 0) {
    availableGroupPartnersList.innerHTML = `
      <p class="empty-message">
        Keine weiteren akzeptierten Lernpartner verfügbar.
      </p>
    `;

    updateManageGroupMembersCounter();
    return;
  }

  availableGroupPartnersList.innerHTML = availablePartnersForActiveGroup
    .map(
      (partner) => `
        <label class="accepted-partner-option">
          <input
            type="checkbox"
            class="add-group-member-checkbox"
            value="${escapeHTML(partner.id)}"
          />

          <img
            src="${escapeHTML(
              partner.photoURL || DEFAULT_PROFILE_PHOTO
            )}"
            alt="Profilbild von ${escapeHTML(partner.fullname || "Partner")}"
          />

          <div>
            <p class="accepted-partner-name">
              ${escapeHTML(partner.fullname || "Unbekannter Nutzer")}
            </p>

            <p class="accepted-partner-meta">
              ${escapeHTML(
                partner.fachbereich ||
                  partner.faculty ||
                  partner.email ||
                  "-"
              )}
            </p>
          </div>
        </label>
      `
    )
    .join("");

  const checkboxes = availableGroupPartnersList.querySelectorAll(
    ".add-group-member-checkbox"
  );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateManageGroupMembersCounter);
  });

  updateManageGroupMembersCounter();
}

/* =========================
   MODIFICATION: récupérer les nouveaux membres sélectionnés
========================= */
function getSelectedNewGroupMemberIds() {
  if (!availableGroupPartnersList) {
    return [];
  }

  return Array.from(
    availableGroupPartnersList.querySelectorAll(
      ".add-group-member-checkbox:checked"
    )
  ).map((checkbox) => checkbox.value);
}

/* =========================
   MODIFICATION: compteur de sélection dans la modal admin
========================= */
function updateManageGroupMembersCounter() {
  if (!manageGroupMembersCounter) {
    return;
  }

  const selectedCount = getSelectedNewGroupMemberIds().length;

  manageGroupMembersCounter.textContent =
    selectedCount === 0
      ? "0 ausgewählt"
      : `${selectedCount} ausgewählt`;
}

/* =========================
   MODIFICATION: charger les membres retirés du groupe actif
   Les identifiants sont conservés dans participants mais marqués dans removedMembers.
========================= */
async function loadRemovedMembersForActiveGroup() {
  if (!activeChat || !isGroupChat(activeChat) || !removedGroupMembersList) {
    return;
  }

  const removedMemberIds = activeChat.removedMembers || [];

  if (removedMemberIds.length === 0) {
    removedGroupMembersList.innerHTML =
      '<p class="empty-message">Keine entfernten Mitglieder.</p>';
    return;
  }

  const removedMembers = await Promise.all(
    removedMemberIds.map((memberId) => getUserData(memberId))
  );

  renderRemovedMembersForActiveGroup(removedMembers);
}

/* =========================
   MODIFICATION: afficher les membres retirés avec un bouton de réintégration
========================= */
function renderRemovedMembersForActiveGroup(removedMembers = []) {
  if (!removedGroupMembersList) {
    return;
  }

  if (removedMembers.length === 0) {
    removedGroupMembersList.innerHTML =
      '<p class="empty-message">Keine entfernten Mitglieder.</p>';
    return;
  }

  removedGroupMembersList.innerHTML = removedMembers
    .map(
      (member) => `
        <div class="removed-member-option">
          <img
            src="${escapeHTML(member.photoURL || DEFAULT_PROFILE_PHOTO)}"
            alt="Profilbild von ${escapeHTML(member.fullname || "Mitglied")}"
          />

          <div class="removed-member-info">
            <p class="removed-member-name">
              ${escapeHTML(member.fullname || member.email || "Mitglied")}
            </p>

            <p class="removed-member-meta">
              ${escapeHTML(
                member.fachbereich ||
                  member.faculty ||
                  member.email ||
                  "-"
              )}
            </p>
          </div>

          <button
            type="button"
            class="restore-group-member-btn"
            data-member-id="${escapeHTML(member.id)}"
          >
            Wieder hinzufügen
          </button>
        </div>
      `
    )
    .join("");

  const restoreButtons = removedGroupMembersList.querySelectorAll(
    ".restore-group-member-btn"
  );

  restoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
      restoreMemberToGroup(button.dataset.memberId);
    });
  });
}

/* =========================
   MODIFICATION: réintégrer un membre retiré
   Il redevient actif, retrouve le droit d'écrire et reçoit les futurs messages.
========================= */
async function restoreMemberToGroup(memberId) {
  if (!activeChatId || !activeChat || !isGroupChat(activeChat)) {
    return;
  }

  if (!isCurrentUserGroupAdmin()) {
    showModal(
      "warning",
      "Keine Berechtigung",
      "Nur Admins können entfernte Mitglieder wieder hinzufügen."
    );
    return;
  }

  const member = getChatMembers(activeChat).find(
    (user) => user.id === memberId
  );

  const memberName = member?.fullname || "dieses Mitglied";

  showModal(
    "warning",
    "Mitglied wieder hinzufügen",
    `Möchtest du ${memberName} wieder zur Lerngruppe hinzufügen?`,
    async () => {
      try {
        await updateDoc(doc(db, "chats", activeChatId), {
          removedMembers: arrayRemove(memberId),

          [`removedMemberDetails.${memberId}`]: deleteField(),

          [`unreadCount.${memberId}`]: 0,

          updatedAt: serverTimestamp(),
        });

        showModal(
          "success",
          "Mitglied wieder hinzugefügt",
          `${memberName} ist wieder ein aktives Mitglied der Lerngruppe.`
        );

        await loadRemovedMembersForActiveGroup();
      } catch (error) {
        console.error(error);

        showModal(
          "error",
          "Fehler",
          "Das Mitglied konnte nicht wieder hinzugefügt werden."
        );
      }
    }
  );
}

/* =========================
   MODIFICATION: ouvrir la modal réservée aux admins
========================= */
async function openManageGroupMembersModal() {
  if (!activeChat || !isGroupChat(activeChat)) {
    return;
  }

  if (!isCurrentUserGroupAdmin()) {
    showModal(
      "warning",
      "Keine Berechtigung",
      "Nur Admins können neue Mitglieder zur Lerngruppe hinzufügen."
    );
    return;
  }

  if (!manageGroupMembersModal || !availableGroupPartnersList) {
    return;
  }

  availableGroupPartnersList.innerHTML =
    '<p class="empty-message">Partner werden geladen...</p>';

  updateManageGroupMembersCounter();

  manageGroupMembersModal.classList.remove("hidden");

  try {
    /* =========================
      MODIFICATION: charger simultanément les partenaires disponibles
      et les membres retirés pouvant être réintégrés.
    ========================= */
    await Promise.all([
      loadAvailablePartnersForActiveGroup(),
      loadRemovedMembersForActiveGroup(),
    ]);
  } catch (error) {
    console.error(error);

    availableGroupPartnersList.innerHTML =
      '<p class="empty-message">Partner konnten nicht geladen werden.</p>';

    showModal(
      "error",
      "Fehler",
      "Die verfügbaren Lernpartner konnten nicht geladen werden."
    );
  }
}

/* =========================
   MODIFICATION: ajouter les participants sélectionnés dans Firestore
   participants et unreadCount sont mis à jour en une seule opération.
========================= */
async function addSelectedMembersToGroup() {
  if (!activeChatId || !activeChat || !isGroupChat(activeChat)) {
    return;
  }

  if (!isCurrentUserGroupAdmin()) {
    showModal(
      "warning",
      "Keine Berechtigung",
      "Nur Admins können neue Mitglieder hinzufügen."
    );
    return;
  }

  const selectedMemberIds = getSelectedNewGroupMemberIds();

  if (selectedMemberIds.length === 0) {
    showModal(
      "warning",
      "Keine Teilnehmer ausgewählt",
      "Bitte wähle mindestens einen Lernpartner aus."
    );
    return;
  }

  const updates = {
    participants: arrayUnion(...selectedMemberIds),
    updatedAt: serverTimestamp(),
  };

  selectedMemberIds.forEach((memberId) => {
    updates[`unreadCount.${memberId}`] = 0;
  });

  if (addGroupMembersBtn) {
    addGroupMembersBtn.disabled = true;
    addGroupMembersBtn.textContent = "Mitglieder werden hinzugefügt...";
  }

  try {
    await updateDoc(doc(db, "chats", activeChatId), updates);

    closeManageGroupMembersModal();

    showModal(
      "success",
      "Mitglieder hinzugefügt",
      "Die ausgewählten Lernpartner wurden zur Lerngruppe hinzugefügt."
    );
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Die neuen Mitglieder konnten nicht hinzugefügt werden."
    );
  } finally {
    if (addGroupMembersBtn) {
      addGroupMembersBtn.disabled = false;
      addGroupMembersBtn.textContent = "Mitglieder hinzufügen";
    }
  }
}

/* =========================
   MODIFICATION: retirer un membre sans supprimer le groupe de ses contacts
   Le membre reste dans participants afin de voir le groupe, mais il est marqué comme retiré.
========================= */
async function removeMemberFromGroup(memberId) {
  if (!currentUser || !activeChatId || !activeChat || !isGroupChat(activeChat)) {
    return;
  }

  if (!isCurrentUserGroupAdmin()) {
    showModal(
      "warning",
      "Keine Berechtigung",
      "Nur Admins können Mitglieder aus der Lerngruppe entfernen."
    );
    return;
  }

  if (memberId === currentUser.uid) {
    showModal(
      "info",
      "Eigenes Profil",
      "Du kannst dich nicht über diesen Button entfernen. Dafür wird später die Funktion „Gruppe verlassen“ verwendet."
    );
    return;
  }

  const member = getChatMembers(activeChat).find(
    (user) => user.id === memberId
  );

  const memberName = member?.fullname || "dieses Mitglied";

  showModal(
    "warning",
    "Mitglied entfernen",
    `Möchtest du ${memberName} wirklich aus der Lerngruppe entfernen?`,
    async () => {
      try {
        await updateDoc(doc(db, "chats", activeChatId), {
          removedMembers: arrayUnion(memberId),

          [`removedMemberDetails.${memberId}`]: {
            removedAt: new Date(),
            removedBy: currentUser.uid,
          },

          admins: arrayRemove(memberId),

          [`unreadCount.${memberId}`]: 0,

          updatedAt: serverTimestamp(),
        });

        showModal(
          "success",
          "Mitglied entfernt",
          `${memberName} wurde aus der Lerngruppe entfernt. Die Person sieht den Chat weiterhin, kann aber keine Nachrichten mehr senden oder empfangen.`
        );
      } catch (error) {
        console.error(error);

        showModal(
          "error",
          "Fehler",
          "Das Mitglied konnte nicht aus der Lerngruppe entfernt werden."
        );
      }
    }
  );
}

/* =========================
   MODIFICATION: panneau groupe avec boutons admin
   Les admins peuvent ajouter ou retirer des membres.
========================= */
/* =========================
   MODIFICATION: panneau groupe avec membres actifs uniquement
   Un membre retiré ne voit plus la liste des participants.
   Les membres actifs ne voient plus les utilisateurs retirés.
========================= */
function renderGroupPanel(chat) {
  const userWasRemoved = isRemovedFromGroup(chat);

  profilePhoto.src = DEFAULT_PROFILE_PHOTO;
  profileName.textContent = chat.groupName || "Lerngruppe";

  /* =========================
     MODIFICATION: affichage spécial pour l'utilisateur retiré
     Il garde le groupe dans ses contacts mais ne voit plus les membres actifs.
  ========================= */
  if (userWasRemoved) {
    if (profileInfo) {
      profileInfo.innerHTML = `
        <p><strong>Typ:</strong> <span>Lerngruppe</span></p>

        <p>
          <strong>Status:</strong>
          <span>Aus Lerngruppe entfernt</span>
        </p>

        <p class="empty-message">
          Du wurdest aus dieser Lerngruppe entfernt.
          Du kannst keine neuen Nachrichten senden oder empfangen.
        </p>
      `;
    }

    profilePhoto.onclick = null;
    return;
  }

  const members = getVisibleGroupMembers(chat);
  const currentUserIsAdmin = isCurrentUserGroupAdmin(chat);

  const membersHTML =
    members.length > 0
      ? members
          .map((member) => {
            const isMemberAdmin = chat.admins?.includes(member.id);

            const canRemoveMember =
              currentUserIsAdmin &&
              member.id !== currentUser.uid;

            return `
              <div class="group-member-item">
                <div class="group-member-main">
                  <img
                    src="${escapeHTML(
                      member.photoURL || DEFAULT_PROFILE_PHOTO
                    )}"
                    alt="Profilbild von ${escapeHTML(
                      member.fullname || "Mitglied"
                    )}"
                  />

                  <span>
                    ${escapeHTML(member.fullname || member.email || "Mitglied")}
                    ${isMemberAdmin ? "<strong> · Admin</strong>" : ""}
                  </span>
                </div>

                <div class="group-member-buttons">
                  <button
                    type="button"
                    class="group-member-profile-btn"
                    data-member-id="${escapeHTML(member.id)}"
                  >
                    Profil ansehen
                  </button>

                  ${
                    canRemoveMember
                      ? `
                        <button
                          type="button"
                          class="remove-group-member-btn"
                          data-member-id="${escapeHTML(member.id)}"
                        >
                          Entfernen
                        </button>
                      `
                      : ""
                  }
                </div>
              </div>
            `;
          })
          .join("")
      : '<p class="empty-message">Keine aktiven Mitglieder gefunden.</p>';

  const adminActionsHTML = currentUserIsAdmin
    ? `
      <div class="group-management-actions">
        <button
          type="button"
          id="manageGroupMembersBtn"
          class="manage-group-members-btn"
        >
          Mitglieder verwalten
        </button>
      </div>
    `
    : "";

  if (profileInfo) {
    profileInfo.innerHTML = `
      <p><strong>Typ:</strong> <span>Lerngruppe</span></p>
      <p><strong>Mitglieder:</strong> <span>${members.length}</span></p>
      <p><strong>Status:</strong> <span>Aktiv</span></p>

      <div class="group-member-list">
        ${membersHTML}
      </div>

      ${adminActionsHTML}
    `;
  }

  const profileButtons = profileInfo?.querySelectorAll(
    ".group-member-profile-btn"
  );

  profileButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      openGroupMemberProfileModal(button.dataset.memberId);
    });
  });

  const removeButtons = profileInfo?.querySelectorAll(
    ".remove-group-member-btn"
  );

  removeButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      removeMemberFromGroup(button.dataset.memberId);
    });
  });

  const manageGroupMembersBtn = document.getElementById(
    "manageGroupMembersBtn"
  );

  if (manageGroupMembersBtn) {
    manageGroupMembersBtn.addEventListener(
      "click",
      openManageGroupMembersModal
    );
  }

  profilePhoto.onclick = null;
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
   MODIFICATION: texte dynamique dans le menu trois points
   Le bouton affiche une information différente pour un chat privé ou un groupe.
========================= */
function updateChatInfoMenuLabel(chat = activeChat) {
  if (!openChatInfoBtn) {
    return;
  }

  if (!chat) {
    openChatInfoBtn.textContent = "Kontaktinformationen";
    openChatInfoBtn.disabled = true;
    return;
  }

  openChatInfoBtn.disabled = false;

  openChatInfoBtn.textContent = isGroupChat(chat)
    ? "Gruppeninformationen"
    : "Kontaktinformationen";
}

/* =========================
   MODIFICATION: fermer la modal des informations
========================= */
function closeChatInfoModal() {
  if (!chatInfoModal) {
    return;
  }

  chatInfoModal.classList.add("hidden");

  if (chatInfoContent) {
    chatInfoContent.innerHTML =
      '<p class="empty-message">Informationen werden geladen...</p>';
  }
}

/* =========================
   MODIFICATION: ouvrir les informations d'un chat privé
========================= */
function renderPrivateChatInfo(partner) {
  if (!chatInfoContent || !partner) {
    return;
  }

  const partnerName = partner.fullname || "Kontakt";
  const partnerPhoto = partner.photoURL || DEFAULT_PROFILE_PHOTO;
  const partnerLanguages = partner.languages || partner.nationality || "-";

  chatInfoContent.innerHTML = `
    <div class="chat-info-profile-header">
      <img
        src="${escapeHTML(partnerPhoto)}"
        alt="Profilbild von ${escapeHTML(partnerName)}"
        class="chat-info-profile-photo"
      />

      <div>
        <h3>${escapeHTML(partnerName)}</h3>
        <p>${escapeHTML(partner.email || "-")}</p>
      </div>
    </div>

    <div class="chat-info-details">
      <p><strong>Fakultät:</strong> ${escapeHTML(partner.faculty || "-")}</p>
      <p><strong>Fachbereich:</strong> ${escapeHTML(partner.fachbereich || "-")}</p>
      <p><strong>Semester:</strong> ${escapeHTML(partner.semester || "-")}</p>
      <p><strong>Sprachen:</strong> ${escapeHTML(partnerLanguages)}</p>
      <p><strong>Zuletzt online:</strong> ${escapeHTML(
        partner.online ? "Jetzt online" : formatDate(partner.lastSeen)
      )}</p>
    </div>
  `;
}

/* =========================
   MODIFICATION: ouvrir les informations d'un groupe
   Les membres actifs voient les membres du groupe et les admins peuvent le gérer.
========================= */
function renderGroupChatInfo(chat) {
  if (!chatInfoContent) {
    return;
  }

  if (isRemovedFromGroup(chat)) {
    chatInfoContent.innerHTML = `
      <div class="chat-info-removed-message">
        <h3>Aus Lerngruppe entfernt</h3>
        <p>
          Du wurdest aus dieser Lerngruppe entfernt.
          Du kannst keine neuen Nachrichten senden oder empfangen.
        </p>
      </div>
    `;

    return;
  }

  const members = getVisibleGroupMembers(chat);
  const currentUserIsAdmin = isCurrentUserGroupAdmin(chat);

  const membersHTML =
    members.length > 0
      ? members
          .map((member) => {
            const memberName = member.fullname || member.email || "Mitglied";

            return `
              <div class="chat-info-member-item">
                <div class="chat-info-member-main">
                  <img
                    src="${escapeHTML(member.photoURL || DEFAULT_PROFILE_PHOTO)}"
                    alt="Profilbild von ${escapeHTML(memberName)}"
                  />

                  <div>
                    <strong>${escapeHTML(memberName)}</strong>
                    ${
                      chat.admins?.includes(member.id)
                        ? "<span>Admin</span>"
                        : ""
                    }
                  </div>
                </div>

                <button
                  type="button"
                  class="chat-info-member-profile-btn"
                  data-member-id="${escapeHTML(member.id)}"
                >
                  Profil ansehen
                </button>
              </div>
            `;
          })
          .join("")
      : '<p class="empty-message">Keine aktiven Mitglieder gefunden.</p>';

  const adminActionsHTML = currentUserIsAdmin
    ? `
      <button
        type="button"
        id="openGroupManagementFromInfoBtn"
        class="chat-info-group-management-btn"
      >
        Mitglieder verwalten
      </button>
    `
    : "";

  chatInfoContent.innerHTML = `
    <div class="chat-info-group-summary">
      <h3>${escapeHTML(chat.groupName || "Lerngruppe")}</h3>
      <p>${members.length} Mitglieder</p>
    </div>

    <div class="chat-info-members-list">
      ${membersHTML}
    </div>

    ${adminActionsHTML}
  `;

  const memberProfileButtons = chatInfoContent.querySelectorAll(
    ".chat-info-member-profile-btn"
  );

  memberProfileButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeChatInfoModal();
      openGroupMemberProfileModal(button.dataset.memberId);
    });
  });

  const groupManagementBtn = document.getElementById(
    "openGroupManagementFromInfoBtn"
  );

  if (groupManagementBtn) {
    groupManagementBtn.addEventListener("click", () => {
      closeChatInfoModal();
      openManageGroupMembersModal();
    });
  }
}

/* =========================
   MODIFICATION: ouvrir les informations selon le type de conversation
========================= */
function openChatInfo() {
  closeChatOptionsMenu();

  if (!ensureActiveChatSelected() || !activeChat || !chatInfoModal) {
    return;
  }

  chatInfoModal.classList.remove("hidden");

  if (isGroupChat(activeChat)) {
    if (chatInfoTitle) {
      chatInfoTitle.textContent = "Gruppeninformationen";
    }

    renderGroupChatInfo(activeChat);
    return;
  }

  if (chatInfoTitle) {
    chatInfoTitle.textContent = "Kontaktinformationen";
  }

  renderPrivateChatInfo(activePartner);
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

  return safeText.replace(regex, '<span class="search-highlight">$1</span>');
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
    .map((message) => {
      const senderName =
        message.senderId === currentUser.uid
          ? "Du"
          : isGroupChat(activeChat)
            ? getMemberNameById(activeChat, message.senderId)
            : activePartner?.fullname || "Kontakt";

      return `
        <div class="search-result-item">
          <p class="search-result-text">
            ${highlightSearchTerm(message.text || "", searchValue)}
          </p>

          <div class="search-result-meta">
            ${escapeHTML(senderName)}
            · ${formatDate(message.createdAt)}
          </div>
        </div>
      `;
    })
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
   MODIFICATION: événements de la modal de gestion des participants
========================= */
if (closeManageGroupMembersModalBtn) {
  closeManageGroupMembersModalBtn.addEventListener(
    "click",
    closeManageGroupMembersModal
  );
}

if (manageGroupMembersBackdrop) {
  manageGroupMembersBackdrop.addEventListener(
    "click",
    closeManageGroupMembersModal
  );
}

if (manageGroupMembersForm) {
  manageGroupMembersForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await addSelectedMembersToGroup();
  });
}

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

/* =========================
   MODIFICATION: événements de la modal informations
========================= */
if (openChatInfoBtn) {
  openChatInfoBtn.addEventListener("click", openChatInfo);
}

if (closeChatInfoModalBtn) {
  closeChatInfoModalBtn.addEventListener("click", closeChatInfoModal);
}

if (chatInfoBackdrop) {
  chatInfoBackdrop.addEventListener("click", closeChatInfoModal);
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
   MODIFICATION: événements de fermeture de la modal profil membre de groupe
========================= */
if (closeGroupMemberProfileModalBtn) {
  closeGroupMemberProfileModalBtn.addEventListener(
    "click",
    closeGroupMemberProfileModal
  );
}

if (groupMemberProfileBackdrop) {
  groupMemberProfileBackdrop.addEventListener(
    "click",
    closeGroupMemberProfileModal
  );
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
    /* =========================
      MODIFICATION: les membres retirés ne comptent plus pour les coches de lecture
    ========================= */
    const otherParticipantIds = isGroupChat(activeChat)
      ? getActiveGroupParticipantIds(activeChat).filter(
          (participantId) => participantId !== currentUser.uid
        )
      : (activeChat?.participants || []).filter(
          (participantId) => participantId !== currentUser.uid
        );

    const allOtherParticipantsHaveRead = otherParticipantIds.every(
      (participantId) => readBy.includes(participantId)
    );

    const checkMark =
      message.senderId === currentUser.uid
        ? allOtherParticipantsHaveRead
          ? "✓✓"
          : "✓"
        : "";

    const senderNameHtml =
      isGroupChat(activeChat) && message.senderId !== currentUser.uid && !isDeleted
        ? `<div class="message-sender-name">${escapeHTML(
            getMemberName(activeChat, message.senderId)
          )}</div>`
        : "";

    row.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${senderNameHtml}
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
          activePartner = updatedActiveChat.partner || null;

          renderChatHeader(activeChat);


          updateChatInfoMenuLabel(activeChat);

          if (isGroupChat(activeChat)) {
            renderGroupPanel(activeChat);
          } else {
            renderProfilePanel(activePartner);
          }

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
            /* =========================
              MODIFICATION: un membre retiré voit uniquement l'historique avant son retrait
              Les messages publiés après son retrait ne sont ni affichés ni marqués comme lus.
            ========================= */
            const removalDate = getGroupRemovalDate(activeChat);

            const visibleMessages =
              isRemovedFromGroup(activeChat) && removalDate
                ? messages.filter((message) => {
                    if (!message.createdAt) {
                      return false;
                    }

                    const messageDate = message.createdAt.toDate
                      ? message.createdAt.toDate()
                      : new Date(message.createdAt);

                    const removedAtDate = removalDate.toDate
                      ? removalDate.toDate()
                      : new Date(removalDate);

                    return messageDate <= removedAtDate;
                  })
                : messages;

            activeMessages = visibleMessages;

            renderMessages(visibleMessages);

            if (!isRemovedFromGroup(activeChat)) {
              await markMessagesAsRead(chatId, snapshot.docs);
            }

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
  activePartner = chat.partner || null;
  activeMessages = [];

  attachedFile = null;
  fileInput.value = "";
  filePreview.textContent = "";

  closeChatOptionsMenu();
  closeChatContentModal(mediaFilesModal);
  closeChatContentModal(sharedLinksModal);
  closeChatContentModal(messageSearchModal);

  renderContacts(chats, contactSearchInput.value);
  renderChatHeader(activeChat);
  updateChatInfoMenuLabel(activeChat);
  /* =========================
    MODIFICATION: panneau de droite différent pour groupe et chat privé
    Un groupe affiche ses membres, un chat privé affiche le profil du partenaire.
  ========================= */
  if (isGroupChat(activeChat)) {
    renderGroupPanel(activeChat);
  } else {
    renderProfilePanel(activePartner);
  }

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
  if (!activeChatId || !activeChat) {
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
      isRemovedFromGroup(activeChat)
        ? "Aus Lerngruppe entfernt"
        : "Lernpartnerschaft beendet",
      isRemovedFromGroup(activeChat)
        ? "Du wurdest aus dieser Lerngruppe entfernt und kannst keine neuen Nachrichten senden."
        : isGroupChat(activeChat)
          ? "Diese Lerngruppe wurde beendet. Du kannst keine neuen Nachrichten mehr senden."
          : "Diese Lernpartnerschaft wurde beendet. Du kannst keine neuen Nachrichten mehr senden."
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

  /* =========================
     MODIFICATION: unreadCount compatible avec les chats privés et les groupes
     Pour un groupe, tous les autres membres reçoivent +1. Pour un chat privé, cela revient au partenaire.
  ========================= */
  const unreadUpdates = {};

  /* =========================
    MODIFICATION: seuls les membres actifs reçoivent les nouveaux messages
    Les membres retirés ne reçoivent plus de notification ni de nouveau message.
  ========================= */
  getActiveGroupParticipantIds(activeChat).forEach((participantId) => {
    if (participantId !== currentUser.uid) {
      unreadUpdates[`unreadCount.${participantId}`] = increment(1);
    }
  });

  await updateDoc(doc(db, "chats", activeChatId), {
    lastMessage: text || `Datei: ${fileName}`,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...unreadUpdates,
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
    const chatName = isGroupChat(chat)
      ? chat.groupName || "Lerngruppe"
      : chat.partner?.fullname || "";

    const nameMatch = normalizeText(chatName).includes(normalizedQuery);

    const memberMatch = isGroupChat(chat)
      ? getChatMembers(chat).some((member) =>
          normalizeText(member.fullname || "").includes(normalizedQuery)
        )
      : false;

    const messageMatch = (chat.recentMessages || []).some((message) => {
      if (message.deleted) return false;

      return normalizeText(message.text || "").includes(normalizedQuery);
    });

    return nameMatch || memberMatch || messageMatch;
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
   MODIFICATION: ouvrir la modal de création de Lerngruppe
   Le bouton 👥 charge les partenaires acceptés puis affiche la modal.
========================= */
async function openGroupModal() {
  if (!groupModal) return;

  groupNameInput.value = "";

  acceptedPartnersList.innerHTML =
    '<p class="empty-message">Partner werden geladen...</p>';

  updateSelectedGroupMembersCounter();

  groupModal.classList.remove("hidden");

  try {
    await loadAcceptedPartnersForGroup();
  } catch (error) {
    console.error(error);

    acceptedPartnersList.innerHTML =
      '<p class="empty-message">Partner konnten nicht geladen werden.</p>';

    showModal(
      "error",
      "Fehler",
      "Die akzeptierten Partner konnten nicht geladen werden."
    );
  }

  setTimeout(() => {
    groupNameInput.focus();
  }, 50);
}

/* =========================
   MODIFICATION: fermer la modal de création de groupe
========================= */
function closeGroupModal() {
  if (!groupModal) return;

  groupModal.classList.add("hidden");

  if (groupForm) {
    groupForm.reset();
  }

  acceptedPartnersForGroup = [];

  if (acceptedPartnersList) {
    acceptedPartnersList.innerHTML =
      '<p class="empty-message">Partner werden geladen...</p>';
  }

  updateSelectedGroupMembersCounter();
}

/* =========================
   MODIFICATION: charger uniquement les partenaires acceptés
   On lit partnerRequests et on garde seulement les demandes avec status === "accepted".
========================= */
async function loadAcceptedPartnersForGroup() {
  if (!currentUser) return;

  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", currentUser.uid)
  );

  const snapshot = await getDocs(requestsQuery);

  const acceptedRequests = snapshot.docs
    .map((requestDocument) => ({
      id: requestDocument.id,
      ...requestDocument.data(),
    }))
    .filter((request) => request.status === "accepted");

  const partnerIds = [
    ...new Set(
      acceptedRequests
        .map((request) =>
          request.participants.find((participantId) => {
            return participantId !== currentUser.uid;
          })
        )
        .filter(Boolean)
    ),
  ];

  acceptedPartnersForGroup = await Promise.all(
    partnerIds.map((partnerId) => getUserData(partnerId))
  );

  renderAcceptedPartnersForGroup();
}

/* =========================
   MODIFICATION: afficher les partenaires acceptés dans la modal
   Chaque partenaire est affiché avec une checkbox.
========================= */
function renderAcceptedPartnersForGroup() {
  if (!acceptedPartnersList) return;

  if (acceptedPartnersForGroup.length === 0) {
    acceptedPartnersList.innerHTML = `
      <p class="empty-message">
        Keine akzeptierten Lernpartner gefunden.
      </p>
    `;

    updateSelectedGroupMembersCounter();
    return;
  }

  acceptedPartnersList.innerHTML = acceptedPartnersForGroup
    .map(
      (partner) => `
        <label class="accepted-partner-option">
          <input
            type="checkbox"
            class="group-member-checkbox"
            value="${escapeHTML(partner.id)}"
          />

          <img
            src="${escapeHTML(partner.photoURL || DEFAULT_PROFILE_PHOTO)}"
            alt="Profilbild von ${escapeHTML(partner.fullname || "Partner")}"
          />

          <div>
            <p class="accepted-partner-name">
              ${escapeHTML(partner.fullname || "Unbekannter Nutzer")}
            </p>

            <p class="accepted-partner-meta">
              ${escapeHTML(partner.fachbereich || partner.faculty || partner.email || "-")}
            </p>
          </div>
        </label>
      `
    )
    .join("");

  const checkboxes = acceptedPartnersList.querySelectorAll(
    ".group-member-checkbox"
  );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedGroupMembersCounter);
  });

  updateSelectedGroupMembersCounter();
}

/* =========================
   MODIFICATION: compter les membres sélectionnés
   Le créateur est automatiquement inclus, donc 1 partenaire sélectionné = 2 membres au total.
========================= */
function getSelectedGroupMemberIds() {
  if (!acceptedPartnersList) return [];

  return Array.from(
    acceptedPartnersList.querySelectorAll(".group-member-checkbox:checked")
  ).map((checkbox) => checkbox.value);
}

function updateSelectedGroupMembersCounter() {
  if (!groupMembersCounter) return;

  const selectedCount = getSelectedGroupMemberIds().length;
  const totalMembers = selectedCount + 1;

  if (selectedCount === 0) {
    groupMembersCounter.textContent = "0 ausgewählt";
    return;
  }

  groupMembersCounter.textContent = `${selectedCount} ausgewählt · ${totalMembers} Mitglieder`;
}

/* =========================
   MODIFICATION: créer un document type "group" dans Firestore
   Le groupe contient toujours le créateur + les partenaires sélectionnés.
========================= */
async function createStudyGroup() {
  const groupName = groupNameInput.value.trim();
  const selectedPartnerIds = getSelectedGroupMemberIds();

  if (!groupName) {
    showModal(
      "warning",
      "Gruppenname fehlt",
      "Bitte gib einen Namen für die Lerngruppe ein."
    );
    return;
  }

  if (selectedPartnerIds.length === 0) {
    showModal(
      "warning",
      "Keine Teilnehmer",
      "Bitte wähle mindestens einen Lernpartner aus."
    );
    return;
  }

  const participants = [currentUser.uid, ...selectedPartnerIds];

  const unreadCount = {};

  participants.forEach((participantId) => {
    unreadCount[participantId] = 0;
  });

  if (createGroupBtn) {
    createGroupBtn.disabled = true;
    createGroupBtn.textContent = "Wird erstellt...";
  }

  try {
    const groupDocument = await addDoc(collection(db, "chats"), {
      type: "group",
      groupName,
      groupPhotoURL: "",
      createdBy: currentUser.uid,
      admins: [currentUser.uid],
      participants,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      unreadCount,
      archivedBy: [],
    });

    closeGroupModal();

    showModal(
      "success",
      "Lerngruppe erstellt",
      "Die Lerngruppe wurde erfolgreich erstellt.",
      () => {
        selectChat(groupDocument.id);
      }
    );
  } catch (error) {
    console.error(error);

    showModal(
      "error",
      "Fehler",
      "Die Lerngruppe konnte nicht erstellt werden."
    );
  } finally {
    if (createGroupBtn) {
      createGroupBtn.disabled = false;
      createGroupBtn.textContent = "Gruppe erstellen";
    }
  }
}

/* =========================
   MODIFICATION: événements du bouton et de la modal groupe
   Sans ce bloc, le bouton 👥 ne peut pas ouvrir la modal.
========================= */
if (newGroupBtn) {
  newGroupBtn.addEventListener("click", () => {
    openGroupModal();
  });
}

if (closeGroupModalBtn) {
  closeGroupModalBtn.addEventListener("click", closeGroupModal);
}

if (groupModalBackdrop) {
  groupModalBackdrop.addEventListener("click", closeGroupModal);
}

if (groupForm) {
  groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await createStudyGroup();
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
  closeGroupModal();
  closeGroupMemberProfileModal();
  closeManageGroupMembersModal();
  closeModal();
  closeChatInfoModal();
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