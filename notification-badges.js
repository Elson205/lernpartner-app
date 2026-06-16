// Modification : fichier réutilisable pour afficher des badges de notification propres sur toutes les pages.

import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const db = getFirestore(app);

let unsubscribeRequests = null;
let unsubscribeChats = null;

function updateBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);

  if (!badge) return;

  if (!count || count <= 0) {
    badge.textContent = "0";
    badge.classList.add("hidden");
    return;
  }

  badge.textContent = count > 99 ? "99+" : String(count);
  badge.classList.remove("hidden");
}

function listenRequestNotifications(userId) {
  if (unsubscribeRequests) {
    unsubscribeRequests();
  }

  const requestsQuery = query(
    collection(db, "partnerRequests"),
    where("participants", "array-contains", userId)
  );

  unsubscribeRequests = onSnapshot(
    requestsQuery,
    (snapshot) => {
      let notificationCount = 0;

      snapshot.forEach((requestDocument) => {
        const request = requestDocument.data();
        const seenBy = request.seenBy || [];

        if (!seenBy.includes(userId)) {
          notificationCount += 1;
        }
      });

      updateBadge("requestsBadge", notificationCount);
    },
    (error) => {
      console.error("Erreur notifications Anfragen:", error);
      updateBadge("requestsBadge", 0);
    }
  );
}

function listenChatNotifications(userId) {
  if (unsubscribeChats) {
    unsubscribeChats();
  }

  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId)
  );

  unsubscribeChats = onSnapshot(
    chatsQuery,
    (snapshot) => {
      let unreadMessages = 0;

      snapshot.forEach((chatDocument) => {
        const chat = chatDocument.data();

        unreadMessages += chat.unreadCount?.[userId] || 0;
      });

      updateBadge("chatBadge", unreadMessages);
    },
    (error) => {
      console.error("Erreur notifications Chat:", error);
      updateBadge("chatBadge", 0);
    }
  );
}

export function startNotificationBadges(userId) {
  if (!userId) return;

  listenRequestNotifications(userId);
  listenChatNotifications(userId);
}

export function stopNotificationBadges() {
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }

  if (unsubscribeChats) {
    unsubscribeChats();
    unsubscribeChats = null;
  }

  updateBadge("requestsBadge", 0);
  updateBadge("chatBadge", 0);
}