const workingSiteService = require("../services/workingSiteService");

// Ensure logger is available (it's set up globally in debug-logger.js)
const logger = global.logger || console;

const currentWebsiteMiddleware = async (req, res, next) => {
  try {
    const authorID = req.session.authorID;
    if (authorID) {
      const currentSite = await workingSiteService.getCurrentWorkingSite(
        authorID
      );
      res.locals.currentWebsite = currentSite;
      res.locals.currentWebsiteID = currentSite
        ? currentSite.CurrentWorkingSite
        : null;

      // Add admin status to user object
      const isAdmin =
        req.session.userInfo?.IsAdmin ||
        req.session.userInfo?.isAdmin ||
        req.session.userInfo?.loginMethod === "azure" ||
        req.session.userInfo?.username === "admin";

      // Debug logging (remove this after testing)
      logger.info("🔍 Admin Check Debug:", {
        userInfo: req.session.userInfo,
        IsAdmin: req.session.userInfo?.IsAdmin,
        isAdmin_lowercase: req.session.userInfo?.isAdmin,
        loginMethod: req.session.userInfo?.loginMethod,
        username: req.session.userInfo?.username,
        finalIsAdmin: isAdmin,
      });

      res.locals.user = {
        ...req.session.userInfo,
        isAdmin: isAdmin,
      };
      res.locals.authorID = authorID;
    } else {
      res.locals.currentWebsite = null;
      res.locals.currentWebsiteID = null;
      res.locals.user = null;
      res.locals.authorID = null;
    }
    next();
  } catch (error) {
    console.error("Error in currentWebsite middleware:", error);
    res.locals.currentWebsite = null;
    res.locals.currentWebsiteID = null;

    // Add admin status even in error case
    if (req.session.userInfo) {
      const isAdmin =
        req.session.userInfo?.IsAdmin ||
        req.session.userInfo?.isAdmin ||
        req.session.userInfo?.loginMethod === "azure" ||
        req.session.userInfo?.username === "admin";
      res.locals.user = {
        ...req.session.userInfo,
        isAdmin: isAdmin,
      };
    } else {
      res.locals.user = null;
    }
    res.locals.authorID = null;
    next();
  }
};

module.exports = currentWebsiteMiddleware;
