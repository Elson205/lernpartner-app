/* =========================
   BACKEND : archivage sécurisé des groupes.
   Ce fichier crée une archive privée lorsqu’un utilisateur quitte
   ou est retiré d’une Lerngruppe.
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
   Remplace cette valeur si la région Firestore de ton projet est différente.
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
   FONCTION APPELABLE : quitter ou retirer un membre.
   - "left" : le membre quitte lui-même.
   - "removed" : un admin retire un autre membre.
   Le membre est retiré de participants.
   Son archive privée est préparée immédiatement.
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

    const memberId = requireString(
      request.data?.memberId,
      "memberId"
    );

    const reason = request.data?.reason;

    if (!["left", "removed"].includes(reason)) {
      throw new HttpsError(
        "invalid-argument",
        "reason muss entweder left oder removed sein."
      );
    }

    const newAdminId =
      typeof request.data?.newAdminId === "string"
        ? request.data.newAdminId
        : null;

    const chatRef = db.collection("chats").doc(chatId);

    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Die Lerngruppe wurde nicht gefunden."
      );
    }

    const chatData = chatSnap.data();

    if (chatData.type !== "group") {
      throw new HttpsError(
        "failed-precondition",
        "Diese Aktion ist nur für Lerngruppen erlaubt."
      );
    }

    if (chatData.active !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Diese Lerngruppe ist nicht mehr aktiv."
      );
    }

    const participants = Array.isArray(chatData.participants)
      ? chatData.participants
      : [];

    if (!participants.includes(callerId)) {
      throw new HttpsError(
        "permission-denied",
        "Du bist kein aktives Mitglied dieser Lerngruppe."
      );
    }

    if (!participants.includes(memberId)) {
      throw new HttpsError(
        "failed-precondition",
        "Dieses Mitglied gehört nicht mehr zur Lerngruppe."
      );
    }

    const callerIsAdmin = isGroupAdmin(chatData, callerId);

    /* =========================
       SÉCURITÉ : seul l’utilisateur concerné peut quitter.
       Seul un admin peut retirer un autre membre.
    ========================= */
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

    const remainingParticipants = participants.filter(
      (participantId) => participantId !== memberId
    );

    const previousAdmins = Array.isArray(chatData.admins)
      ? chatData.admins
      : [];

    let remainingAdmins = previousAdmins.filter((adminId) =>
      remainingParticipants.includes(adminId)
    );

    const removedMemberWasAdmin = previousAdmins.includes(memberId);

    /* =========================
       SÉCURITÉ : si le dernier admin quitte et que le groupe continue,
       un nouveau admin doit être choisi.
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

    const removedAt = Timestamp.now();

    const archiveRef = db
      .collection("users")
      .doc(memberId)
      .collection("archivedChats")
      .doc(chatId);

    /* =========================
       MODIFICATION : transaction atomique.
       Le membre perd d’abord l’accès au groupe actif.
       L’archive est ensuite marquée comme pending pour le déclencheur.
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

      const freshParticipants = Array.isArray(
        freshChat.participants
      )
        ? freshChat.participants
        : [];

      if (!freshParticipants.includes(memberId)) {
        throw new HttpsError(
          "failed-precondition",
          "Dieses Mitglied wurde bereits entfernt."
        );
      }

      const chatWillRemainActive =
        remainingParticipants.length > 0;

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

          lastMessage:
            freshChat.lastMessage || "Noch keine Nachricht",

          lastMessageAt:
            freshChat.lastMessageAt || removedAt,

          messageCount: 0,
        },
        { merge: true }
      );

      transaction.update(chatRef, {
        participants: remainingParticipants,

        admins: remainingAdmins,

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
   DÉCLENCHEUR FIRESTORE : construction de l’archive.
   Il copie les messages existant jusqu’à cutoffAt.
   Les identifiants des messages restent identiques afin que l’opération
   soit idempotente même si Firebase relance le déclencheur.
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
      logger.error("Archive ohne cutoffAt.", {
        userId,
        chatId,
      });

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

    /* =========================
       MODIFICATION : seuls les messages existant avant le retrait
       sont copiés dans l’archive privée.
    ========================= */
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
       MODIFICATION : l’archive devient disponible après copie complète.
    ========================= */
    await archiveRef.set(
      {
        archiveStatus: "ready",
        messageCount: messageDocs.length,
        archiveReadyAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    /* =========================
       MODIFICATION : mémoriser la réussite dans le groupe source.
       Ce champ est informatif ; il ne redonne aucun droit d’accès.
    ========================= */
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