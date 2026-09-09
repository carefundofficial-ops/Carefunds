const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("./db");

function signUser(user, deviceTokenHash) {
  const sessionId=crypto.randomUUID();
  db.prepare("INSERT INTO login_sessions(session_id,user_id,device_token_hash) VALUES(?,?,?)").run(sessionId,user.id,deviceTokenHash||"");
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const session=db.prepare("SELECT id,user_id,revoked_at FROM login_sessions WHERE session_id=? AND user_id=?").get(req.user.sid,req.user.id);
    if(!session || session.revoked_at) return res.status(401).json({error:"Your session has ended. Please log in again."});
    db.prepare("UPDATE login_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").run(session.id);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { signUser, authRequired, roleRequired };
