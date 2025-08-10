// Login Page JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const azureLoginBtn = document.getElementById("azureLoginBtn");
  const localLoginForm = document.getElementById("localLoginForm");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const errorMessage = document.querySelector(".error-message");
  const successMessage = document.querySelector(".success-message");

  // Handle Azure AD login
  if (azureLoginBtn) {
    azureLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showLoading();

      // Add a small delay to show the loading animation
      setTimeout(() => {
        window.location.href = "/auth/login-redirect";
      }, 300);
    });
  }

  // Handle local login form
  if (localLoginForm) {
    localLoginForm.addEventListener("submit", function (e) {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      // Basic validation
      if (!username || !password) {
        e.preventDefault();
        showError("Please enter both username and password.");
        return;
      }

      // Show loading if validation passes
      showLoading();
    });
  }

  // Input field enhancements
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="password"]'
  );
  inputs.forEach((input) => {
    // Add floating label effect
    input.addEventListener("focus", function () {
      this.parentNode.classList.add("focused");
    });

    input.addEventListener("blur", function () {
      if (!this.value.trim()) {
        this.parentNode.classList.remove("focused");
      }
    });

    // Clear error state on input
    input.addEventListener("input", function () {
      hideError();
      this.classList.remove("error");
    });
  });

  // Utility functions
  function showLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.add("show");
    }
  }

  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.remove("show");
    }
  }

  function showError(message) {
    hideLoading();
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.classList.add("show");

      // Auto-hide after 5 seconds
      setTimeout(() => {
        hideError();
      }, 5000);
    }
  }

  function hideError() {
    if (errorMessage) {
      errorMessage.classList.remove("show");
    }
  }

  function showSuccess(message) {
    hideLoading();
    if (successMessage) {
      successMessage.textContent = message;
      successMessage.classList.add("show");

      // Auto-hide after 3 seconds
      setTimeout(() => {
        hideSuccess();
      }, 3000);
    }
  }

  function hideSuccess() {
    if (successMessage) {
      successMessage.classList.remove("show");
    }
  }

  // Check for URL parameters on page load
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const success = urlParams.get("success");

    if (error) {
      showError(decodeURIComponent(error));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (success) {
      showSuccess(decodeURIComponent(success));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Initialize on page load
  checkUrlParams();
  hideLoading();

  // Enhanced form validation
  function validateForm() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    let isValid = true;

    // Reset previous error states
    inputs.forEach((input) => input.classList.remove("error"));

    // Validate username
    if (!username.value.trim()) {
      username.classList.add("error");
      isValid = false;
    }

    // Validate password
    if (!password.value.trim()) {
      password.classList.add("error");
      isValid = false;
    }

    return isValid;
  }

  // Handle keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Enter key on Azure login button
    if (e.key === "Enter" && document.activeElement === azureLoginBtn) {
      azureLoginBtn.click();
    }

    // Escape key to hide messages
    if (e.key === "Escape") {
      hideError();
      hideSuccess();
    }
  });

  // Add ripple effect to buttons
  function addRippleEffect() {
    const buttons = document.querySelectorAll(".btn");
    buttons.forEach((button) => {
      button.addEventListener("click", function (e) {
        const ripple = document.createElement("span");
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = x + "px";
        ripple.style.top = y + "px";
        ripple.classList.add("ripple");

        this.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // Initialize ripple effects
  addRippleEffect();

  // Feature items hover animation
  const featureItems = document.querySelectorAll(".feature-item");
  featureItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.1}s`;
    item.classList.add("animate-in");
  });

  // Auto-focus on username field if no error messages
  setTimeout(() => {
    if (!errorMessage || !errorMessage.classList.contains("show")) {
      const usernameField = document.getElementById("username");
      if (usernameField) {
        usernameField.focus();
      }
    }
  }, 500);

  // Handle connection issues
  window.addEventListener("online", function () {
    showSuccess("Connection restored.");
  });

  window.addEventListener("offline", function () {
    showError("No internet connection. Please check your network.");
  });

  // Prevent form submission on network errors
  if (!navigator.onLine) {
    showError("No internet connection. Please check your network.");
  }
});

// CSS animations for feature items
const style = document.createElement("style");
style.textContent = `
  .feature-item {
    opacity: 0;
    transform: translateY(20px);
  }
  
  .feature-item.animate-in {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  input.error {
    border-color: #dc3545 !important;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
  }
  
  .form-group.focused label {
    color: #667eea;
    transform: translateY(-2px);
    font-size: 0.85rem;
  }
`;
document.head.appendChild(style);
