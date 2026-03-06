const { auth } = require('../lib/firebaseAdmin');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — lipsește token-ul de autentificare.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Token invalid:', err.message);
    return res.status(401).json({ error: 'Unauthorized — token invalid sau expirat.' });
  }
}

module.exports = { requireAuth };