const express = require('express');
const router = express.Router();
const { db } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

router.get('/', requireAuth, async (req, res) => {
  const { clientId } = req.query;

  if (req.user.role === 'client') {
    return getProposalsForClient(req.user.clientId, res);
  }

  if (clientId) {
    return getProposalsForClient(clientId, res);
  }

  try {
    const snapshot = await db.collection('proposals')
      .orderBy('createdAt', 'desc')
      .get();

    res.json(snapshot.docs.map(doc => serializeProposal(doc)));
  } catch (err) {
    console.error('GET /proposals error:', err);
    res.status(500).json({ error: 'Eroare la obținerea propunerilor.' });
  }
});

async function getProposalsForClient(clientId, res) {
  try {
    const snapshot = await db.collection('proposals')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .get();

    res.json(snapshot.docs.map(doc => serializeProposal(doc)));
  } catch (err) {
    console.error('getProposalsForClient error:', err);
    res.status(500).json({ error: 'Eroare la obținerea propunerilor.' });
  }
}

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { clientId, title, description, price, currency, validUntil, notes } = req.body;

  if (!clientId || !title || price === undefined) {
    return res.status(400).json({ error: 'Câmpurile clientId, title și price sunt obligatorii.' });
  }

  try {
    const proposalData = {
      clientId,
      title,
      description: description || '',
      price: Number(price),
      currency: currency || 'EUR',
      status: 'draft',
      validUntil: validUntil || null,
      notes: notes || '',
      createdAt: new Date(),
      createdBy: req.user.uid,
      sentAt: null,
      respondedAt: null,
    };

    const docRef = await db.collection('proposals').add(proposalData);

    await logActivity({
      clientId,
      type: 'proposal_created',
      description: `Propunere creată: "${title}" — ${price} ${currency || 'EUR'}`,
      createdBy: req.user.uid,
    });

    res.status(201).json({ id: docRef.id, ...proposalData });
  } catch (err) {
    console.error('POST /proposals error:', err);
    res.status(500).json({ error: 'Eroare la crearea propunerii.' });
  }
});

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { title, description, price, currency, validUntil, notes } = req.body;

  try {
    const docRef = db.collection('proposals').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Propunerea nu există.' });
    }

    if (doc.data().status !== 'draft') {
      return res.status(400).json({ error: 'Poți edita doar propuneri cu status "draft".' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = Number(price);
    if (currency !== undefined) updates.currency = currency;
    if (validUntil !== undefined) updates.validUntil = validUntil;
    if (notes !== undefined) updates.notes = notes;
    updates.updatedAt = new Date();

    await docRef.update(updates);
    res.json({ id: req.params.id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('PUT /proposals/:id error:', err);
    res.status(500).json({ error: 'Eroare la actualizarea propunerii.' });
  }
});

router.put('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status invalid. Valori acceptate: ${VALID_STATUSES.join(', ')}` });
  }

  if (req.user.role === 'client' && !['accepted', 'rejected'].includes(status)) {
    return res.status(403).json({ error: 'Clientul poate seta doar status "accepted" sau "rejected".' });
  }

  try {
    const docRef = db.collection('proposals').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Propunerea nu există.' });
    }

    if (req.user.role === 'client' && doc.data().clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const updates = { status, updatedAt: new Date() };
    if (status === 'sent') updates.sentAt = new Date();
    if (['accepted', 'rejected'].includes(status)) updates.respondedAt = new Date();

    await docRef.update(updates);

    await logActivity({
      clientId: doc.data().clientId,
      type: `proposal_${status}`,
      description: `Propunere "${doc.data().title}" — status: ${status}`,
      createdBy: req.user.uid,
    });

    res.json({ id: req.params.id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('PUT /proposals/:id/status error:', err);
    res.status(500).json({ error: 'Eroare la actualizarea statusului.' });
  }
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('proposals').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Propunerea nu există.' });
    if (doc.data().status !== 'draft') {
      return res.status(400).json({ error: 'Poți șterge doar propuneri cu status "draft".' });
    }
    await db.collection('proposals').doc(req.params.id).delete();
    res.json({ message: 'Propunere ștearsă.' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la ștergerea propunerii.' });
  }
});

function serializeProposal(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
    respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt,
  };
}

module.exports = router;