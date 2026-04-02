function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized — nu ești autentificat.' });
  }

  if (req.user.admin !== true && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — această acțiune necesită rol de admin.' });
  }

  next();
}

module.exports = { adminOnly };