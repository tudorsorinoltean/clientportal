const express = require('express');
const router = express.Router();
const { db } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');

async function logActivity({ clientId, type, description, createdBy }) {
  try {
    await db.collection('activity').add({
      clientId,
      type,
      description,
      createdBy: createdBy || 'system',
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('logActivity error:', err.message);
  }
}

router.get('/:clientId', requireAuth, async (req, res) => {
  const { clientId } = req.params;

  if (req.user.role === 'client' && req.user.clientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  try {
    const snapshot = await db.collection('activity')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    res.json(activities);
  } catch (err) {
    console.error('GET /activity/:clientId error:', err);
    res.status(500).json({ error: 'Eroare la obținerea activității.' });
  }
});

module.exports = router;
module.exports.logActivity = logActivity;