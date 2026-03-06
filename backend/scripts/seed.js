require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountBase64) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT lipsește din .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();
const auth = admin.auth();

const ADMIN_EMAIL = 'admin@clientportal.dev';
const ADMIN_PASSWORD = 'Admin123!';

const clients = [
  { name: 'Marco Rossi', email: 'marco@pizzerianapoli.it', company: 'Pizzeria Napoli SRL', phone: '+39 02 1234 5678', type: 'retainer', status: 'active', notes: 'Italian client, restaurant chain, 3 locations.' },
  { name: 'Sarah Mitchell', email: 'sarah@travelwise.co.uk', company: 'TravelWise Agency', phone: '+44 20 7946 0000', type: 'retainer', status: 'active', notes: 'Travel agency based in London.' },
  { name: 'Andrei Popescu', email: 'andrei@fastlogistica.ro', company: 'FastLogistica SRL', phone: '+40 721 345 678', type: 'one-shot', status: 'active', notes: 'Local client — internal dashboard.' },
  { name: 'Lena Müller', email: 'lena@greentech-berlin.de', company: 'GreenTech Berlin GmbH', phone: '+49 30 9876 5432', type: 'one-shot', status: 'active', notes: 'Berlin startup, green energy sector.' },
  { name: 'Bogdan Ionescu', email: 'bogdan@creativestudio.ro', company: 'Creative Studio Bucharest', phone: '+40 730 222 111', type: 'retainer', status: 'active', notes: 'Design studio based in Bucharest.' },
];

const now = new Date();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000);

async function seed() {
  console.log('🌱 Seed ClientPortal demo data...\n');

  // Admin user
  let adminUid;
  try {
    try {
      const existingAdmin = await auth.getUserByEmail(ADMIN_EMAIL);
      adminUid = existingAdmin.uid;
      console.log(`ℹ️  Admin user existent: ${ADMIN_EMAIL}`);
    } catch {
      const adminUser = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'Admin User',
      });
      adminUid = adminUser.uid;
      console.log(`✅ Admin user creat: ${ADMIN_EMAIL}`);
    }
    await auth.setCustomUserClaims(adminUid, { role: 'admin' });
    console.log(`✅ Custom claims setate: { role: 'admin' }\n`);
  } catch (err) {
    console.error('❌ Eroare la crearea admin user:', err.message);
    process.exit(1);
  }

  // Clienți
  const clientIds = [];
  for (const [i, client] of clients.entries()) {
    const docRef = await db.collection('clients').add({
      ...client,
      createdAt: daysAgo(60 - i * 10),
      createdBy: adminUid,
    });
    clientIds.push(docRef.id);
    console.log(`✅ Client creat: ${client.name} (${client.type})`);
  }
  console.log('');

  // Propuneri
  const proposals = [
    { clientIdx: 0, title: 'Restaurant Management System v2.0', description: 'Management system for 3 locations.', price: 4800, status: 'accepted', createdDaysAgo: 45, sentDaysAgo: 43, respondedDaysAgo: 40 },
    { clientIdx: 0, title: 'Monthly Retainer — Maintenance & Features', description: 'Monthly maintenance + up to 20h development.', price: 450, status: 'accepted', createdDaysAgo: 35, sentDaysAgo: 34, respondedDaysAgo: 32 },
    { clientIdx: 1, title: 'TourFlow B2B Booking Platform', description: 'Booking platform for travel agency.', price: 5500, status: 'accepted', createdDaysAgo: 50, sentDaysAgo: 48, respondedDaysAgo: 45 },
    { clientIdx: 1, title: 'Retainer + Mobile App Specification', description: 'Monthly retainer + mobile app specifications.', price: 600, status: 'sent', createdDaysAgo: 5, sentDaysAgo: 3 },
    { clientIdx: 2, title: 'Fleet Dashboard — MVP', description: 'Internal dashboard for fleet tracking.', price: 3200, status: 'accepted', createdDaysAgo: 30, sentDaysAgo: 28, respondedDaysAgo: 25 },
    { clientIdx: 3, title: 'SaaS MVP — Energy Monitor', description: 'SaaS MVP for energy consumption monitoring.', price: 7200, status: 'sent', createdDaysAgo: 7, sentDaysAgo: 5 },
    { clientIdx: 4, title: 'Client Portal — Design Studio', description: 'Client portal for design project delivery.', price: 2800, status: 'accepted', createdDaysAgo: 20, sentDaysAgo: 18, respondedDaysAgo: 16 },
    { clientIdx: 3, title: 'SaaS MVP — Simplified Version', description: 'Reduced scope version without multi-tenant.', price: 4200, status: 'draft', createdDaysAgo: 2 },
  ];

  for (const p of proposals) {
    await db.collection('proposals').add({
      clientId: clientIds[p.clientIdx],
      title: p.title,
      description: p.description,
      price: p.price,
      currency: 'EUR',
      status: p.status,
      validUntil: null,
      notes: '',
      createdAt: daysAgo(p.createdDaysAgo),
      createdBy: adminUid,
      sentAt: p.sentDaysAgo ? daysAgo(p.sentDaysAgo) : null,
      respondedAt: p.respondedDaysAgo ? daysAgo(p.respondedDaysAgo) : null,
    });
    console.log(`✅ Propunere: "${p.title}" — ${p.status}`);
  }
  console.log('');

  // Facturi
  const invoices = [
    { clientIdx: 0, number: 'CP-2024-001', lines: [{ description: 'Restaurant Management System v2.0', quantity: 1, unitPrice: 4800 }], tax: 19, status: 'paid', createdDaysAgo: 40, sentDaysAgo: 38, paidDaysAgo: 32, dueDate: '2024-12-15' },
    { clientIdx: 0, number: 'CP-2025-001', lines: [{ description: 'Monthly Retainer January 2025', quantity: 1, unitPrice: 450 }], tax: 19, status: 'paid', createdDaysAgo: 35, sentDaysAgo: 34, paidDaysAgo: 30, dueDate: '2025-01-31' },
    { clientIdx: 0, number: 'CP-2025-002', lines: [{ description: 'Monthly Retainer February 2025', quantity: 1, unitPrice: 450 }], tax: 19, status: 'paid', createdDaysAgo: 20, sentDaysAgo: 19, paidDaysAgo: 15, dueDate: '2025-02-28' },
    { clientIdx: 0, number: 'CP-2025-003', lines: [{ description: 'Monthly Retainer March 2025', quantity: 1, unitPrice: 450 }], tax: 19, status: 'sent', createdDaysAgo: 5, sentDaysAgo: 4, dueDate: '2025-03-31' },
    { clientIdx: 1, number: 'CP-2024-002', lines: [{ description: 'TourFlow Platform — 50% deposit', quantity: 1, unitPrice: 2750 }], tax: 0, status: 'paid', createdDaysAgo: 48, sentDaysAgo: 46, paidDaysAgo: 44, dueDate: '2024-12-01' },
    { clientIdx: 1, number: 'CP-2025-004', lines: [{ description: 'TourFlow Platform — 50% final payment', quantity: 1, unitPrice: 2750 }], tax: 0, status: 'paid', createdDaysAgo: 25, sentDaysAgo: 24, paidDaysAgo: 20, dueDate: '2025-01-15' },
    { clientIdx: 2, number: 'CP-2025-005', lines: [{ description: 'Fleet Dashboard MVP — 50% deposit', quantity: 1, unitPrice: 1600 }], tax: 19, status: 'paid', createdDaysAgo: 28, sentDaysAgo: 27, paidDaysAgo: 25, dueDate: '2025-02-01' },
    { clientIdx: 2, number: 'CP-2025-006', lines: [{ description: 'Fleet Dashboard MVP — 50% final payment', quantity: 1, unitPrice: 1600 }], tax: 19, status: 'sent', createdDaysAgo: 7, sentDaysAgo: 5, dueDate: '2025-03-20' },
    { clientIdx: 4, number: 'CP-2025-007', lines: [{ description: 'Client Portal Studio — 50% deposit', quantity: 1, unitPrice: 1400 }], tax: 19, status: 'paid', createdDaysAgo: 15, sentDaysAgo: 14, paidDaysAgo: 12, dueDate: '2025-02-20' },
    { clientIdx: 4, number: 'CP-2025-008', lines: [{ description: 'Client Portal Studio — 50% final payment', quantity: 1, unitPrice: 1400 }, { description: 'Hosting setup + domain', quantity: 1, unitPrice: 80 }], tax: 19, status: 'overdue', createdDaysAgo: 8, sentDaysAgo: 7, dueDate: '2025-03-01' },
  ];

  for (const inv of invoices) {
    const subtotal = inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = subtotal * (inv.tax / 100);
    const total = subtotal + taxAmount;
    await db.collection('invoices').add({
      clientId: clientIds[inv.clientIdx],
      number: inv.number,
      lines: inv.lines,
      subtotal,
      tax: inv.tax,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'EUR',
      status: inv.status,
      dueDate: inv.dueDate,
      notes: '',
      createdAt: daysAgo(inv.createdDaysAgo),
      createdBy: adminUid,
      sentAt: inv.sentDaysAgo ? daysAgo(inv.sentDaysAgo) : null,
      paidAt: inv.paidDaysAgo ? daysAgo(inv.paidDaysAgo) : null,
    });
    console.log(`✅ Factură: ${inv.number} — ${total} EUR — ${inv.status}`);
  }
  console.log('');

  // Activity
  const activities = [
    { clientIdx: 0, type: 'client_created', description: 'Client added to portal', daysAgo: 60 },
    { clientIdx: 0, type: 'proposal_accepted', description: 'Proposal accepted — Restaurant Management System', daysAgo: 40 },
    { clientIdx: 0, type: 'invoice_paid', description: 'Invoice CP-2024-001 paid — 5,712 EUR', daysAgo: 32 },
    { clientIdx: 1, type: 'client_created', description: 'Client added to portal', daysAgo: 55 },
    { clientIdx: 1, type: 'proposal_accepted', description: 'Proposal accepted — TourFlow Platform', daysAgo: 45 },
    { clientIdx: 2, type: 'proposal_accepted', description: 'Proposal accepted — Fleet Dashboard MVP', daysAgo: 25 },
    { clientIdx: 3, type: 'proposal_sent', description: 'Proposal sent — SaaS MVP Energy Monitor', daysAgo: 5 },
    { clientIdx: 4, type: 'proposal_accepted', description: 'Proposal accepted — Client Portal Studio', daysAgo: 16 },
    { clientIdx: 4, type: 'invoice_paid', description: 'Invoice CP-2025-007 paid — 1,666 EUR', daysAgo: 12 },
  ];

  for (const act of activities) {
    await db.collection('activity').add({
      clientId: clientIds[act.clientIdx],
      type: act.type,
      description: act.description,
      createdBy: adminUid,
      createdAt: daysAgo(act.daysAgo),
    });
  }
  console.log(`✅ ${activities.length} activity entries create\n`);

  console.log('═══════════════════════════════════════════');
  console.log('✅ SEED COMPLET');
  console.log('═══════════════════════════════════════════');
  console.log(`Admin login:  ${ADMIN_EMAIL}`);
  console.log(`Admin pass:   ${ADMIN_PASSWORD}`);
  console.log(`Clienți:      ${clients.length}`);
  console.log(`Propuneri:    ${proposals.length}`);
  console.log(`Facturi:      ${invoices.length}`);
  console.log('═══════════════════════════════════════════');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed eșuat:', err);
  process.exit(1);
});