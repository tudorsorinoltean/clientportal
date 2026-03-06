const express = require('express');
const router = express.Router();
const { db } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue'];

router.get('/', requireAuth, async (req, res) => {
  const { clientId } = req.query;

  if (req.user.role === 'client') {
    return getInvoicesForClient(req.user.clientId, res);
  }

  if (clientId) {
    return getInvoicesForClient(clientId, res);
  }

  try {
    const snapshot = await db.collection('invoices')
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snapshot.docs.map(doc => serializeInvoice(doc)));
  } catch (err) {
    res.status(500).json({ error: 'Eroare la obținerea facturilor.' });
  }
});

async function getInvoicesForClient(clientId, res) {
  try {
    const snapshot = await db.collection('invoices')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snapshot.docs.map(doc => serializeInvoice(doc)));
  } catch (err) {
    res.status(500).json({ error: 'Eroare la obținerea facturilor.' });
  }
}

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { clientId, number, lines, tax, dueDate, notes, currency } = req.body;

  if (!clientId || !number || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Câmpurile clientId, number și lines[] sunt obligatorii.' });
  }

  const subtotal = lines.reduce((sum, line) => {
    return sum + (Number(line.quantity) * Number(line.unitPrice));
  }, 0);

  const taxAmount = subtotal * (Number(tax || 0) / 100);
  const total = subtotal + taxAmount;

  try {
    const invoiceData = {
      clientId,
      number,
      lines: lines.map(l => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Number(tax || 0),
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: currency || 'EUR',
      status: 'draft',
      dueDate: dueDate || null,
      notes: notes || '',
      createdAt: new Date(),
      createdBy: req.user.uid,
      sentAt: null,
      paidAt: null,
    };

    const docRef = await db.collection('invoices').add(invoiceData);

    await logActivity({
      clientId,
      type: 'invoice_created',
      description: `Factură creată: #${number} — ${total} ${currency || 'EUR'}`,
      createdBy: req.user.uid,
    });

    res.status(201).json({ id: docRef.id, ...invoiceData });
  } catch (err) {
    console.error('POST /invoices error:', err);
    res.status(500).json({ error: 'Eroare la crearea facturii.' });
  }
});

router.put('/:id/status', requireAuth, adminOnly, async (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status invalid. Valori: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const docRef = db.collection('invoices').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Factura nu există.' });

    const updates = { status, updatedAt: new Date() };
    if (status === 'sent') updates.sentAt = new Date();
    if (status === 'paid') updates.paidAt = new Date();

    await docRef.update(updates);

    await logActivity({
      clientId: doc.data().clientId,
      type: `invoice_${status}`,
      description: `Factură #${doc.data().number} — status: ${status}`,
      createdBy: req.user.uid,
    });

    res.json({ id: req.params.id, ...doc.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la actualizarea statusului.' });
  }
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('invoices').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Factura nu există.' });
    if (doc.data().status !== 'draft') {
      return res.status(400).json({ error: 'Poți șterge doar facturi cu status "draft".' });
    }
    await db.collection('invoices').doc(req.params.id).delete();
    res.json({ message: 'Factură ștearsă.' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la ștergerea facturii.' });
  }
});

function serializeInvoice(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
    paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt,
  };
}

module.exports = router;