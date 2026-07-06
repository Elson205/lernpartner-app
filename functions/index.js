/* =========================
   BACKEND : archivage sécurisé et gestion des groupes.
   Ce fichier prépare les archives privées, retire réellement les anciens
   membres et permet à un admin d’ajouter ou de réintégrer un membre.
========================= */

const admin = require("firebase-admin");

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const {
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");

const { logger } = require("firebase-functions");

/* =========================
   CONFIGURATION FIREBASE ADMIN.
   Admin SDK contourne les règles Firestore afin que le serveur puisse
   créer les archives privées de manière contrôlée.
========================= */
admin.initializeApp();

const db = admin.firestore();

const { FieldValue, Timestamp } = admin.firestore;

/* =========================
   CONFIGURATION DE RÉGION.
========================= */
const REGION = "europe-west3";

/* =========================
   CONFIGURATION D’ÉCRITURE.
   On reste sous la limite Firestore de 500 opérations par batch.
========================= */
const ARCHIVE_BATCH_SIZE = 400;

/* =========================
   HELPER : vérifier l’authentification.
========================= */
function requireAuthenticatedUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Du musst angemeldet sein."
    );
  }

  return request.auth.uid;
}

/* =========================
   HELPER : vérifier un texte obligatoire.
========================= */
function requireString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} ist ungültig.`
    );
  }

  return value.trim();
}

/* =========================
   HELPER : vérifier si un utilisateur est administrateur.
   Les anciens groupes sans admins utilisent createdBy comme fallback.
========================= */
function isGroupAdmin(chatData, userId) {
  const admins = Array.isArray(chatData.admins)
    ? chatData.admins
    : [];

  if (admins.length === 0) {
    return chatData.createdBy === userId;
  }

  return admins.includes(userId);
}

/* =========================
   HELPER : vérifier qu’un utilisateur est un partenaire accepté
   de l’admin qui essaie de l’ajouter au groupe.
========================= */
async function isAcceptedPartnerOf(transaction, callerId, memberId) {
  const requestsQuery = db
    .collection("partnerRequests")
    .where("participants", "array-contains", callerId);

  const requestsSnapshot = await transaction.get(requestsQuery);

  return requestsSnapshot.docs.some((requestSnap) => {
    const requestData = requestSnap.data();

    return (
      requestData.status === "accepted" &&
      Array.isArray(requestData.participants) &&
      requestData.participants.includes(memberId)
    );
  });
}

/* =========================
   FONCTION APPELABLE : quitter ou retirer un membre.
   - "left" : le membre quitte lui-même.
   - "removed" : un admin retire un autre membre.
   Le membre est retiré de participants et son archive privée est préparée.
========================= */
exports.archiveAndRemoveGroupMember = onCall(
  {
    region: REGION,
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (request) => {
    const callerId = requireAuthenticatedUser(request);
    const chatId = requireString(request.data?.chatId, "chatId");
    const memberId = requireString(request.data?.memberId, "memberId");
    const reason = request.data?.reason;

    if (!["left", "removed"].includes(reason)) {
      throw new HttpsError(
        "invalid-argument",
        "reason muss entweder left oder removed sein."
      );
    }

    const newAdminId =
      typeof request.data?.newAdminId === "string" &&
      request.data.newAdminId.trim() !== ""
        ? request.data.newAdminId.trim()
        : null;

    const chatRef = db.collection("chats").doc(chatId);

    const archiveRef = db
      .collection("users")
      .doc(memberId)
      .collection("archivedChats")
      .doc(chatId);

    const removedAt = Timestamp.now();

    /* =========================
       MODIFICATION : les participants et admins sont calculés
       dans une transaction, à partir de la version Firestore la plus récente.
    ========================= */
    await db.runTransaction(async (transaction) => {
      const freshChatSnap = await transaction.get(chatRef);

      if (!freshChatSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Die Lerngruppe wurde nicht gefunden."
        );
      }

      const freshChat = freshChatSnap.data();

      if (freshChat.type !== "group") {
        throw new HttpsError(
          "failed-precondition",
          "Diese Aktion ist nur für Lerngruppen erlaubt."
        );
      }

      if (freshChat.active !== true) {
        throw new HttpsError(
          "failed-precondition",
          "Diese Lerngruppe ist nicht mehr aktiv."
        );
      }

      const freshParticipants = Array.isArray(freshChat.participants)
        ? freshChat.participants
        : [];

      if (!freshParticipants.includes(callerId)) {
        throw new HttpsError(
          "permission-denied",
          "Du bist kein aktives Mitglied dieser Lerngruppe."
        );
      }

      if (!freshParticipants.includes(memberId)) {
        throw new HttpsError(
          "failed-precondition",
          "Dieses Mitglied gehört nicht mehr zur Lerngruppe."
        );
      }

      const callerIsAdmin = isGroupAdmin(freshChat, callerId);

      if (reason === "left" && memberId !== callerId) {
        throw new HttpsError(
          "permission-denied",
          "Du kannst nur selbst aus einer Lerngruppe austreten."
        );
      }

      if (reason === "removed" && memberId === callerId) {
        throw new HttpsError(
          "invalid-argument",
          "Nutze zum Verlassen der Gruppe die Aktion left."
        );
      }

      if (reason === "removed" && !callerIsAdmin) {
        throw new HttpsError(
          "permission-denied",
          "Nur Admins können Mitglieder entfernen."
        );
      }

      const remainingParticipants = freshParticipants.filter(
        (participantId) => participantId !== memberId
      );

      const previousAdmins = Array.isArray(freshChat.admins)
        ? freshChat.admins
        : [];

      let remainingAdmins = previousAdmins.filter((adminId) =>
        remainingParticipants.includes(adminId)
      );

      const removedMemberWasAdmin = previousAdmins.includes(memberId);

      /* =========================
         MODIFICATION : si le dernier admin quitte et que des membres
         restent dans le groupe, un nouveau admin doit être choisi.
      ========================= */
      if (
        remainingParticipants.length > 0 &&
        removedMemberWasAdmin &&
        remainingAdmins.length === 0
      ) {
        if (
          !newAdminId ||
          !remainingParticipants.includes(newAdminId)
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Ein aktives Mitglied muss als neuer Admin gewählt werden."
          );
        }

        remainingAdmins = [newAdminId];
      }

      const chatWillRemainActive = remainingParticipants.length > 0;

      /* =========================
         MODIFICATION : création de l’archive privée du membre.
         Le déclencheur copyGroupArchiveMessages copiera ensuite les messages.
      ========================= */
      transaction.set(
        archiveRef,
        {
          type: "groupArchive",
          sourceChatId: chatId,
          groupName: freshChat.groupName || "Lerngruppe",
          groupPhotoURL: freshChat.groupPhotoURL || "",
          archivedMemberId: memberId,
          removedBy: callerId,
          reason,
          participantsAtArchive: freshParticipants,
          cutoffAt: removedAt,
          archiveStatus: "pending",
          archivedAt: removedAt,
          lastMessage: freshChat.lastMessage || "Noch keine Nachricht",
          lastMessageAt: freshChat.lastMessageAt || removedAt,
          messageCount: 0,
        },
        { merge: true }
      );

      /* =========================
         MODIFICATION : retrait réel du membre du groupe actif.
         Il perd immédiatement l’accès au chat actif et aux futurs messages.
      ========================= */
      transaction.update(chatRef, {
        participants: remainingParticipants,
        admins: remainingAdmins,
        [`unreadCount.${memberId}`]: FieldValue.delete(),
        formerMembers: FieldValue.arrayUnion(memberId),
        [`formerMemberDetails.${memberId}`]: {
          removedAt,
          removedBy: callerId,
          reason,
          archiveStatus: "pending",
        },
        active: chatWillRemainActive,
        updatedAt: removedAt,
      });
    });

    return {
      success: true,
      chatId,
      memberId,
      archiveStatus: "pending",
    };
  }
);

/* =========================
   FONCTION APPELABLE : ajouter ou réintégrer un membre.
   Seul un admin actif peut ajouter un partenaire accepté ou un ancien membre.
   Le membre réintégré voit uniquement les nouveaux messages futurs.
========================= */
exports.addGroupMember = onCall(
  {
    region: REGION,
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    const callerId = requireAuthenticatedUser(request);
    const chatId = requireString(request.data?.chatId, "chatId");
    const memberId = requireString(request.data?.memberId, "memberId");

    if (callerId === memberId) {
      throw new HttpsError(
        "invalid-argument",
        "Du bist bereits Mitglied der Lerngruppe."
      );
    }

    const chatRef = db.collection("chats").doc(chatId);

    await db.runTransaction(async (transaction) => {
      const chatSnap = await transaction.get(chatRef);

      if (!chatSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Die Lerngruppe wurde nicht gefunden."
        );
      }

      const chatData = chatSnap.data();

      if (chatData.type !== "group" || chatData.active !== true) {
        throw new HttpsError(
          "failed-precondition",
          "Diese Lerngruppe ist nicht aktiv."
        );
      }

      const participants = Array.isArray(chatData.participants)
        ? chatData.participants
        : [];

      if (
        !participants.includes(callerId) ||
        !isGroupAdmin(chatData, callerId)
      ) {
        throw new HttpsError(
          "permission-denied",
          "Nur aktive Admins können Mitglieder hinzufügen."
        );
      }

      if (participants.includes(memberId)) {
        throw new HttpsError(
          "already-exists",
          "Dieses Mitglied ist bereits in der Lerngruppe."
        );
      }

      const formerMembers = Array.isArray(chatData.formerMembers)
        ? chatData.formerMembers
        : [];

      const wasFormerMember = formerMembers.includes(memberId);

      const isAcceptedPartner = await isAcceptedPartnerOf(
        transaction,
        callerId,
        memberId
      );

      if (!wasFormerMember && !isAcceptedPartner) {
        throw new HttpsError(
          "permission-denied",
          "Du kannst nur akzeptierte Lernpartner oder ehemalige Mitglieder hinzufügen."
        );
      }

      /* =========================
         MODIFICATION : ajout sécurisé du membre dans le groupe actif.
         Son compteur de messages non lus commence à zéro.
      ========================= */
      transaction.update(chatRef, {
        participants: FieldValue.arrayUnion(memberId),
        [`unreadCount.${memberId}`]: 0,
        formerMembers: FieldValue.arrayRemove(memberId),
        [`formerMemberDetails.${memberId}`]: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });
    });

    return {
      success: true,
      chatId,
      memberId,
    };
  }
);

/* =========================
   DÉCLENCHEUR FIRESTORE : construction de l’archive.
   Les messages jusqu’à cutoffAt sont copiés avec leurs mêmes identifiants.
========================= */
exports.copyGroupArchiveMessages = onDocumentWritten(
  {
    region: REGION,
    document: "users/{userId}/archivedChats/{chatId}",
    timeoutSeconds: 540,
    memory: "1GiB",
    retry: true,
  },
  async (event) => {
    const afterSnap = event.data?.after;

    if (!afterSnap?.exists) {
      return;
    }

    const archiveData = afterSnap.data();

    if (
      archiveData.type !== "groupArchive" ||
      archiveData.archiveStatus !== "pending"
    ) {
      return;
    }

    const userId = event.params.userId;
    const chatId = event.params.chatId;
    const cutoffAt = archiveData.cutoffAt;

    if (!cutoffAt) {
      logger.error("Archive ohne cutoffAt.", { userId, chatId });
      return;
    }

    const sourceMessagesRef = db
      .collection("chats")
      .doc(chatId)
      .collection("messages");

    const archiveRef = db
      .collection("users")
      .doc(userId)
      .collection("archivedChats")
      .doc(chatId);

    const messagesSnapshot = await sourceMessagesRef
      .where("createdAt", "<=", cutoffAt)
      .get();

    const messageDocs = messagesSnapshot.docs;

    for (
      let startIndex = 0;
      startIndex < messageDocs.length;
      startIndex += ARCHIVE_BATCH_SIZE
    ) {
      const batch = db.batch();

      const currentBatch = messageDocs.slice(
        startIndex,
        startIndex + ARCHIVE_BATCH_SIZE
      );

      currentBatch.forEach((messageDoc) => {
        const archiveMessageRef = archiveRef
          .collection("messages")
          .doc(messageDoc.id);

        batch.set(
          archiveMessageRef,
          {
            ...messageDoc.data(),
            sourceChatId: chatId,
            sourceMessageId: messageDoc.id,
            archivedFor: userId,
            archivedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
    }

    /* =========================
       MODIFICATION : l’archive devient prête seulement après
       la copie complète des messages.
    ========================= */
    await archiveRef.set(
      {
        archiveStatus: "ready",
        messageCount: messageDocs.length,
        archiveReadyAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db
      .collection("chats")
      .doc(chatId)
      .update({
        [`formerMemberDetails.${userId}.archiveStatus`]: "ready",
        [`formerMemberDetails.${userId}.archivedAt`]:
          FieldValue.serverTimestamp(),
      });

    logger.info("Archive de groupe terminée.", {
      userId,
      chatId,
      messageCount: messageDocs.length,
    });
  }
);