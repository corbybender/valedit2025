const showTestNotifications = (req, res) => {
  res.render("pages/test-notifications", {
    user: null,
    currentWebsite: null,
    currentWebsiteID: null,
  });
};

const showDebugNotifications = (req, res) => {
  res.render("pages/debug-notifications", {
    user: { name: "Debug User", username: "debug", initials: "DU" },
    currentWebsite: null,
    currentWebsiteID: null,
  });
};

const showTestFixedNotifications = (req, res) => {
  res.render("pages/test-fixed-notifications", {
    user: { name: "Test User", username: "test", initials: "TU" },
    currentWebsite: null,
    currentWebsiteID: null,
  });
};

const showTestZIndex = (req, res) => {
  res.render("pages/test-z-index", {
    user: { name: "Z-Index Test", username: "ztest", initials: "ZT" },
    currentWebsite: null,
    currentWebsiteID: null,
  });
};

module.exports = {
  showTestNotifications,
  showDebugNotifications,
  showTestFixedNotifications,
  showTestZIndex,
};
