const { validateEmail } = require("../utils/helpers");

const validateUserData = (userData) => {
  const errors = [];

  if (!userData.authorLogin || userData.authorLogin.trim().length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  if (!userData.authorName || userData.authorName.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!userData.authorEmail || !validateEmail(userData.authorEmail)) {
    errors.push("Valid email address is required");
  }

  if (
    userData.authorPassword !== undefined &&
    userData.authorPassword.length < 6
  ) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

const validateUserUpdate = (userData) => {
  const errors = [];

  if (userData.authorLogin && userData.authorLogin.trim().length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  if (userData.authorName && userData.authorName.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (userData.authorEmail && !validateEmail(userData.authorEmail)) {
    errors.push("Valid email address is required");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

module.exports = {
  validateUserData,
  validateUserUpdate,
};
