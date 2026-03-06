const express = require('express');
const router = express.Router();
const { db } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

const STANDARD_TASKS = [
  { title: 'Send initial proposal to client', category: 'Proposal', visibleToClient: false, order: 1 },
  { title: 'Get proposal accepted / contract signed', category: 'Proposal', visibleToClient: true, order: 2 },
  { title: 'Collect deposit / first payment', category: 'Finance', visibleToClient: false, order: 3 },
  { title: 'Kick-off meeting scheduled', category: 'Project', visibleToClient: true, order: 4 },
  { title: 'Requirements document shared with client', category: 'Project', visibleToClient: true, order: 5 },
  { title: 'First deliverable shared for review', category: 'Delivery', visibleToClient: true, order: 6 },
  { title: 'Client feedback collected and applied', category: 'Delivery', visibleToClient: true, order: 7 },
  { title: 'Final deliverable approved by client', category: 'Delivery', visibleToClient: true, order: 8 },
  { title: 'Final invoice sent', category: 'Finance', visibleToClient: true, order: 9 },
  { title: 'Final payment received', category: 'Finance', visibleToClient: false, order: 10 },
  { title: 'Project marked as complete', category: 'Project', visibleToClient: true, order: 11 },
  { title: 'Testimonial / review requested from client', category: 'Post-project', visibleToClient: false, order: 12 },
];

router.get('/', requireAuth, adminOnly, async (req, res) => {
  const { clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId este obligatoriu.' });
  }

  try {
    const snapshot = await db.collection('projects')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = await Promise.all(snapshot.docs.map(async doc => {
      const progress = await getProjectProgress(doc.id);
      return serializeProject(doc, progress);
    }));

    res.json(projects);
  } catch (err) {
    console.error('GET /projects error:', err);
    res.status(500).json({ error: 'Eroare la obținerea proiectelor.' });
  }
});

router.get('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Proiectul nu există.' });
    }

    const progress = await getProjectProgress(req.params.id);
    res.json(serializeProject(doc, progress));
  } catch (err) {
    console.error('GET /projects/:id error:', err);
    res.status(500).json({ error: 'Eroare la obținerea proiectului.' });
  }
});

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { clientId, name, description, status } = req.body;

  if (!clientId || !name) {
    return res.status(400).json({ error: 'Câmpurile clientId și name sunt obligatorii.' });
  }

  try {
    const projectData = {
      clientId,
      name,
      description: description || '',
      status: status || 'active',
      createdAt: new Date(),
      createdBy: req.user.uid,
    };

    const docRef = await db.collection('projects').add(projectData);

    const batch = db.batch();
    const now = new Date();

    for (const task of STANDARD_TASKS) {
      const taskRef = db.collection('projects').doc(docRef.id).collection('checklist').doc();
      batch.set(taskRef, {
        title: task.title,
        category: task.category,
        status: 'pending',
        visibleToClient: task.visibleToClient,
        order: task.order,
        createdAt: now,
        completedAt: null,
        isCustom: false,
      });
    }

    await batch.commit();

    await logActivity({
      clientId,
      type: 'project_created',
      description: `Project "${name}" created`,
      createdBy: req.user.uid,
    });

    res.status(201).json({
      id: docRef.id,
      ...projectData,
      progress: { completed: 0, total: 12, percentage: 0 },
    });
  } catch (err) {
    console.error('POST /projects error:', err);
    res.status(500).json({ error: 'Eroare la crearea proiectului.' });
  }
});

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { name, description, status } = req.body;

  try {
    const docRef = db.collection('projects').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Proiectul nu există.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    updates.updatedAt = new Date();

    await docRef.update(updates);

    const progress = await getProjectProgress(req.params.id);
    res.json(serializeProject({ id: req.params.id, data: () => ({ ...doc.data(), ...updates }) }, progress));
  } catch (err) {
    console.error('PUT /projects/:id error:', err);
    res.status(500).json({ error: 'Eroare la actualizarea proiectului.' });
  }
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Proiectul nu există.' });
    }

    const checklistSnapshot = await db.collection('projects').doc(req.params.id).collection('checklist').get();

    const batch = db.batch();
    checklistSnapshot.docs.forEach(taskDoc => batch.delete(taskDoc.ref));
    batch.delete(db.collection('projects').doc(req.params.id));

    await batch.commit();

    res.json({ message: `Proiectul "${doc.data().name}" a fost șters.` });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err);
    res.status(500).json({ error: 'Eroare la ștergerea proiectului.' });
  }
});

async function getProjectProgress(projectId) {
  const snapshot = await db.collection('projects').doc(projectId).collection('checklist').get();
  const total = snapshot.size;
  const completed = snapshot.docs.filter(doc => doc.data().status === 'done').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

function serializeProject(doc, progress) {
  const data = typeof doc.data === 'function' ? doc.data() : doc.data;
  const id = doc.id || doc.id;
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    progress,
  };
}

const checklistRouter = require('./checklist');
router.use('/:id/checklist', checklistRouter);

module.exports = router;
