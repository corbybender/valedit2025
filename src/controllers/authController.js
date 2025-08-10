const authService = require("../services/authService");
const NotificationService = require("../services/notificationService");

const showLoginPage = (req, res) => {
  if (req.session.userInfo) {
    return res.redirect("/dashboard");
  }

  res.render("pages/login", {
    title: "Login",
    azureEnabled: authService.isAzureConfigured,
    error: req.query.error || null,
  });
};

const handleLocalLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.redirect(
        "/auth/login?error=Please provide both username and password"
      );
    }

    const result = await authService.authenticateLocal(username, password);

    if (result.success) {
      req.session.userInfo = result.user;
      req.session.authorID = result.user.authorID;
      logger.info("✅ Local login successful:", result.user.username);

      // Create success notification (after session is established)
      await NotificationService.notifyAuthAction({
        req,
        action: "Login",
        success: true,
        additionalInfo: "Local authentication",
      });

      return res.redirect("/dashboard");
    } else {
      // Create error notification for failed login
      await NotificationService.createNotification({
        userId: null, // No user ID available for failed login
        title: "Login Failed",
        message: `Local authentication failed: ${result.message}`,
        type: "error",
        category: "authentication",
      });

      return res.redirect(
        `/auth/login?error=${encodeURIComponent(result.message)}`
      );
    }
  } catch (error) {
    console.error("Local login error:", error);
    return res.redirect("/auth/login?error=Login failed. Please try again.");
  }
};

const initiateAzureLogin = async (req, res) => {
  try {
    if (!authService.isAzureConfigured) {
      return res.redirect(
        "/auth/login?error=Azure authentication not configured"
      );
    }

    const authUrl = await authService.getAzureAuthUrl(req);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Azure login initiation error:", error);
    res.redirect("/auth/login?error=Azure login failed");
  }
};

const handleAzureCallback = async (req, res) => {
  try {
    if (!req.query.code) {
      return res.redirect("/auth/login?error=Azure authentication failed");
    }

    const result = await authService.handleAzureCallback(req);

    if (result.success) {
      req.session.userInfo = result.user;
      req.session.authorID = result.user.authorID;
      logger.info("✅ Azure login successful:", result.user.username);

      // Create success notification (after session is established)
      await NotificationService.notifyAuthAction({
        req,
        action: "Login",
        success: true,
        additionalInfo: "Azure authentication",
      });

      return res.redirect("/dashboard");
    } else {
      // Create error notification for failed Azure login
      await NotificationService.createNotification({
        userId: null, // No user ID available for failed login
        title: "Azure Login Failed",
        message: "Azure authentication failed",
        type: "error",
        category: "authentication",
      });

      return res.redirect("/auth/login?error=Azure authentication failed");
    }
  } catch (error) {
    console.error("Azure callback error:", error);
    return res.redirect("/auth/login?error=Azure authentication failed");
  }
};

const handleLogout = async (req, res) => {
  // Create logout notification before destroying session
  await NotificationService.notifyAuthAction({
    req,
    action: "Logout",
    success: true,
  });

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/auth/login");
  });
};

module.exports = {
  showLoginPage,
  handleLocalLogin,
  initiateAzureLogin,
  handleAzureCallback,
  handleLogout,
};
