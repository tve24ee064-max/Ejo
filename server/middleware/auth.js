export function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

export function requireWorker(req, res, next) {
  if (!req.session.user || req.session.user.role !== "worker") {
    return res.status(403).json({ error: "Worker access only" });
  }
  next();
}