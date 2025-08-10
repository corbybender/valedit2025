const websiteService = require("../services/websiteService");
const workingSiteService = require("../services/workingSiteService");
const { getInitials } = require("../utils/helpers");

const showWebsitesPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    res.render("pages/websites", {
      title: "Websites",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: res.locals.currentWebsite,
      authorID: authorID,
    });
  } catch (error) {
    console.error("Error loading websites page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load websites page",
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

const getAllWebsites = async (req, res) => {
  try {
    const websites = await websiteService.getAllWebsites();
    res.json(websites);
  } catch (error) {
    console.error("Error fetching websites:", error);
    res.status(500).json({ error: "Failed to fetch websites" });
  }
};

const getWebsiteById = async (req, res) => {
  try {
    const { id } = req.params;
    const website = await websiteService.getWebsiteById(id);

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    res.json(website);
  } catch (error) {
    console.error("Error fetching website:", error);
    res.status(500).json({ error: "Failed to fetch website" });
  }
};

const createWebsite = async (req, res) => {
  try {
    const websiteData = req.body;
    const newWebsite = await websiteService.createWebsite(websiteData);
    res.status(201).json(newWebsite);
  } catch (error) {
    console.error("Error creating website:", error);
    res.status(500).json({ error: "Failed to create website" });
  }
};

const updateWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const websiteData = req.body;
    const success = await websiteService.updateWebsite(id, websiteData);

    if (success) {
      res.json({ message: "Website updated successfully" });
    } else {
      res.status(404).json({ error: "Website not found" });
    }
  } catch (error) {
    console.error("Error updating website:", error);
    res.status(500).json({ error: "Failed to update website" });
  }
};

const deleteWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await websiteService.deleteWebsite(id);

    if (success) {
      res.json({ message: "Website deleted successfully" });
    } else {
      res.status(404).json({ error: "Website not found" });
    }
  } catch (error) {
    console.error("Error deleting website:", error);
    res.status(500).json({ error: "Failed to delete website" });
  }
};

const setWorkingSite = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res
        .status(400)
        .json({ success: false, message: "User session invalid" });
    }
    const websiteID = req.body.websiteID ? parseInt(req.body.websiteID) : null;
    const success = await workingSiteService.setCurrentWorkingSite(
      authorID,
      websiteID
    );
    if (success) {
      res.json({ success: true, message: "Working site updated successfully" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Failed to update working site" });
    }
  } catch (error) {
    console.error("Error setting working site:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getCurrentWorkingSite = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res
        .status(400)
        .json({ success: false, message: "User session invalid" });
    }
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );
    res.json({ success: true, currentSite });
  } catch (error) {
    console.error("Error getting current working site:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const switchToSite = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(400).send("User session invalid");
    }
    const websiteID = req.body.websiteID ? parseInt(req.body.websiteID) : null;
    const redirectURL = req.body.redirectURL || "/dashboard";
    const success = await workingSiteService.setCurrentWorkingSite(
      authorID,
      websiteID
    );
    if (success) {
      res.redirect(redirectURL);
    } else {
      res.status(500).send("Failed to switch working site");
    }
  } catch (error) {
    console.error("Error switching working site:", error);
    res.status(500).send("Server error");
  }
};

const getAllUsersWorkingSites = async (req, res) => {
  try {
    const usersWorkingSites =
      await workingSiteService.getAllUsersWorkingSites();
    res.json({ success: true, users: usersWorkingSites });
  } catch (error) {
    console.error("Error getting all users working sites:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  showWebsitesPage,
  getAllWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  setWorkingSite,
  getCurrentWorkingSite,
  switchToSite,
  getAllUsersWorkingSites,
};
