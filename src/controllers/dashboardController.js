const websiteService = require("../services/websiteService");
const workingSiteService = require("../services/workingSiteService");
const { getInitials } = require("../utils/helpers");

const showDashboard = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    const websites = await websiteService.getAllWebsites();
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    res.render("pages/dashboard", {
      title: "Dashboard",
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
      websites: websites,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.render("pages/dashboard", {
      title: "Dashboard",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "User",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "User"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "unknown",
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: null,
      websites: [],
    });
  }
};

module.exports = {
  showDashboard,
};
