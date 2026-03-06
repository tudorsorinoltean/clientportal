const express = require('express');
const router = express.Router();
const { db, auth } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

router.get('/', requireAuth, adminOnly, async (req, res) => {
  try {
    const snapshot = await db.collection('clients')
      .orderBy('createdAt', 'desc')
      .get();

    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    res.json(clients);
  } catch (err) {
    console.error('GET /clients error:', err);
    res.status(500).json({ error: 'Eroare la obținerea clienților.' });
  }
});

router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('clients').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Clientul nu există.' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('GET /clients/:id error:', err);
    res.status(500).json({ error: 'Eroare la obținerea clientului.' });
  }
});

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { name, email, company, phone, type, notes } = req.body;

  if (!name || !email || !type) {
    return res.status(400).json({ error: 'Câmpurile name, email și type sunt obligatorii.' });
  }

  if (!['retainer', 'one-shot'].includes(type)) {
    return res.status(400).json({ error: 'type trebuie să fie "retainer" sau "one-shot".' });
  }

  try {
    const existing = await db.collection('clients').where('email', '==', email).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Un client cu acest email există deja.' });
    }

    const clientData = {
      name,
      email,
      company: company || '',
      phone: phone || '',
      type,
      notes: notes || '',
      status: 'active',
      createdAt: new Date(),
      createdBy: req.user.uid,
    };

    const docRef = await db.collection('clients').add(clientData);

    await logActivity({
      clientId: docRef.id,
      type: 'client_created',
      description: `Client nou creat: ${name}`,
      createdBy: req.user.uid,
    });

    res.status(201).json({ id: docRef.id, ...clientData });
  } catch (err) {
    console.error('POST /clients error:', err);
    res.status(500).json({ error: 'Eroare la crearea clientului.' });
  }
});

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, email, company, phone, type, notes, status } = req.body;

  try {
    const docRef = db.collection('clients').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Clientul nu există.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (phone !== undefined) updates.phone = phone;
    if (type !== undefined) updates.type = type;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    updates.updatedAt = new Date();

    await docRef.update(updates);

    await logActivity({
      clientId: req.params.id,
      type: 'client_updated',
      description: `Client actualizat: ${updates.name || doc.data().name}`,
      createdBy: req.user.uid,
    });

    res.json({ id: req.params.id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('PUT /clients/:id error:', err);
    res.status(500).json({ error: 'Eroare la actualizarea clientului.' });
  }
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('clients').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Clientul nu există.' });
    }

    await db.collection('clients').doc(req.params.id).delete();

    res.json({ message: `Clientul ${doc.data().name} a fost șters.` });
  } catch (err) {
    console.error('DELETE /clients/:id error:', err);
    res.status(500).json({ error: 'Eroare la ștergerea clientului.' });
  }
});

router.post('/:id/portal-access', requireAuth, adminOnly, async (req, res) => {
  const { password } = req.body;

  try {
    const doc = await db.collection('clients').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Clientul nu există.' });
    }

    const clientData = doc.data();

    try {
      const existingUser = await auth.getUserByEmail(clientData.email);
      await auth.setCustomUserClaims(existingUser.uid, {
        role: 'client',
        clientId: req.params.id,
      });
      return res.json({
        message: 'Portal access actualizat pentru user existent.',
        uid: existingUser.uid,
      });
    } catch (notFoundErr) {
      // User nu există — creează unul nou
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Parola trebuie să aibă minim 8 caractere.' });
    }

    const userRecord = await auth.createUser({
      email: clientData.email,
      password,
      displayName: clientData.name,
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'client',
      clientId: req.params.id,
    });

    await db.collection('clients').doc(req.params.id).update({
      portalUserId: userRecord.uid,
      portalAccess: true,
      portalCreatedAt: new Date(),
    });

    await logActivity({
      clientId: req.params.id,
      type: 'portal_access_granted',
      description: `Acces portal activat pentru ${clientData.name}`,
      createdBy: req.user.uid,
    });

    res.status(201).json({
      message: 'Portal access creat cu succes.',
      uid: userRecord.uid,
      email: clientData.email,
    });
  } catch (err) {
    console.error('POST /clients/:id/portal-access error:', err);
    res.status(500).json({ error: 'Eroare la crearea accesului portal.' });
  }
});

module.exports = router;