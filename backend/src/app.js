require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'ClientPortal Backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/clients', require('./routes/clients'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/files', require('./routes/files'));
app.use('/api/activity', require('./routes/activity'));

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} nu există.` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fișierul depășește limita de 10MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 ClientPortal Backend rulează pe http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API base: http://localhost:${PORT}/api\n`);
});

module.exports = app;