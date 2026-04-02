require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function setup() {
  const adminUser = await auth.getUserByEmail('demo.admin@clientportal.app');
  await auth.setCustomUserClaims(adminUser.uid, { admin: true });
  console.log('✅ Admin claims set:', adminUser.uid);

  const clientsSnap = await db.collection('clients').limit(1).get();
  if (clientsSnap.empty) {
    console.log('❌ No clients in Firestore. Run seed first.');
    process.exit(1);
  }
  const clientId = clientsSnap.docs[0].id;
  const clientData = clientsSnap.docs[0].data();
  console.log('📋 Using client:', clientData.name, '| ID:', clientId);

  const clientUser = await auth.getUserByEmail('demo.client@clientportal.app');
  await auth.setCustomUserClaims(clientUser.uid, { role: 'client', clientId });
  console.log('✅ Client claims set:', clientUser.uid);

  await db.collection('users').doc(clientUser.uid).set({
    email: 'demo.client@clientportal.app',
    role: 'client',
    clientId,
  });
  console.log('✅ User doc created in Firestore');
  console.log('\n🎉 Done!');
  console.log('Admin: demo.admin@clientportal.app / Demo1234!');
  console.log('Client: demo.client@clientportal.app / Demo1234! →', clientData.name);
}

setup().catch(console.error);
