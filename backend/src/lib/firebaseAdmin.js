const admin = require('firebase-admin');

let db;
let storage;
let auth;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    storage = admin.storage();
    auth = admin.auth();
    return;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountBase64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT lipsește din .env. ' +
      'Generează Service Account din Firebase Console → Project Settings → Service Accounts.'
    );
  }

  let serviceAccount;
  try {
    const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decoded);
  } catch (err) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT nu este un base64 valid. ' +
      'Rulează: base64 -i serviceAccountKey.json | tr -d "\\n"'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
    projectId: serviceAccount.project_id,
  });

  db = admin.firestore();
  storage = admin.storage();
  auth = admin.auth();

  console.log(`✅ Firebase Admin SDK inițializat — proiect: ${serviceAccount.project_id}`);
}

initializeFirebase();

module.exports = { db, storage, auth, admin };