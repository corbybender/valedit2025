const validateWebsiteData = (websiteData) => {
  const errors = [];

  if (!websiteData.domain || websiteData.domain.trim().length < 3) {
    errors.push("Domain must be at least 3 characters long");
  }

  // Basic domain validation
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  if (websiteData.domain && !domainRegex.test(websiteData.domain.trim())) {
    errors.push("Domain must be a valid domain name");
  }

  if (websiteData.description && websiteData.description.length > 500) {
    errors.push("Description must be less than 500 characters");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

const validateWebsiteUpdate = (websiteData) => {
  const errors = [];

  if (websiteData.domain && websiteData.domain.trim().length < 3) {
    errors.push("Domain must be at least 3 characters long");
  }

  // Basic domain validation
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  if (websiteData.domain && !domainRegex.test(websiteData.domain.trim())) {
    errors.push("Domain must be a valid domain name");
  }

  if (websiteData.description && websiteData.description.length > 500) {
    errors.push("Description must be less than 500 characters");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

module.exports = {
  validateWebsiteData,
  validateWebsiteUpdate,
};
