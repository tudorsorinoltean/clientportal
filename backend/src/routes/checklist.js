const express = require('express');
const router = express.Router({ mergeParams: true });
const { db } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

router.get('/', requireAuth, async (req, res) => {
  const { id: projectId } = req.params;

  try {
    let query = db.collection('projects').doc(projectId).collection('checklist').orderBy('order');

    if (req.user.role === 'client') {
      query = query.where('visibleToClient', '==', true);
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.map(doc => serializeTask(doc));

    res.json(tasks);
  } catch (err) {
    console.error('GET /projects/:id/checklist error:', err);
    res.status(500).json({ error: 'Eroare la obținerea task-urilor.' });
  }
});

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { id: projectId } = req.params;
  const { title, category, visibleToClient } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Câmpurile title și category sunt obligatorii.' });
  }

  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Proiectul nu există.' });
    }

    const existingSnapshot = await db.collection('projects').doc(projectId).collection('checklist').get();
    const order = existingSnapshot.size + 1;

    const taskData = {
      title,
      category,
      visibleToClient: visibleToClient === true,
      status: 'pending',
      completedAt: null,
      isCustom: true,
      createdAt: new Date(),
      order,
    };

    const taskRef = await db.collection('projects').doc(projectId).collection('checklist').add(taskData);

    res.status(201).json({ id: taskRef.id, ...taskData });
  } catch (err) {
    console.error('POST /projects/:id/checklist error:', err);
    res.status(500).json({ error: 'Eroare la adăugarea task-ului.' });
  }
});

router.put('/:taskId', requireAuth, async (req, res) => {
  const { id: projectId, taskId } = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ['pending', 'in_progress', 'done'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status invalid. Valori acceptate: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Proiectul nu există.' });
    }

    const taskRef = db.collection('projects').doc(projectId).collection('checklist').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task-ul nu există.' });
    }

    if (req.user.role === 'client' && !taskDoc.data().visibleToClient) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const updates = {
      status,
      completedAt: status === 'done' ? new Date() : null,
      updatedAt: new Date(),
    };

    await taskRef.update(updates);

    await logActivity({
      clientId: projectDoc.data().clientId,
      type: 'task_updated',
      description: `Task "${taskDoc.data().title}" marked as ${status}`,
      createdBy: req.user.uid,
    });

    res.json({ id: taskId, ...taskDoc.data(), ...updates });
  } catch (err) {
    console.error('PUT /projects/:id/checklist/:taskId error:', err);
    res.status(500).json({ error: 'Eroare la actualizarea task-ului.' });
  }
});

router.delete('/:taskId', requireAuth, adminOnly, async (req, res) => {
  const { id: projectId, taskId } = req.params;

  try {
    const taskRef = db.collection('projects').doc(projectId).collection('checklist').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task-ul nu există.' });
    }

    if (!taskDoc.data().isCustom) {
      return res.status(400).json({ error: 'Task-urile standard nu pot fi șterse.' });
    }

    await taskRef.delete();

    res.json({ message: `Task "${taskDoc.data().title}" a fost șters.` });
  } catch (err) {
    console.error('DELETE /projects/:id/checklist/:taskId error:', err);
    res.status(500).json({ error: 'Eroare la ștergerea task-ului.' });
  }
});

function serializeTask(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  };
}

module.exports = router;
