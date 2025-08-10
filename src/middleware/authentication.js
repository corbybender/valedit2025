const isAuthenticated = (req, res, next) => {
  logger.info("🔐 Auth Check:", {
    hasSession: !!req.session,
    hasUserInfo: !!req.session?.userInfo,
    authorID: req.session?.authorID,
    sessionID: req.sessionID,
    path: req.path,
    method: req.method,
    userAgent: req.get("User-Agent")?.substring(0, 50),
  });

  if (req.session?.userInfo) {
    // Touch the session to extend its life
    req.session.touch();
    logger.info("✅ User authenticated, session extended for path:", req.path);
    return next();
  }

  logger.info("❌ User not authenticated, path:", req.path);

  // For API routes, return JSON error instead of redirect
  if (req.path.startsWith("/api/")) {
    logger.info("🚫 API route - returning 401 JSON response");
    return res.status(401).json({ error: "User not authenticated" });
  }

  logger.info("🔄 Non-API route - redirecting to login");
  res.redirect("/auth/login");
};

const isAdmin = (req, res, next) => {
  const adminCheck =
    req.session.userInfo?.IsAdmin ||
    req.session.userInfo?.isAdmin ||
    req.session.userInfo?.loginMethod === "azure" ||
    req.session.userInfo?.username === "admin";

  if (!adminCheck) {
    return res.status(403).render("pages/error", {
      error: "Access denied - Administrator privileges required",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "User",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "User"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }

  next();
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

module.exports = {
  isAuthenticated,
  isAdmin,
  getInitials,
};
