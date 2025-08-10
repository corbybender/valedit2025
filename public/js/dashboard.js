// Logger fallback - ensure logger is always available
if (typeof window.logger === "undefined" || !window.logger) {
  window.logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ""),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ""),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ""),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ""),
    verbose: (msg, meta) => console.log(`[VERBOSE] ${msg}`, meta || ""),
  };
}

document.addEventListener("DOMContentLoaded", function () {
  // === GLOBAL NOTIFICATION SYSTEM INITIALIZATION ===
  logger.info("🔔 Dashboard.js: Initializing global notification system");

  // Ensure showNotification is globally available
  if (typeof showNotification !== "function") {
    console.warn("⚠️ showNotification not available, creating fallback");

    // Create a simple fallback notification function
    window.showNotification = function (message, type = "info", options = {}) {
      logger.info(`🔔 FALLBACK NOTIFICATION [${type.toUpperCase()}]:`, message);

      // Try to create a simple visual notification
      try {
        const notification = document.createElement("div");
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 2147483647;
          padding: 15px 20px; border-radius: 5px; color: white; font-family: Arial, sans-serif;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2); max-width: 300px;
          background: ${
            type === "success"
              ? "#28a745"
              : type === "error"
              ? "#dc3545"
              : "#007bff"
          };
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      } catch (error) {
        console.error("Failed to create fallback notification:", error);
      }
    };
  } else {
    logger.info("✅ showNotification is available globally");
  }

  // Make sure it's available on window object
  if (
    typeof window.showNotification !== "function" &&
    typeof showNotification === "function"
  ) {
    window.showNotification = showNotification;
    logger.info("✅ showNotification attached to window object");
  }

  // === SIDEBAR AND NAVIGATION LOGIC ===
  const navContainer = document.querySelector(".sidebar");

  if (!navContainer) return;

  // Key for storing menu state in localStorage
  const MENU_STATE_KEY = "menuState";

  // Function to get stored menu state
  function getMenuState() {
    try {
      const stored = localStorage.getItem(MENU_STATE_KEY);
      return stored
        ? JSON.parse(stored)
        : { pagesOpen: false, contentOpen: false };
    } catch (error) {
      console.warn("Error reading menu state from localStorage:", error);
      return { pagesOpen: false, contentOpen: false };
    }
  }

  // Function to save menu state
  function saveMenuState(state) {
    try {
      localStorage.setItem(MENU_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Error saving menu state to localStorage:", error);
    }
  }

  // Function to get menu identifier from element
  function getMenuIdentifier(menuItem) {
    const span = menuItem.querySelector("span");
    if (span && span.textContent.includes("Pages")) return "pagesOpen";
    if (span && span.textContent.includes("Content")) return "contentOpen";
    return null;
  }

  // Function to apply menu state to the DOM
  function applyMenuState(state) {
    const menuItems = navContainer.querySelectorAll(".nav-item.has-child");

    menuItems.forEach((menuItem) => {
      const childNav = menuItem.nextElementSibling;
      const identifier = getMenuIdentifier(menuItem);

      if (childNav && childNav.classList.contains("child-nav") && identifier) {
        if (state[identifier]) {
          menuItem.classList.add("menu-open");
          childNav.classList.add("open");
        } else {
          menuItem.classList.remove("menu-open");
          childNav.classList.remove("open");
        }
      }
    });
  }

  // Initialize menu state on page load
  const currentState = getMenuState();
  applyMenuState(currentState);

  // Handle menu clicks
  navContainer.addEventListener("click", function (event) {
    const link = event.target.closest("a.nav-item");
    if (!link) return;

    if (link.classList.contains("has-child")) {
      event.preventDefault();

      // Get menu identifier
      const identifier = getMenuIdentifier(link);
      if (!identifier) return;

      // Toggle menu open state
      const isCurrentlyOpen = link.classList.contains("menu-open");
      const willBeOpen = !isCurrentlyOpen;

      // Update DOM
      link.classList.toggle("menu-open");

      // Toggle visibility of child nav (assumes it's the next sibling)
      const childNav = link.nextElementSibling;
      if (childNav && childNav.classList.contains("child-nav")) {
        childNav.classList.toggle("open");
      }

      // Save the new state
      const newState = getMenuState();
      newState[identifier] = willBeOpen;
      saveMenuState(newState);
    }
  });

  // ============================================================================
  // SIDEBAR COLLAPSE/EXPAND FUNCTIONALITY
  // ============================================================================

  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const toggleIcon = sidebarToggle ? sidebarToggle.querySelector("i") : null;

  // Key for storing sidebar state
  const SIDEBAR_STATE_KEY = "sidebarCollapsed";

  // Function to get stored sidebar state
  function getSidebarState() {
    try {
      return localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
    } catch (error) {
      console.warn("Error reading sidebar state from localStorage:", error);
      return false;
    }
  }

  // Function to save sidebar state
  function saveSidebarState(collapsed) {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, collapsed.toString());
    } catch (error) {
      console.warn("Error saving sidebar state to localStorage:", error);
    }
  }

  // Function to toggle sidebar
  function toggleSidebar() {
    if (!sidebar) return;

    const isCollapsed = document.body.classList.contains("sidebar-collapsed");

    if (isCollapsed) {
      // Expand sidebar
      document.body.classList.remove("sidebar-collapsed");
      if (toggleIcon) {
        toggleIcon.className = "fas fa-chevron-left";
      }
      saveSidebarState(false);
      logger.info("Sidebar expanded");
    } else {
      // Collapse sidebar
      document.body.classList.add("sidebar-collapsed");
      if (toggleIcon) {
        toggleIcon.className = "fas fa-chevron-right";
      }
      saveSidebarState(true);
      logger.info("Sidebar collapsed");
    }
  }

  // Apply stored sidebar state on page load
  function applySidebarState() {
    const isCollapsed = getSidebarState();
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
      if (toggleIcon) {
        toggleIcon.className = "fas fa-chevron-right";
      }
    }
  }

  // Initialize sidebar state
  applySidebarState();

  // Add event listener for sidebar toggle
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }

  // ============================================================================
  // FONT SIZE CONTROL FUNCTIONALITY
  // ============================================================================

  const FONT_SIZE_KEY = "dashboardFontSize";

  // Apply stored font size on page load
  function applyStoredFontSize() {
    const storedSize = localStorage.getItem(FONT_SIZE_KEY);
    if (storedSize) {
      document.documentElement.style.fontSize = storedSize + "px";
      logger.info("Applied stored font size:", storedSize + "px");
    }
  }

  // Change font size
  function changePageFontSize(delta) {
    const root = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(root).fontSize);
    const newSize = Math.max(12, Math.min(20, currentSize + delta)); // Limit between 12px and 20px
    root.style.fontSize = newSize + "px";
    localStorage.setItem(FONT_SIZE_KEY, newSize);

    // Show current font size briefly
    showFontSizeIndicator(newSize);
    logger.info("Font size changed to:", newSize + "px");
  }

  // Show font size indicator (visual feedback)
  function showFontSizeIndicator(size) {
    // Remove existing indicator
    const existing = document.querySelector(".font-size-indicator");
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement("div");
    indicator.className = "font-size-indicator";
    indicator.textContent = `Font Size: ${size}px`;
    document.body.appendChild(indicator);

    // Fade out after 1.5 seconds
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => indicator.remove(), 300);
    }, 1500);
  }

  // Event listeners for font controls
  const decreaseBtn = document.getElementById("decrease-font-btn");
  const increaseBtn = document.getElementById("increase-font-btn");

  if (decreaseBtn) {
    decreaseBtn.addEventListener("click", () => {
      changePageFontSize(-1);
      logger.info("Font size decreased");
    });
  }

  if (increaseBtn) {
    increaseBtn.addEventListener("click", () => {
      changePageFontSize(1);
      logger.info("Font size increased");
    });
  }

  // Apply stored font size on page load
  applyStoredFontSize();

  // Optional: Add keyboard shortcuts for font size
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        changePageFontSize(1);
      } else if (e.key === "-") {
        e.preventDefault();
        changePageFontSize(-1);
      }
    }
  });

  // ============================================================================
  // DEBUG FUNCTIONS (GLOBAL SCOPE)
  // ============================================================================

  // Optional: Add a function to reset menu state (useful for debugging)
  window.resetMenuState = function () {
    const defaultState = { pagesOpen: false, contentOpen: false };
    saveMenuState(defaultState);
    applyMenuState(defaultState);
    logger.info("Menu state reset to default");
  };

  // Optional: Add a function to get current menu state (useful for debugging)
  window.getMenuState = function () {
    return getMenuState();
  };

  // Font size debug functions
  window.increaseFontSize = function () {
    changePageFontSize(1);
  };

  window.decreaseFontSize = function () {
    changePageFontSize(-1);
  };

  window.resetFontSize = function () {
    localStorage.removeItem(FONT_SIZE_KEY);
    document.documentElement.style.fontSize = "";
    logger.info("Font size reset to default");
  };

  // ============================================================================
  // USER DROPDOWN MENU FUNCTIONALITY
  // ============================================================================

  const userAvatarButton = document.getElementById("user-avatar-button");
  const userDropdown = document.getElementById("user-dropdown");

  if (userAvatarButton && userDropdown) {
    // Toggle dropdown when avatar is clicked
    userAvatarButton.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = userDropdown.style.display === "block";

      if (isVisible) {
        hideUserDropdown();
      } else {
        showUserDropdown();
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (
        !userDropdown.contains(e.target) &&
        !userAvatarButton.contains(e.target)
      ) {
        hideUserDropdown();
      }
    });

    // Hide dropdown when pressing Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && userDropdown.style.display === "block") {
        hideUserDropdown();
      }
    });

    function showUserDropdown() {
      userDropdown.style.display = "block";
      userAvatarButton.style.transform = "scale(1.05)";
      userAvatarButton.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
    }

    function hideUserDropdown() {
      userDropdown.style.display = "none";
      userAvatarButton.style.transform = "";
      userAvatarButton.style.boxShadow = "";
    }
  }
});
