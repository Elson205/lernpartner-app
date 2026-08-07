"use strict";

const {
  initializeApp,
  getApp,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const EXPECTED_PROJECT_ID = "lernpartner-app";
const EXECUTE = process.argv.includes("--execute");
const BATCH_LIMIT = 400;

initializeApp({
  projectId: EXPECTED_PROJECT_ID,
});

const db = getFirestore();

async function removePublicUserEmails() {
  const actualProjectId =
    getApp().options.projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  if (actualProjectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Wrong Firebase project: ${
        actualProjectId || "unknown"
      }. Expected: ${EXPECTED_PROJECT_ID}.`
    );
  }

  const usersSnapshot = await db.collection("users").get();

  const documentsWithEmail = usersSnapshot.docs.filter(
    (documentSnapshot) =>
      Object.prototype.hasOwnProperty.call(
        documentSnapshot.data(),
        "email"
      )
  );

  console.log(`Firebase project: ${actualProjectId}`);
  console.log(`User documents scanned: ${usersSnapshot.size}`);
  console.log(
    `User documents containing email: ${documentsWithEmail.length}`
  );

  if (!EXECUTE) {
    console.log(
      "Dry run only: no Firestore document was modified."
    );
    console.log(
      "Run again with --execute only after reviewing this result."
    );
    return;
  }

  let removedCount = 0;

  for (
    let startIndex = 0;
    startIndex < documentsWithEmail.length;
    startIndex += BATCH_LIMIT
  ) {
    const batch = db.batch();
    const currentDocuments = documentsWithEmail.slice(
      startIndex,
      startIndex + BATCH_LIMIT
    );

    currentDocuments.forEach((documentSnapshot) => {
      batch.update(documentSnapshot.ref, {
        email: FieldValue.delete(),
      });
    });

    await batch.commit();
    removedCount += currentDocuments.length;

    console.log(
      `Removed email from ${removedCount}/${documentsWithEmail.length} documents.`
    );
  }

  console.log(
    `Migration completed: ${removedCount} email fields removed.`
  );
}

removePublicUserEmails()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  });
