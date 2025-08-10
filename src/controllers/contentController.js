const workingSiteService = require("../services/workingSiteService");
const { getInitials } = require("../utils/helpers");

const showContentPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    res.render("pages/content", {
      title: "Content Blocks",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    });
  } catch (error) {
    console.error("Error loading content management page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load content management page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
};

const showImagesPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    res.render("pages/content-images", {
      title: "Images",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    });
  } catch (error) {
    console.error("Error loading images page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load images page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
};

const showDocumentsPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    res.render("pages/content-documents", {
      title: "Documents",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    });
  } catch (error) {
    console.error("Error loading documents page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load documents page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
};

const showTestContentDebug = async (req, res) => {
  try {
    res.render("pages/content", {
      title: "Content Management - Debug",
      user: {
        name: "Test User",
        initials: "TU",
        username: "test",
        loginMethod: "local",
        isAdmin: false,
      },
      currentWorkingSite: { CurrentWorkingSite: 0, WebsiteName: "Test Site" },
    });
  } catch (error) {
    console.error("Test content error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  showContentPage,
  showImagesPage,
  showDocumentsPage,
  showTestContentDebug,
};
