const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { db, storage } = require('../lib/firebaseAdmin');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { logActivity } = require('./activity');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tip fișier nepermis: ${file.mimetype}`));
    }
  },
});

router.post('/upload', requireAuth, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Lipsește fișierul.' });
  }

  const { clientId, description } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId este obligatoriu.' });
  }

  try {
    const fileId = uuidv4();
    const ext = req.file.originalname.split('.').pop();
    const storagePath = `clients/${clientId}/${fileId}.${ext}`;

    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user.uid,
          clientId,
        },
      },
    });

    const fileData = {
      clientId,
      fileId,
      originalName: req.file.originalname,
      storagePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      description: description || '',
      uploadedBy: req.user.uid,
      createdAt: new Date(),
    };

    const docRef = await db.collection('files').add(fileData);

    await logActivity({
      clientId,
      type: 'file_uploaded',
      description: `Fișier încărcat: ${req.file.originalname}`,
      createdBy: req.user.uid,
    });

    res.status(201).json({ id: docRef.id, ...fileData });
  } catch (err) {
    console.error('POST /files/upload error:', err);
    res.status(500).json({ error: 'Eroare la încărcarea fișierului.' });
  }
});

router.get('/:clientId', requireAuth, async (req, res) => {
  const { clientId } = req.params;

  if (req.user.role === 'client' && req.user.clientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  try {
    const snapshot = await db.collection('files')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .get();

    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Eroare la obținerea fișierelor.' });
  }
});

router.get('/:clientId/:fileId/download', requireAuth, async (req, res) => {
  const { clientId, fileId } = req.params;

  if (req.user.role === 'client' && req.user.clientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  try {
    const snapshot = await db.collection('files')
      .where('clientId', '==', clientId)
      .where('fileId', '==', fileId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Fișierul nu există.' });
    }

    const fileData = snapshot.docs[0].data();
    const bucket = storage.bucket();
    const file = bucket.file(fileData.storagePath);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    res.json({
      url: signedUrl,
      originalName: fileData.originalName,
      expiresIn: 3600,
    });
  } catch (err) {
    console.error('GET /files download error:', err);
    res.status(500).json({ error: 'Eroare la generarea link-ului de download.' });
  }
});

router.delete('/:clientId/:fileId', requireAuth, adminOnly, async (req, res) => {
  const { clientId, fileId } = req.params;

  try {
    const snapshot = await db.collection('files')
      .where('clientId', '==', clientId)
      .where('fileId', '==', fileId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Fișierul nu există.' });
    }

    const docData = snapshot.docs[0].data();

    const bucket = storage.bucket();
    await bucket.file(docData.storagePath).delete().catch(() => {});

    await snapshot.docs[0].ref.delete();

    res.json({ message: `Fișierul ${docData.originalName} a fost șters.` });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la ștergerea fișierului.' });
  }
});

module.exports = router;