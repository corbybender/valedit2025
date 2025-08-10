const appConfig = require("../config/app");

// 404 handler
const notFoundHandler = (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found" });
  } else {
    res.status(404).render("pages/error", {
      title: "Page Not Found",
      error: {
        status: 404,
        message: "The page you requested could not be found.",
      },
      user: req.session.userInfo || null,
    });
  }
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  logger.error("Application error", { error: err });
  res.status(err.status || 500).render("pages/error", {
    title: "Application Error",
    error: {
      status: err.status || 500,
      message: appConfig.isProduction
        ? "Something went wrong. Please try again."
        : err.message,
    },
    user: req.session.userInfo || null,
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
