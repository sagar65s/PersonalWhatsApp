const jwt = require("jsonwebtoken");

function verifyToken(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload?.userId) return res.status(401).json({ message: "Authentication required" });
  req.userId = payload.userId;
  next();
}

module.exports = { auth, verifyToken };
