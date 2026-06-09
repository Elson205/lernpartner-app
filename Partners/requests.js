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

let currentUser = null;

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

function getStatusText(status) {
  if (status === "pending") return "Ausstehend";
  if (status === "accepted") return "Akzeptiert";
  if (status === "rejected") return "Abgelehnt";

  return status;
}

function createReceivedCard(requestId, sender, senderId) {
  const card = document.createElement("div");
  card.className = "request-card";

  card.innerHTML = `
    <div class="request-header">
      <img
        src="${sender.photoURL || "../user-placeholder.jpg"}"
        class="request-photo"
      />

      <div>
        <h3 class="request-name">${sender.fullname || "Unbekannter Nutzer"}</h3>
        <div class="request-info">${sender.faculty || ""}</div>
      </div>
    </div>

    <div class="request-actions">
      <button class="accept-btn">Akzeptieren</button>
      <button class="reject-btn">Ablehnen</button>
    </div>
  `;

  card.querySelector(".accept-btn").addEventListener("click", async () => {
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

    alert("Anfrage akzeptiert ✅");
    window.location.href = "../Chat/chat.html";
  });

  card.querySelector(".reject-btn").addEventListener("click", async () => {
    await updateDoc(doc(db, "partnerRequests", requestId), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    alert("Anfrage abgelehnt.");
    location.reload();
  });

  return card;
}

function createSentCard(receiver, status) {
  const card = document.createElement("div");
  card.className = "request-card";

  card.innerHTML = `
    <div class="request-header">
      <img
        src="${receiver.photoURL || "../user-placeholder.jpg"}"
        class="request-photo"
      />

      <div>
        <h3 class="request-name">${receiver.fullname || "Unbekannter Nutzer"}</h3>
        <div class="request-info">${receiver.faculty || ""}</div>
      </div>
    </div>

    <span class="status-badge ${status}">
      ${getStatusText(status)}
    </span>
  `;

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

    if (data.status !== "pending") continue;

    const sender = await getUser(data.senderId);

    if (!sender) continue;

    receivedRequestsList.appendChild(
      createReceivedCard(docSnap.id, sender, data.senderId)
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

    sentRequestsList.appendChild(createSentCard(receiver, data.status));

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
      alert("Abmeldung fehlgeschlagen.");
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;
  await loadRequests();
});