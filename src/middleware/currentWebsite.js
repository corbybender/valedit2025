const workingSiteService = require("../services/workingSiteService");

// Ensure logger is available (it's set up globally in debug-logger.js)
const logger = global.logger || console;

const currentWebsiteMiddleware = async (req, res, next) => {
  try {
    const authorID = req.session.authorID;
    
    // DEBUG: Log what we have in session
    console.log("=== CURRENT WEBSITE MIDDLEWARE DEBUG ===");
    console.log("authorID from session:", authorID);
    console.log("req.session:", JSON.stringify(req.session, null, 2));
    
    if (authorID) {
      console.log("Calling workingSiteService.getCurrentWorkingSite with authorID:", authorID);
      const currentSite = await workingSiteService.getCurrentWorkingSite(
        authorID
      );
      console.log("getCurrentWorkingSite returned:", JSON.stringify(currentSite, null, 2));
      
      res.locals.currentWebsite = currentSite;
      res.locals.currentWebsiteID = currentSite
        ? currentSite.CurrentWorkingSite
        : null;
        
      console.log("Set res.locals.currentWebsite to:", JSON.stringify(currentSite, null, 2));

      // Add admin status to user object
      const isAdmin =
        req.session.userInfo?.IsAdmin ||
        req.session.userInfo?.isAdmin ||
        req.session.userInfo?.loginMethod === "azure" ||
        req.session.userInfo?.username === "admin";

      // Debug logging (remove this after testing)
      logger.debug("🔍 Admin Check Debug:", {
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
      console.log("No authorID found in session, setting currentWebsite to null");
      res.locals.currentWebsite = null;
      res.locals.currentWebsiteID = null;
      res.locals.user = null;
      res.locals.authorID = null;
    }
    
    console.log("Final res.locals.currentWebsite:", JSON.stringify(res.locals.currentWebsite, null, 2));
    console.log("========================================");
    
    next();
  } catch (error) {
    console.error("=== ERROR IN CURRENT WEBSITE MIDDLEWARE ===");
    console.error("Error:", error);
    console.error("============================================");
    
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