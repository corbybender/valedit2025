/**
 * Megamenu JavaScript - Enhanced interactions and functionality
 */

document.addEventListener("DOMContentLoaded", function () {
  initializeMegamenu();
});

function initializeMegamenu() {
  // Handle dropdown interactions
  setupDropdownInteractions();

  // Handle mobile responsive behavior
  setupResponsiveHandling();

  // Handle search functionality
  setupSearchHandling();

  // Handle user dropdown
  setupUserDropdown();
}

/**
 * Setup dropdown hover and click interactions
 */
function setupDropdownInteractions() {
  const dropdownItems = document.querySelectorAll(
    ".megamenu-item.has-dropdown"
  );

  dropdownItems.forEach((item) => {
    const dropdown = item.querySelector(".megamenu-dropdown");
    let hoverTimeout;
    let isOpen = false;

    // Mouse enter - show dropdown
    item.addEventListener("mouseenter", function () {
      clearTimeout(hoverTimeout);
      if (!isOpen) {
        showDropdown(item, dropdown);
        isOpen = true;
      }
    });

    // Mouse leave - hide dropdown after delay
    item.addEventListener("mouseleave", function () {
      hoverTimeout = setTimeout(() => {
        hideDropdown(item, dropdown);
        isOpen = false;
      }, 150);
    });

    // Click handling for mobile
    item.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        if (isOpen) {
          hideDropdown(item, dropdown);
          isOpen = false;
        } else {
          // Close other open dropdowns
          closeAllDropdowns();
          showDropdown(item, dropdown);
          isOpen = true;
        }
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".megamenu-item.has-dropdown")) {
      closeAllDropdowns();
    }
  });
}

/**
 * Show dropdown with animation
 */
function showDropdown(item, dropdown) {
  dropdown.style.opacity = "1";
  dropdown.style.transform = "translateY(0)";
  dropdown.style.pointerEvents = "auto";
  item.classList.add("dropdown-open");
}

/**
 * Hide dropdown with animation
 */
function hideDropdown(item, dropdown) {
  dropdown.style.opacity = "0";
  dropdown.style.transform = "translateY(-10px)";
  dropdown.style.pointerEvents = "none";
  item.classList.remove("dropdown-open");
}

/**
 * Close all open dropdowns
 */
function closeAllDropdowns() {
  const openDropdowns = document.querySelectorAll(
    ".megamenu-item.has-dropdown"
  );
  openDropdowns.forEach((item) => {
    const dropdown = item.querySelector(".megamenu-dropdown");
    hideDropdown(item, dropdown);
  });
}

/**
 * Setup responsive behavior for mobile devices
 */
function setupResponsiveHandling() {
  let resizeTimeout;

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      handleResize();
    }, 250);
  });

  // Initial call
  handleResize();
}

function handleResize() {
  const isMobile = window.innerWidth <= 768;
  const nav = document.querySelector(".megamenu-nav");

  if (isMobile) {
    // Close all dropdowns on resize to mobile
    closeAllDropdowns();

    // Add mobile class for specific styling
    nav.classList.add("mobile-nav");
  } else {
    nav.classList.remove("mobile-nav");
  }
}

/**
 * Setup search functionality
 */
function setupSearchHandling() {
  const searchInput = document.querySelector(".megamenu-search input");

  if (searchInput) {
    // Search input focus/blur effects
    searchInput.addEventListener("focus", function () {
      this.parentElement.classList.add("search-focused");
    });

    searchInput.addEventListener("blur", function () {
      this.parentElement.classList.remove("search-focused");
    });

    // Handle search submission
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performSearch(this.value);
      }
    });

    // Real-time search suggestions (if needed)
    let searchTimeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (this.value.length > 2) {
          showSearchSuggestions(this.value);
        } else {
          hideSearchSuggestions();
        }
      }, 300);
    });
  }
}

/**
 * Perform search functionality
 */
function performSearch(query) {
  if (query.trim()) {
    console.log("Performing search for:", query);
    // Implement your search logic here
    // For example: window.location.href = `/search?q=${encodeURIComponent(query)}`;
  }
}

/**
 * Show search suggestions (placeholder for future implementation)
 */
function showSearchSuggestions(query) {
  // Implement search suggestions dropdown if needed
  console.log("Showing suggestions for:", query);
}

/**
 * Hide search suggestions
 */
function hideSearchSuggestions() {
  // Hide search suggestions dropdown
}

/**
 * Setup user dropdown functionality
 */
function setupUserDropdown() {
  const userAvatar = document.querySelector(".megamenu-user-avatar");

  if (userAvatar) {
    userAvatar.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleUserDropdown();
    });
  }
}

/**
 * Toggle user dropdown menu
 */
function toggleUserDropdown() {
  // This can be integrated with your existing user dropdown functionality
  // For now, just log the action
  console.log("User dropdown toggled");

  // Example: Show a simple user menu
  showUserMenu();
}

/**
 * Show user menu (example implementation)
 */
function showUserMenu() {
  // Check if user menu already exists
  let existingMenu = document.querySelector(".megamenu-user-dropdown");

  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  // Create user dropdown menu
  const userContainer = document.querySelector(".megamenu-user");
  const dropdown = document.createElement("div");
  dropdown.className = "megamenu-user-dropdown";
  dropdown.innerHTML = `
    <div class="user-menu-item">
      
    </div>
    <div class="user-menu-item">
      
    </div>
    <hr>
    <div class="user-menu-item logout">
      <i class="fas fa-sign-out-alt"></i>
      <span>Logout</span>
    </div>
  `;

  // Style the dropdown
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 180px;
    padding: 8px 0;
    z-index: 1002;
    margin-top: 8px;
  `;

  // Style menu items
  const menuItems = dropdown.querySelectorAll(".user-menu-item");
  menuItems.forEach((item) => {
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #64748b;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
    `;

    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#f8fafc";
      item.style.color = "#3b82f6";
    });

    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "transparent";
      item.style.color = "#64748b";
    });

    item.addEventListener("click", () => {
      const text = item.textContent.trim();
      console.log("User menu item clicked:", text);

      if (text === "Logout") {
        // Handle logout
        window.location.href = "/auth/logout";
      }

      dropdown.remove();
    });
  });

  userContainer.appendChild(dropdown);

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener("click", function closeUserMenu() {
      dropdown.remove();
      document.removeEventListener("click", closeUserMenu);
    });
  }, 100);
}

/**
 * Utility function to add CSS class with animation
 */
function addClassWithAnimation(element, className, duration = 300) {
  element.classList.add(className);
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
}

/**
 * Utility function to remove CSS class with animation
 */
function removeClassWithAnimation(element, className, duration = 300) {
  element.classList.remove(className);
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
}

// Export functions for external use if needed
window.MegaMenu = {
  closeAllDropdowns,
  toggleUserDropdown,
  performSearch,
};
