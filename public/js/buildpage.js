// public/js/buildpage.js
// Version: 2025-01-27-15:30 - Fixed variable conflicts

// Logger fallback - ensure logger is always available
if (typeof window.logger === 'undefined' || !window.logger) {
  window.logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ''),
    verbose: (msg, meta) => console.log(`[VERBOSE] ${msg}`, meta || '')
  };
}

document.addEventListener("DOMContentLoaded", function () {
  logger.info("🚀 BUILDPAGE.JS LOADING - DOMContentLoaded fired");
  
  // Check if essential libraries are loaded
  logger.debug("📚 Library availability check:");
  logger.debug("  - jQuery:", typeof $ !== 'undefined' ? '✅' : '❌');
  logger.debug("  - Sortable:", typeof Sortable !== 'undefined' ? '✅' : '❌');
  logger.debug("  - window.logger:", typeof window.logger !== 'undefined' ? '✅' : '❌');
  logger.debug("📊 Initial data check:");
  logger.debug(
    "  - initialPageData:",
    typeof initialPageData !== "undefined" ? initialPageData : "UNDEFINED"
  );
  logger.debug(
    "  - currentWebsite:",
    typeof currentWebsite !== "undefined" ? currentWebsite : "UNDEFINED"
  );
  logger.debug(
    "  - currentWorkingSite:",
    typeof currentWorkingSite !== "undefined" ? currentWorkingSite : "UNDEFINED"
  );

  // This script assumes the following variables are available globally from the EJS template:
  // const initialPageData = <...>;
  // const currentWebsite = <...>;

  // --- State Variables ---
  let currentPageId = null;
  let currentlyEditingBlockId = null;
  let currentPageInfo = {};

  // --- Page Element Variables ---
  logger.debug("🔍 Finding page elements...");
  const createPageBtn = document.getElementById("create-page-btn");
  const savePageBtn = document.getElementById("save-page-btn");
  const viewPageBtn = document.getElementById("view-page-btn");
  const websiteSelector = document.getElementById("website-selector");
  const parentPathSelector = document.getElementById("parent-path-selector");
  const pageNameInput = document.getElementById("page-name-input");
  const layoutSelector = document.getElementById("layout-selector");
  const editorModal = document.getElementById("editor-modal");
  const htmlEditor = document.getElementById("html-editor");
  const cssEditor = document.getElementById("css-editor");
  const jsEditor = document.getElementById("js-editor");
  const saveBlockBtn = document.getElementById("save-block-changes");
  const cancelEditBtn = document.getElementById("cancel-edit");
  const canvasArea = document.getElementById("canvas-area");
  const canvasTitle = document.getElementById("canvas-title");
  const allCards = document.querySelectorAll(".template-card");
  const setFilter = document.getElementById("template-set-filter");
  const categoryFilter = document.getElementById("category-filter");
  const pageUrlSlugInput = document.getElementById("page-url-slug");
  const sharedBlocksSelector = document.getElementById(
    "shared-blocks-selector"
  );
  const sharedBlocksContainer = document.getElementById(
    "shared-blocks-container"
  );

  // New Shared Block Modal Elements
  const newSharedBlockBtn = document.getElementById("new-shared-block-btn");
  const newSharedBlockModal = document.getElementById("new-shared-block-modal");
  const newSharedBlockClose = document.getElementById("new-shared-block-close");
  const cancelNewSharedBlock = document.getElementById(
    "cancel-new-shared-block"
  );
  const saveNewSharedBlock = document.getElementById("save-new-shared-block");
  const sharedBlockNameInput = document.getElementById("shared-block-name");
  const sharedBlockDescriptionInput = document.getElementById(
    "shared-block-description"
  );
  const sharedHtmlEditor = document.getElementById("shared-html-editor");
  const sharedCssEditor = document.getElementById("shared-css-editor");
  const sharedJsEditor = document.getElementById("shared-js-editor");

  logger.debug("📋 Element check results:");
  logger.debug("  - createPageBtn:", !!createPageBtn);
  logger.debug("  - savePageBtn:", !!savePageBtn);
  logger.debug("  - parentPathSelector:", !!parentPathSelector);
  logger.debug("  - pageNameInput:", !!pageNameInput);
  logger.debug("  - layoutSelector:", !!layoutSelector);
  logger.debug("  - canvasArea:", !!canvasArea);
  logger.debug("  - canvasTitle:", !!canvasTitle);
  logger.debug("  - allCards count:", allCards.length);

  // --- Initialize Draggable Lists ---
  // Check if Sortable library is available with retry mechanism
  function initializeDragAndDrop() {
    if (typeof Sortable === 'undefined') {
      logger.warn("⚠️ Sortable library not yet loaded, waiting...");
      setTimeout(() => {
        if (typeof Sortable === 'undefined') {
          logger.error("❌ Sortable library failed to load! CDN may be unreachable.");
          console.error("❌ Sortable library is not loaded! Check if SortableJS CDN is accessible.");
          console.error("💡 Try refreshing the page or check your internet connection.");
          if (typeof showNotification === 'function') {
            showNotification("Drag and drop functionality unavailable. Please refresh the page.", "error", { timeout: 10000 });
          } else {
            alert("Drag and drop functionality unavailable. Please refresh the page.");
          }
          return;
        } else {
          logger.debug("✅ Sortable library loaded on retry");
          setupSortableElements();
        }
      }, 1000); // Wait 1 second and try again
      return;
    }
    
    logger.debug("✅ Sortable library is available");
    setupSortableElements();
  }
  
  function setupSortableElements() {
    logger.debug("🎯 Setting up sortable elements...");
    
    if (document.getElementById("template-list")) {
      logger.debug("✅ Initializing template-list sortable");
      new Sortable(document.getElementById("template-list"), {
        group: { name: "shared", pull: "clone", put: false },
        sort: false,
        animation: 150,
      });
    } else {
      logger.warn("⚠️ template-list element not found");
    }

    // Initialize Empty Content Block draggable
    if (document.querySelector(".empty-block-container")) {
      logger.debug("✅ Initializing empty-block-container sortable");
      new Sortable(document.querySelector(".empty-block-container"), {
        group: { name: "shared", pull: "clone", put: false },
        sort: false,
        animation: 150,
      });
    } else {
      logger.warn("⚠️ empty-block-container element not found");
    }
    
    logger.debug("✅ Sortable elements setup completed");
  }
  
  // Initialize drag and drop
  initializeDragAndDrop();

  // --- Event Listeners ---
  logger.debug("🎯 Setting up event listeners...");
  if (createPageBtn) {
    logger.debug("✅ Adding click listener to Create Page button");
    createPageBtn.addEventListener("click", handleCreatePage);
  } else {
    logger.debug("❌ Create Page button not found!");
  }

  if (savePageBtn) savePageBtn.addEventListener("click", handleSavePage);
  if (viewPageBtn) viewPageBtn.addEventListener("click", handleViewPage);
  if (canvasArea) canvasArea.addEventListener("click", handleCanvasClick);
  if (saveBlockBtn) saveBlockBtn.addEventListener("click", handleSaveBlock);
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditor);
  if (pageNameInput) pageNameInput.addEventListener("input", updatePageUrlSlug);
  if (sharedBlocksSelector)
    sharedBlocksSelector.addEventListener("change", handleSharedBlockSelection);

  // Metadata Modal Event Listeners
  const metadataBtn = document.getElementById("metadata-btn");
  const metadataModal = document.getElementById("metadata-modal");
  const metadataClose = document.getElementById("metadata-close");
  const saveMetadataBtn = document.getElementById("save-metadata");

  if (metadataBtn) {
    logger.debug("✅ Adding click listener to Metadata button");
    metadataBtn.addEventListener("click", openMetadataModal);
  }
  if (metadataClose) {
    metadataClose.addEventListener("click", closeMetadataModal);
  }
  if (saveMetadataBtn) {
    saveMetadataBtn.addEventListener("click", handleSaveMetadata);
  }
  // Close modal when clicking outside
  if (metadataModal) {
    metadataModal.addEventListener("click", function(e) {
      if (e.target === metadataModal) {
        closeMetadataModal();
      }
    });
  }

  // Add Alternative URL button handler
  const addAlternativeUrlBtn = document.getElementById("add-alternative-url");
  if (addAlternativeUrlBtn) {
    addAlternativeUrlBtn.addEventListener("click", function() {
      const container = document.getElementById("alternative-urls-container");
      if (container) {
        const newUrlDiv = document.createElement("div");
        newUrlDiv.className = "alternative-url-input";
        newUrlDiv.innerHTML = `
          <input
            type="text"
            class="alternative-url-field"
            placeholder="/alternative-title"
          />
          <button type="button" class="remove-url-btn">
            <i class="fas fa-trash"></i>
          </button>
        `;
        container.appendChild(newUrlDiv);
        
        // Setup handlers for the new elements
        setupAlternativeUrlHandlers();
        updateRemoveButtonStates();
        
        // Focus on the new input
        const newInput = newUrlDiv.querySelector(".alternative-url-field");
        if (newInput) newInput.focus();
      }
    });
  }

  // New Shared Block Modal Event Listeners
  if (newSharedBlockBtn)
    newSharedBlockBtn.addEventListener("click", openNewSharedBlockModal);
  if (newSharedBlockClose)
    newSharedBlockClose.addEventListener("click", closeNewSharedBlockModal);
  if (cancelNewSharedBlock)
    cancelNewSharedBlock.addEventListener("click", closeNewSharedBlockModal);
  if (saveNewSharedBlock)
    saveNewSharedBlock.addEventListener("click", handleSaveNewSharedBlock);

  // --- Editor Tab Event Listeners ---
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((button) => {
    button.addEventListener("click", handleTabClick);
  });

  // --- Toolbar Helper Event Listeners ---
  document.addEventListener("click", handleToolbarClick);

  // --- Debug Notification System ---
  logger.debug("🔔 DEBUG: Checking notification system on buildpage...");
  logger.debug("🔔 DEBUG: showNotification exists:", typeof showNotification);
  logger.debug(
    "🔔 DEBUG: notificationManager exists:",
    typeof notificationManager
  );
  logger.debug(
    "🔔 DEBUG: header-actions exists:",
    !!document.querySelector(".header-actions")
  );
  logger.debug(
    "🔔 DEBUG: notificationContainer exists:",
    !!document.querySelector("#notificationContainer")
  );

  // Add debugging function to test notification system
  window.testNotifications = function () {
    logger.debug("🧪 TESTING: Manual notification test...");
    if (typeof showNotification === "function") {
      showNotification("Test notification from buildpage", "success", {
        title: "Test",
      });
      logger.debug("🧪 TESTING: Notification sent");
    } else {
      console.error("🧪 TESTING: showNotification function not available");
    }

  };

  // --- Comprehensive Notification System (check after short delay to allow notifications.js to load) ---
  setTimeout(() => {
    logger.debug(
      "🔔 DELAYED CHECK: showNotification exists:",
      typeof showNotification
    );
    logger.debug(
      "🔔 DELAYED CHECK: notificationManager exists:",
      typeof notificationManager
    );

    if (typeof showNotification === "undefined") {
      logger.debug("🔔 FALLBACK: Creating comprehensive notification system...");

      // Create bell icon manually
      // Toggle notification dropdown
      const toggleNotificationDropdown = async () => {
        const existingDropdown = document.querySelector(
          ".notification-dropdown"
        );

        if (existingDropdown) {
          existingDropdown.remove();
          return;
        }

        // Create dropdown
        const dropdown = document.createElement("div");
        dropdown.className = "notification-dropdown";
        dropdown.style.cssText = `
        position: absolute; top: 100%; right: 0; background: white; border: 1px solid #ddd;
        border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 300px; max-height: 400px;
        overflow-y: auto; z-index: 10000;
      `;

        // Add loading state
        dropdown.innerHTML =
          '<div style="padding: 16px; text-align: center; color: #666;">Loading notifications...</div>';

        const bellContainer = document.querySelector(
          ".notification-bell-container"
        );
        if (bellContainer) {
          bellContainer.style.position = "relative";
          bellContainer.appendChild(dropdown);
        }

        try {
          // Fetch notifications from API
          const response = await fetch(
            `/api/notifications?websiteId=${websiteId}`
          );
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const notifications = await response.json();

          if (notifications.length === 0) {
            dropdown.innerHTML =
              '<div style="padding: 16px; text-align: center; color: #666;">No notifications</div>';
          } else {
            // Display notifications
            dropdown.innerHTML = `
            <div style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">
              Notifications (${notifications.length})
            </div>
            ${notifications
              .map(
                (notification) => `
              <div style="padding: 12px; border-bottom: 1px solid #f0f0f0; ${
                notification.isRead ? "opacity: 0.6;" : ""
              }" data-id="${notification.id}">
                <div style="font-weight: ${
                  notification.isRead ? "normal" : "bold"
                }; color: #333; margin-bottom: 4px;">
                  ${notification.title}
                </div>
                <div style="color: #666; font-size: 13px; margin-bottom: 4px;">
                  ${notification.message}
                </div>
                <div style="color: #999; font-size: 11px;">
                  ${new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
            `
              )
              .join("")}
            <div style="padding: 12px; text-align: center;">
              <button onclick="markAllNotificationsRead()" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                Mark All Read
              </button>
            </div>
          `;
          }
        } catch (error) {
          console.error("❌ Failed to fetch notifications:", error);
          dropdown.innerHTML =
            '<div style="padding: 16px; text-align: center; color: #dc3545;">Failed to load notifications</div>';
        }

        // Close dropdown when clicking outside
        setTimeout(() => {
          document.addEventListener("click", function closeDropdown(e) {
            if (!bellContainer.contains(e.target)) {
              dropdown.remove();
              document.removeEventListener("click", closeDropdown);
            }
          });
        }, 100);
      };

      // Mark all notifications as read
      window.markAllNotificationsRead = async () => {
        try {
          const response = await fetch(
            `/api/notifications/mark-all-read?websiteId=${websiteId}`,
            {
              method: "POST",
            }
          );

          if (response.ok) {
            // Update UI - hide badge and refresh dropdown
            const badge = document.getElementById("notification-badge");
            if (badge) {
              badge.style.display = "none";
              badge.textContent = "0";
            }

            // Close and reopen dropdown to refresh content
            const dropdown = document.querySelector(".notification-dropdown");
            if (dropdown) {
              dropdown.remove();
              toggleNotificationDropdown();
            }

            logger.debug("✅ All notifications marked as read");
          }
        } catch (error) {
          console.error("❌ Failed to mark notifications as read:", error);
        }
      };


      // Create notification function with database logging
      window.showNotification = async function (
        message,
        type = "info",
        options = {}
      ) {
        logger.info(
          `🔔 FALLBACK Notification [${type.toUpperCase()}]:`,
          message
        );

        // Create visual notification
        const notification = document.createElement("div");
        notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; border-radius: 6px; color: white; font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px; font-size: 14px;
        background: ${
          type === "success"
            ? "#28a745"
            : type === "error"
            ? "#dc3545"
            : type === "warning"
            ? "#ffc107"
            : "#17a2b8"
        };
      `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 2 seconds
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 2000);

        // Log to database
        try {
          const response = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title:
                options.title ||
                (type === "success"
                  ? "Success"
                  : type === "error"
                  ? "Error"
                  : type === "warning"
                  ? "Warning"
                  : "Information"),
              message: message,
              type: type,
              category: options.category || "system",
              websiteId:
                currentWebsite && currentWebsite.CurrentWorkingSite
                  ? currentWebsite.CurrentWorkingSite
                  : null,
            }),
          });

          if (response.ok) {
            logger.debug("✅ FALLBACK: Notification logged to database");
            // Update badge count
            const badge = document.getElementById("notification-badge");
            if (badge) {
              const currentCount = parseInt(badge.textContent) || 0;
              badge.textContent = currentCount + 1;
              badge.style.display = "flex";
            }
          }
        } catch (error) {
          console.warn("⚠️ FALLBACK: Failed to log to database:", error);
        }

        return notification;
      };

    } else {
      logger.info(
        "🔔 SUCCESS: notifications.js loaded properly, showNotification available"
      );
    }
  }, 500); // Wait 500ms for notifications.js to load

  // --- Confirmation Dialog Function ---
  function showConfirmation(message, onConfirm, onCancel = null) {
    const confirmationModal = document.createElement("div");
    confirmationModal.className = "confirmation-modal";
    confirmationModal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
      align-items: center; justify-content: center;
    `;

    const confirmationDialog = document.createElement("div");
    confirmationDialog.style.cssText = `
      background: white; padding: 20px; border-radius: 8px; 
      max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    confirmationDialog.innerHTML = `
      <div style="margin-bottom: 20px; font-size: 16px; color: #333;">${message}</div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="confirm-btn" style="padding: 8px 16px; border: none; background: #dc3545; color: white; border-radius: 4px; cursor: pointer;">Confirm</button>
      </div>
    `;

    confirmationModal.appendChild(confirmationDialog);
    document.body.appendChild(confirmationModal);

    const confirmBtn = confirmationDialog.querySelector("#confirm-btn");
    const cancelBtn = confirmationDialog.querySelector("#cancel-btn");

    const cleanup = () => {
      document.body.removeChild(confirmationModal);
    };

    confirmBtn.addEventListener("click", () => {
      cleanup();
      onConfirm();
    });

    cancelBtn.addEventListener("click", () => {
      cleanup();
      if (onCancel) onCancel();
    });

    // Close on backdrop click
    confirmationModal.addEventListener("click", (e) => {
      if (e.target === confirmationModal) {
        cleanup();
        if (onCancel) onCancel();
      }
    });
  }

  // --- Manual Notification System Debug Function ---
  window.debugNotifications = function () {
    logger.debug("🔔 === NOTIFICATION SYSTEM DEBUG ===");
    logger.debug("showNotification function:", typeof showNotification);
    logger.debug("notificationManager:", typeof notificationManager);
    logger.debug(
      "header-actions element:",
      !!document.querySelector(".header-actions")
    );
    logger.debug(
      "notification container:",
      !!document.querySelector("#notificationContainer")
    );


    // Test notification
    if (typeof showNotification === "function") {
      logger.debug("🔔 Testing notification...");
      showNotification("Debug test notification", "info");
    }
  };

  // --- Initialize Shared Content Blocks ---
  fetchAndPopulateSharedBlocks();

  // --- Functions ---

  async function fetchAndPopulatePaths(websiteId) {
    if (!websiteId) {
      parentPathSelector.disabled = true;
      parentPathSelector.innerHTML =
        '<option value="">-- No website selected --</option>';
      return;
    }

    parentPathSelector.disabled = false;
    parentPathSelector.innerHTML =
      '<option value="/">Loading paths...</option>';
    try {
      const response = await fetch(`/api/websites/${websiteId}/paths`);
      if (!response.ok) throw new Error("Failed to load paths");
      const paths = await response.json();
      parentPathSelector.innerHTML = '<option value="/">/ (Root)</option>';
      paths.forEach((path) => {
        if (path !== "/") {
          const option = document.createElement("option");
          option.value = path;
          option.textContent = path;
          parentPathSelector.appendChild(option);
        }
      });
    } catch (error) {
      console.error(error);
      parentPathSelector.innerHTML =
        '<option value="">-- Error loading paths --</option>';
    }
  }

  // --- Shared Content Blocks Functions ---
  async function fetchAndPopulateSharedBlocks() {
    if (!currentWorkingSite || !currentWorkingSite.CurrentWorkingSite) {
      logger.debug("No working site selected, skipping shared blocks fetch");
      return;
    }

    const websiteId = currentWorkingSite.CurrentWorkingSite;
    logger.debug("🔄 Fetching shared content blocks for website:", websiteId);

    try {
      const response = await fetch(`/api/sharedcontent/website/${websiteId}`);
      logger.info(
        "📡 Shared blocks API response:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error response:", errorText);
        throw new Error(
          `Failed to fetch shared blocks: ${response.status} - ${errorText}`
        );
      }

      const sharedBlocks = await response.json();
      logger.debug("📦 Shared blocks fetched:", sharedBlocks);

      if (!Array.isArray(sharedBlocks)) {
        console.error(
          "❌ Expected array but got:",
          typeof sharedBlocks,
          sharedBlocks
        );
        throw new Error("Invalid response format - expected array");
      }

      // Populate dropdown
      sharedBlocksSelector.innerHTML =
        '<option value="">Select a shared block...</option>';

      if (sharedBlocks.length === 0) {
        sharedBlocksSelector.innerHTML =
          '<option value="">No shared blocks available</option>';
        logger.debug("📝 No shared blocks found for website:", websiteId);
        return;
      }

      sharedBlocks.forEach((block) => {
        logger.debug("📦 Processing shared block:", block);
        const option = document.createElement("option");
        option.value = block.SharedBlockID;
        option.textContent = block.Name;
        sharedBlocksSelector.appendChild(option);
      });

      // Store blocks data for later use
      window.sharedBlocksData = sharedBlocks;
      logger.info(
        `✅ Successfully loaded ${sharedBlocks.length} shared blocks`
      );
    } catch (error) {
      console.error("❌ Error fetching shared content blocks:", error);
      sharedBlocksSelector.innerHTML =
        '<option value="">Error loading blocks</option>';
    }
  }

  function handleSharedBlockSelection(e) {
    const selectedBlockId = e.target.value;
    logger.info("📋 Selected shared block ID:", selectedBlockId);

    // Clear current container
    sharedBlocksContainer.innerHTML = "";

    if (!selectedBlockId) {
      return;
    }

    // Find the selected block data
    logger.info(
      "🔍 Looking for block with ID:",
      selectedBlockId,
      "in data:",
      window.sharedBlocksData
    );
    const selectedBlock = window.sharedBlocksData?.find(
      (block) => block.SharedBlockID == selectedBlockId
    );
    if (!selectedBlock) {
      console.error("❌ Selected block data not found");
      console.error(
        "Available blocks:",
        window.sharedBlocksData?.map((b) => ({
          id: b.SharedBlockID,
          name: b.Name,
        }))
      );
      return;
    }
    logger.info("✅ Found selected block:", selectedBlock);

    // Create draggable block element
    const blockElement = document.createElement("div");
    blockElement.className = "shared-content-block";
    blockElement.draggable = true;
    blockElement.dataset.id = selectedBlock.SharedBlockID;
    blockElement.dataset.blockType = "shared";
    blockElement.title = `Drag to canvas: ${selectedBlock.Name}`;

    blockElement.innerHTML = `
      <div class="shared-block-icon">
        <i class="fas fa-share-alt"></i>
      </div>
      <div class="shared-block-label">${selectedBlock.Name}</div>
      <div class="shared-block-description">${
        selectedBlock.Description || "Shared content block"
      }</div>
    `;

    sharedBlocksContainer.appendChild(blockElement);

    // Initialize Sortable for the new shared block
    initializeSharedBlocksDraggable();
  }

  function initializeSharedBlocksDraggable() {
    if (typeof Sortable === 'undefined') {
      logger.error("❌ Sortable library not available for shared blocks initialization");
      return;
    }
    
    if (sharedBlocksContainer) {
      logger.debug("✅ Initializing shared-blocks-container sortable");
      new Sortable(sharedBlocksContainer, {
        group: { name: "shared", pull: "clone", put: false },
        sort: false,
        animation: 150,
      });
    } else {
      logger.warn("⚠️ sharedBlocksContainer not found");
    }
  }

  // --- Editor Tab Functions ---
  function handleTabClick(e) {
    const targetTab = e.currentTarget.dataset.tab;
    logger.debug("🔄 Switching to tab:", targetTab);

    // Remove active class from all tabs and content
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Add active class to clicked tab and corresponding content
    e.currentTarget.classList.add("active");
    document.getElementById(`${targetTab}-tab`).classList.add("active");
  }

  function handleToolbarClick(e) {
    if (!e.target.classList.contains("toolbar-btn")) return;

    const buttonText = e.target.textContent.trim();

    if (buttonText.includes("CSS Reset")) {
      insertTextIntoEditor(
        cssEditor,
        `/* CSS Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
}

`
      );
    } else if (buttonText.includes("Responsive")) {
      insertTextIntoEditor(
        cssEditor,
        `/* Responsive Breakpoints */
@media (max-width: 768px) {
  /* Mobile styles */
}

@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet styles */
}

@media (min-width: 1025px) {
  /* Desktop styles */
}

`
      );
    } else if (buttonText.includes("jQuery Ready")) {
      insertTextIntoEditor(
        jsEditor,
        `$(document).ready(function() {
  // Your code here
  logger.debug('Document ready');
});

`
      );
    } else if (buttonText.includes("Event Listener")) {
      insertTextIntoEditor(
        jsEditor,
        `// Event listener example
document.addEventListener('DOMContentLoaded', function() {
  // Your code here
  
  const element = document.getElementById('your-element-id');
  if (element) {
    element.addEventListener('click', function(e) {
      // Handle click event
      logger.info('Element clicked');
    });
  }
});

`
      );
    }
  }

  function insertTextIntoEditor(editor, text) {
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const currentValue = editor.value;

    editor.value =
      currentValue.substring(0, start) + text + currentValue.substring(end);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
  }

  function updatePageUrlSlug() {
    if (!pageNameInput) return;
    const pageName = pageNameInput.value;
    const slug = pageName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/&/g, "and")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
    pageUrlSlugInput.value = slug;
  }

  function initializeEditors(blockData = {}, blockType = null) {
    const htmlContent = blockData.HtmlContent || "";
    const cssContent = blockData.CssContent || "";
    const jsContent = blockData.JsContent || "";

    logger.debug("🎨 Initializing all editors with content:", {
      html: htmlContent.length,
      css: cssContent.length,
      js: jsContent.length,
      blockType: blockType,
    });

    // Handle tab visibility and Azure image button based on block type
    const tabButtons = document.querySelectorAll(".editor-tabs .tab-button");
    const tabContents = document.querySelectorAll(
      ".tab-content-container .tab-content"
    );
    const azureImageBtn = document.getElementById("insert-image-btn");

    if (blockType === "javascript") {
      // For JavaScript blocks, show only JavaScript tab and hide Azure image button
      tabButtons.forEach((btn) => {
        if (btn.dataset.tab === "js") {
          btn.style.display = "inline-block";
          btn.classList.add("active");
        } else {
          btn.style.display = "none";
          btn.classList.remove("active");
        }
      });

      tabContents.forEach((content) => {
        if (content.id === "js-tab") {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });

      // Hide Azure image button for JavaScript blocks
      if (azureImageBtn) {
        azureImageBtn.style.display = "none";
      }
    } else if (blockType === "css") {
      // For CSS blocks, show only CSS tab and hide Azure image button
      tabButtons.forEach((btn) => {
        if (btn.dataset.tab === "css") {
          btn.style.display = "inline-block";
          btn.classList.add("active");
        } else {
          btn.style.display = "none";
          btn.classList.remove("active");
        }
      });

      tabContents.forEach((content) => {
        if (content.id === "css-tab") {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });

      // Hide Azure image button for CSS blocks
      if (azureImageBtn) {
        azureImageBtn.style.display = "none";
      }
    } else {
      // For all other blocks (empty, regular, shared), show all tabs with HTML active and show Azure image button
      tabButtons.forEach((btn) => {
        btn.style.display = "inline-block";
        if (btn.dataset.tab === "html") {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      tabContents.forEach((content) => {
        if (content.id === "html-tab") {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });

      // Show Azure image button for all other blocks
      if (azureImageBtn) {
        azureImageBtn.style.display = "inline-block";
      }
    }

    // Initialize TinyMCE for HTML (only if HTML tab should be shown)
    if (blockType !== "javascript" && blockType !== "css") {
      tinymce.init({
        selector: "#html-editor",
        height: 400, // Fixed height instead of 100% to prevent overflow
        plugins: "code lists link image table media wordcount autoresize",
        menubar: "edit view format",
        toolbar:
          "undo redo | styleselect | bold italic | bullist numlist | code",
        resize: true, // Allow manual resizing
        setup: function (editor) {
          editor.on("init", function () {
            editor.setContent(htmlContent);
          });
        },
      });
    }

    // Populate CSS and JS editors
    if (cssEditor) cssEditor.value = cssContent;
    if (jsEditor) jsEditor.value = jsContent;
  }

  function closeEditor() {
    const editor = tinymce.get("html-editor");
    if (editor) editor.destroy();
    editorModal.style.display = "none";

    // Reset tab visibility - show all tabs and set HTML as active
    const tabButtons = document.querySelectorAll(".editor-tabs .tab-button");
    const tabContents = document.querySelectorAll(
      ".tab-content-container .tab-content"
    );
    const azureImageBtn = document.getElementById("insert-image-btn");

    tabButtons.forEach((btn) => {
      btn.style.display = "inline-block";
      if (btn.dataset.tab === "html") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    tabContents.forEach((content) => {
      if (content.id === "html-tab") {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Reset Azure image button visibility
    if (azureImageBtn) {
      azureImageBtn.style.display = "inline-block";
    }

    // Reset modal state for shared block editing
    const modal = document.getElementById("editor-modal");
    if (modal) {
      delete modal.dataset.editMode;
      delete modal.dataset.sharedBlockId;

      // Reset modal title
      const modalTitle = modal.querySelector(".modal-title");
      if (modalTitle) {
        modalTitle.textContent = "Edit Block Content";
      }

      // Clear name input
      const nameInput = modal.querySelector("#block-name-input");
      if (nameInput) {
        nameInput.value = "";
      }
    }

    // Clear shared block reference
    window.currentEditingSharedBlock = null;
    document.body.classList.remove("modal-open");
  }

  async function handleCreatePage(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const websiteId =
      currentWebsite && currentWebsite.CurrentWorkingSite
        ? currentWebsite.CurrentWorkingSite
        : null;
    const domain =
      currentWebsite && currentWebsite.WebsiteName
        ? currentWebsite.WebsiteName
        : null;
    const pageName = pageNameInput.value.trim();
    const layoutId = layoutSelector.value;
    const parentPath = parentPathSelector.value;

    if (!websiteId || !pageName || !layoutId) {
      showNotification(
        "Please provide a page name and select a layout.",
        "warning"
      );
      return false;
    }

    const baseURL = `https://${domain}`;
    const pageSlug = pageUrlSlugInput.value;
    const finalPath =
      parentPath === "/" ? `/${pageSlug}` : `${parentPath}${pageSlug}`;
    const fullURL = baseURL + finalPath;

    createPageBtn.disabled = true;
    createPageBtn.textContent = "Creating...";

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pageName,
          pageLayoutId: parseInt(layoutId),
          websiteId: parseInt(websiteId),
          url: fullURL,
          path: finalPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create page.");
      }

      const newPage = await response.json();
      currentPageId = newPage.PageID;
      currentPageInfo = {
        pageId: newPage.PageID,
        pageName: pageName,
        websiteId: websiteId,
        domain: domain,
        url: fullURL,
        path: finalPath,
      };

      createPageBtn.style.display = "none";
      savePageBtn.disabled = false;
      if (viewPageBtn) viewPageBtn.style.display = "inline-block";
      canvasTitle.textContent = `Editing Page: ${pageName}`;
      pageNameInput.value = "";
      pageUrlSlugInput.value = "";
      layoutSelector.value = "";

      const layoutLoaded = await loadPageLayout(layoutId);

      if (layoutLoaded) {
        showNotification(
          `Page "${pageName}" created successfully! You can now drag content blocks to the canvas.`,
          "success"
        );
      } else {
        showNotification(
          "Page created but layout failed to load. Please refresh the page.",
          "error"
        );
      }
    } catch (error) {
      showNotification(`Could not create the page: ${error.message}`, "error");
    } finally {
      createPageBtn.disabled = false;
      createPageBtn.textContent = "Create Page";
    }
    return false;
  }

  async function loadPageLayout(layoutId) {
    logger.debug("=== LOAD LAYOUT START ===");
    logger.debug("Loading layout ID:", layoutId);
    try {
      const response = await fetch(`/api/pagetemplates/${layoutId}`);
      logger.debug("Template API response status:", response.status);
      if (!response.ok) throw new Error("Layout not found.");

      const data = await response.json();
      logger.debug("Template data received:", data);

      let layoutHTML = data.HtmlStructure || "";
      logger.debug("Layout HTML length:", layoutHTML.length);
      logger.debug("Layout HTML preview:", layoutHTML.substring(0, 200) + "...");

      // TEMPORARY FIX: Remove external CSS links that might be causing issues
      logger.debug("🔧 REMOVING EXTERNAL CSS LINKS FOR DEBUGGING...");
      layoutHTML = layoutHTML.replace(
        /<link[^>]*rel="stylesheet"[^>]*>/gi,
        "<!-- External CSS removed for debugging -->"
      );
      logger.info(
        "Layout HTML after CSS removal preview:",
        layoutHTML.substring(0, 200) + "..."
      );

      // Add fallback styles to ensure visibility
      const placeholderStyles = `<style>
        .layout-placeholder { 
          border: 2px dashed #007bff; 
          border-radius: 8px; 
          padding: 20px; 
          margin-bottom: 15px; 
          text-align: center; 
          color: #007bff; 
          background-color: #f0f8ff; 
          min-height: 50px; 
        }
        /* Fallback styles to ensure content is visible */
        body, html { background: white !important; }
        #canvas-area { background: white !important; min-height: 400px !important; }
        .content { background: white !important; }
        div { background: inherit; }
        /* Basic styling for the layout */
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .row { display: flex; flex-wrap: wrap; margin: -10px; }
        .col { flex: 1; padding: 10px; }
      </style>`;

      logger.debug("Setting canvas area innerHTML...");
      canvasArea.innerHTML = placeholderStyles + layoutHTML;

      logger.debug("Canvas area content set, checking for disabled overlay...");
      const disabledOverlay = canvasArea.querySelector(".disabled-overlay");
      if (disabledOverlay) {
        logger.debug("Removing disabled overlay");
        disabledOverlay.remove();
      } else {
        logger.debug("No disabled overlay found");
      }

      const placeholders = canvasArea.querySelectorAll(".layout-placeholder");
      logger.debug("Found", placeholders.length, "placeholders");

      placeholders.forEach((placeholder, index) => {
        logger.info(
          `Setting up sortable for placeholder ${index + 1}:`,
          placeholder.id
        );
        
        if (typeof Sortable === 'undefined') {
          logger.error("❌ Sortable library not available for placeholder initialization");
          return;
        }
        
        new Sortable(placeholder, {
          group: "shared",
          animation: 150,
          onAdd: handleBlockDrop,
          onEnd: handleBlockMove,
          handle: ".content-block-header",
        });
        
        logger.debug(`✅ Sortable initialized for placeholder: ${placeholder.id}`);
      });

      // Check if canvas area is visible
      logger.debug("Canvas area visibility:", {
        display: getComputedStyle(canvasArea).display,
        visibility: getComputedStyle(canvasArea).visibility,
        opacity: getComputedStyle(canvasArea).opacity,
        height: getComputedStyle(canvasArea).height,
        width: getComputedStyle(canvasArea).width,
      });

      logger.debug("=== LOAD LAYOUT SUCCESS ===");
      return true;
    } catch (error) {
      console.error("Failed to load page layout:", error);
      canvasArea.innerHTML = `<div class="drop-zone-placeholder" style="color: red;">Error: Could not load layout.</div>`;
      return false;
    }
  }

  async function handleBlockDrop(evt) {
    logger.debug("🎯 handleBlockDrop called with:", evt);

    // Check if this is an existing block instance being moved (not a new block from sidebar)
    const originalCard = evt.item;
    if (originalCard.classList.contains("content-block-instance")) {
      logger.info(
        "🔄 Existing block instance detected, skipping handleBlockDrop"
      );
      return; // Let handleBlockMove handle this instead
    }

    // Send debug info to server
    try {
      await fetch("/api/sharedcontent/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "DRAG-DROP: handleBlockDrop called",
          data: {
            eventType: evt.type,
            itemDataset: evt.item ? evt.item.dataset : null,
            toId: evt.to ? evt.to.id : null,
          },
        }),
      });
    } catch (debugErr) {
      logger.debug("Debug logging failed:", debugErr);
    }

    try {
      const placeholder = evt.to;
      const contentTemplateId = originalCard.dataset.id;
      const blockType = originalCard.dataset.blockType;
      logger.debug("📋 Block details:", {
        contentTemplateId,
        blockType,
        contentTemplateIdType: typeof contentTemplateId,
        originalCardDataset: originalCard.dataset,
        originalCardClassName: originalCard.className,
        originalCardHTML: originalCard.outerHTML.substring(0, 200),
      });

      // Send debug info to server
      try {
        await fetch("/api/sharedcontent/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "DRAG-DROP: Block details extracted",
            data: {
              contentTemplateId,
              blockType,
              placeholderId: placeholder.id,
            },
          }),
        });
      } catch (debugErr) {
        logger.debug("Debug logging failed:", debugErr);
      }

      originalCard.remove();

      const tempElement = document.createElement("div");
      tempElement.innerText = "Loading block...";
      placeholder.appendChild(tempElement);

      try {
        // Handle empty content block
        if (
          blockType === "empty" ||
          blockType === "javascript" ||
          blockType === "css"
        ) {
          logger.info(
            `🚀 ${blockType.toUpperCase()} BLOCK DETECTED. Preparing to send to server...`
          );
          const payload = {
            pageId: currentPageId,
            contentTemplateId: null, // No template for empty/js/css block
            placeholderId: placeholder.id,
            sortOrder: placeholder.children.length,
            isEmpty: blockType === "empty", // Flag to indicate this is an empty block
            blockType: blockType, // Include the specific block type
          };
          logger.info(
            `📦 Payload for ${blockType} block:`,
            JSON.stringify(payload, null, 2)
          );

          const blockResponse = await fetch("/api/pagecontentblocks/page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          logger.info(
            `📬 Server response status for ${blockType} block:`,
            blockResponse.status
          );

          if (!blockResponse.ok) {
            const errorText = await blockResponse.text();
            console.error("❌ Server error response (text):", errorText);
            const blockErrorData = JSON.parse(errorText); // Try to parse even if it fails
            throw new Error(
              blockErrorData.error ||
                `Failed to create ${blockType} content block.`
            );
          }
          const blockData = await blockResponse.json();
          logger.info(
            `✅ Successfully created ${blockType} block. Server data:`,
            blockData
          );
          createSpecialBlockInstance(tempElement, blockData, blockType);
        } else if (blockType === "shared") {
          // Handle shared content blocks
          logger.info(
            "🚀 SHARED BLOCK DETECTED. Preparing to send to server..."
          );
          const payload = {
            pageId: currentPageId,
            contentTemplateId, // Use the shared block template ID
            placeholderId: placeholder.id,
            sortOrder: placeholder.children.length,
            isShared: true, // Flag to indicate this is a shared block
          };
          logger.info(
            "📦 Payload for shared block:",
            JSON.stringify(payload, null, 2)
          );
          logger.info(
            "🔍 Debug: contentTemplateId value and type:",
            contentTemplateId,
            typeof contentTemplateId
          );

          const sharedResponse = await fetch("/api/pagecontentblocks/page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          logger.info(
            "📬 Server response status for shared block:",
            sharedResponse.status
          );

          if (!sharedResponse.ok) {
            const errorText = await sharedResponse.text();
            console.error("❌ Server error response (text):", errorText);
            const sharedErrorData = JSON.parse(errorText);
            throw new Error(
              sharedErrorData.error || "Failed to create shared content block."
            );
          }
          const sharedBlockData = await sharedResponse.json();
          logger.info(
            "✅ Successfully created shared block. Server data:",
            sharedBlockData
          );
          createBlockInstance(
            tempElement,
            sharedBlockData,
            contentTemplateId,
            true
          );
        } else {
          // Handle regular template blocks
          logger.info(
            "🚀 TEMPLATE BLOCK DETECTED. Preparing to send to server..."
          );
          const payload = {
            pageId: currentPageId,
            contentTemplateId,
            placeholderId: placeholder.id,
            sortOrder: placeholder.children.length,
          };
          logger.info(
            "📦 Payload for template block:",
            JSON.stringify(payload, null, 2)
          );

          const templateResponse = await fetch("/api/pagecontentblocks/page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          logger.info(
            "📬 Server response status for template block:",
            templateResponse.status
          );

          if (!templateResponse.ok) {
            const errorText = await templateResponse.text();
            console.error("❌ Server error response (text):", errorText);
            const templateErrorData = JSON.parse(errorText);
            throw new Error(
              templateErrorData.error || "Failed to create content block."
            );
          }
          const templateBlockData = await templateResponse.json();
          logger.info(
            "✅ Successfully created template block. Server data:",
            templateBlockData
          );
          createBlockInstance(
            tempElement,
            templateBlockData,
            contentTemplateId,
            false
          );
        }
      } catch (error) {
        console.error("❌ Error creating block:", error);
        console.error("❌ Error stack:", error.stack);
        tempElement.innerText = "Error loading block.";

        // Send error to server debug log
        try {
          await fetch("/api/sharedcontent/debug", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "DRAG-DROP ERROR: Block creation failed",
              data: {
                error: error.message,
                stack: error.stack,
                blockType: originalCard?.dataset?.blockType,
                contentTemplateId: originalCard?.dataset?.id,
              },
            }),
          });
        } catch (debugErr) {
          logger.debug("Debug logging failed:", debugErr);
        }
      }
    } catch (outerError) {
      console.error("❌ Outer error in handleBlockDrop:", outerError);
      console.error("❌ Outer error stack:", outerError.stack);

      // Send outer error to server debug log
      try {
        await fetch("/api/sharedcontent/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "DRAG-DROP OUTER ERROR: Complete failure",
            data: {
              error: outerError.message,
              stack: outerError.stack,
            },
          }),
        });
      } catch (debugErr) {
        logger.debug("Debug logging failed:", debugErr);
      }
    }
  }

  async function handleBlockMove(evt) {
    logger.info("🔄 handleBlockMove called with:", evt);

    // Only handle moves between different containers (zones)
    if (evt.from === evt.to) {
      logger.info("🔄 Block moved within same zone, no API update needed");
      return;
    }

    try {
      const blockElement = evt.item;
      const instanceId = blockElement.dataset.instanceId;
      const newPlaceholderId = evt.to.id;
      const newSortOrder = Array.from(evt.to.children).indexOf(blockElement);

      logger.info("🔄 Moving block:", {
        instanceId,
        newPlaceholderId,
        newSortOrder,
        fromZone: evt.from.id,
        toZone: evt.to.id,
      });

      if (!instanceId) {
        console.error("❌ No instance ID found on moved block");
        showNotification("Error: Block instance ID not found.", "error");
        return;
      }

      // Update block position via API
      const response = await fetch(
        `/api/pagecontentblocks/page/${instanceId}/position`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placeholderId: newPlaceholderId,
            sortOrder: newSortOrder,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to update block position:", errorText);
        showNotification("Failed to update block position.", "error");
        return;
      }

      logger.info("✅ Block position updated successfully");
      showNotification("Block moved successfully", "success");
    } catch (error) {
      console.error("❌ Error moving block:", error);
      showNotification("Failed to move block: " + error.message, "error");
    }
  }

  function createBlockInstance(
    elementToReplace,
    blockData,
    contentTemplateId,
    isShared = false
  ) {
    const blockWrapper = document.createElement("div");
    blockWrapper.className = isShared
      ? "content-block-instance shared-block"
      : "content-block-instance";
    blockWrapper.dataset.instanceId = blockData.ID;
    blockWrapper.dataset.templateId = contentTemplateId;
    if (isShared) {
      blockWrapper.dataset.isShared = "true";
      // Extract shared block ID from slug (format: "shared-block-{id}")
      if (blockData.Slug && blockData.Slug.startsWith("shared-block-")) {
        const sharedBlockId = blockData.Slug.replace("shared-block-", "");
        blockWrapper.dataset.sharedBlockId = sharedBlockId;
      }
    }

    const header = document.createElement("div");
    header.className = "content-block-header";
    const baseName =
      blockData.InstanceName || blockData.Name || "Content Block";
    const blockTitle = isShared ? `Shared Block: ${baseName}` : baseName;

    // Create action buttons based on whether it's shared or not
    const actionButtons = isShared
      ? `<button class="edit-btn">Edit</button><button class="unshare-btn">Unshare</button><button class="delete-btn">Delete</button>`
      : `<button class="edit-btn">Edit</button><button class="delete-btn">Delete</button>`;

    header.innerHTML = `<div class="content-block-title">${blockTitle}</div><div class="content-block-actions">${actionButtons}</div>`;

    const iframe = document.createElement("iframe");
    iframe.scrolling = "no";
    iframe.onload = () => {
      iframe.style.height =
        iframe.contentWindow.document.body.scrollHeight + "px";
    };

    blockWrapper.appendChild(header);
    blockWrapper.appendChild(iframe);

    if (elementToReplace && elementToReplace.parentNode) {
      elementToReplace.parentNode.replaceChild(blockWrapper, elementToReplace);
    } else {
      canvasArea.appendChild(blockWrapper);
    }
    updateIframeContent(iframe, blockData);
  }

  function createSpecialBlockInstance(elementToReplace, blockData, blockType) {
    logger.info(
      `🏗️ Creating ${blockType} block instance with data:`,
      blockData
    );

    const blockWrapper = document.createElement("div");
    blockWrapper.className = `content-block-instance ${blockType}-block`;
    blockWrapper.dataset.instanceId = blockData.ID;
    blockWrapper.dataset.templateId = blockType;
    blockWrapper.dataset.blockType = blockType;

    logger.info(`📦 ${blockType} block wrapper created with ID:`, blockData.ID);

    const header = document.createElement("div");
    header.className = "content-block-header";

    let blockTitle, defaultContent;

    switch (blockType) {
      case "javascript":
        blockTitle =
          blockData.InstanceName || blockData.Name || "JavaScript Block";
        defaultContent = {
          HtmlContent:
            '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #007bff; border-radius: 4px;"><p><i class="fab fa-js-square" style="font-size: 24px; margin-bottom: 10px; color: #f7df1e;"></i></p><p>JavaScript Block - Click "Edit" to add your JavaScript code</p></div>',
          CssContent: "",
          JsContent:
            "// Add your JavaScript code here\nlogger.info('JavaScript block loaded');",
        };
        break;
      case "css":
        blockTitle = blockData.InstanceName || blockData.Name || "CSS Block";
        defaultContent = {
          HtmlContent:
            '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #28a745; border-radius: 4px;"><p><i class="fab fa-css3-alt" style="font-size: 24px; margin-bottom: 10px; color: #1572b6;"></i></p><p>CSS Block - Click "Edit" to add your CSS styles</p></div>',
          CssContent:
            "/* Add your CSS styles here */\n.my-custom-style {\n  color: #333;\n}",
          JsContent: "",
        };
        break;
      default: // empty
        blockTitle =
          blockData.InstanceName || blockData.Name || "Empty Content Block";
        defaultContent = {
          HtmlContent:
            '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 4px;"><p><i class="fas fa-edit" style="font-size: 24px; margin-bottom: 10px;"></i></p><p>Click "Edit" to add your content</p></div>',
          CssContent: "",
          JsContent: "",
        };
    }

    header.innerHTML = `<div class="content-block-title">${blockTitle}</div><div class="content-block-actions"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;

    const iframe = document.createElement("iframe");
    iframe.scrolling = "no";
    iframe.style.minHeight = "100px";
    iframe.onload = () => {
      iframe.style.height =
        iframe.contentWindow.document.body.scrollHeight + "px";
    };

    blockWrapper.appendChild(header);
    blockWrapper.appendChild(iframe);

    if (elementToReplace && elementToReplace.parentNode) {
      elementToReplace.parentNode.replaceChild(blockWrapper, elementToReplace);
      logger.info(`✅ ${blockType} block replaced temp element`);
    } else {
      canvasArea.appendChild(blockWrapper);
      logger.info(`✅ ${blockType} block appended to canvas`);
    }

    // Use actual block content if available, otherwise use default content
    const actualContent = {
      HtmlContent: blockData.HtmlContent || defaultContent.HtmlContent,
      CssContent: blockData.CssContent || defaultContent.CssContent,
      JsContent: blockData.JsContent || defaultContent.JsContent,
    };

    updateIframeContent(iframe, actualContent);
    logger.info(`✅ ${blockType} block instance created successfully`);
  }

  function createEmptyBlockInstance(elementToReplace, blockData) {
    // Legacy function - now delegates to createSpecialBlockInstance
    createSpecialBlockInstance(elementToReplace, blockData, "empty");
  }

  function updateIframeContent(iframe, blockData) {
    const css = blockData.CssContent || "";
    const html = blockData.HtmlContent || "";
    const js = blockData.JsContent || "";

    logger.info("🔧 updateIframeContent - Block data:", {
      cssLength: css.length,
      htmlLength: html.length,
      jsLength: js.length,
      jsPreview: js.substring(0, 100),
    });

    // Wrap JavaScript in try-catch to prevent console errors from invalid JS
    const safeJs = js.trim()
      ? `
      try {
        ${js}
      } catch (error) {
        console.warn('Content block JavaScript error:', error.message);
      }
    `
      : "";

    // Create the iframe content
    const iframeContent = `<!DOCTYPE html><html><head><style>body{margin:0;}${css}</style></head><body>${html}<script>${safeJs.replace(
      /<\/script>/g,
      "<\\/script>"
    )}</script></body></html>`;

    logger.info(
      "🔧 Generated iframe content preview:",
      iframeContent.substring(0, 200)
    );

    iframe.srcdoc = iframeContent;
  }

  async function handleCanvasClick(e) {
    logger.info("🖱️ Canvas click detected:", e.target);
    logger.info("🎯 Target classes:", e.target.classList.toString());

    if (e.target.classList.contains("edit-btn")) {
      const blockInstance = e.target.closest(".content-block-instance");
      logger.info("📦 Block instance found:", blockInstance);

      if (!blockInstance) {
        console.error("❌ No block instance found for edit button");
        return;
      }

      currentlyEditingBlockId = blockInstance.dataset.instanceId;
      logger.info("🔧 EDITING BLOCK:", currentlyEditingBlockId);
      logger.info("📋 Block dataset:", blockInstance.dataset);
      logger.info("📋 Block classList:", Array.from(blockInstance.classList));
      logger.info(
        "📋 Block innerHTML preview:",
        blockInstance.innerHTML.substring(0, 200)
      );

      // Check if this is a shared block
      const isSharedBlock = blockInstance.classList.contains("shared-block");
      const sharedBlockId = blockInstance.dataset.sharedBlockId;
      const isSharedAttr = blockInstance.dataset.isShared;
      const templateId = blockInstance.dataset.templateId;

      logger.info("🔍 DETAILED Block type check:", {
        isSharedBlock: isSharedBlock,
        sharedBlockId: sharedBlockId,
        isSharedAttr: isSharedAttr,
        templateId: templateId,
        hasSharedClass: blockInstance.classList.contains("shared-block"),
        allClasses: Array.from(blockInstance.classList),
        allDataAttrs: Object.keys(blockInstance.dataset).map(
          (key) => `${key}: ${blockInstance.dataset[key]}`
        ),
      });

      // Additional debugging for shared block detection
      if (blockInstance.classList.contains("shared-block")) {
        logger.info("✅ CONFIRMED: Block has 'shared-block' class");
      } else {
        logger.info("❌ Block does NOT have 'shared-block' class");
      }

      if (sharedBlockId) {
        logger.info("✅ CONFIRMED: sharedBlockId found:", sharedBlockId);
      } else {
        logger.info("❌ No sharedBlockId found in dataset");
      }

      if (!currentlyEditingBlockId) {
        console.error("❌ No instance ID found on block");
        showNotification("Error: Block instance ID not found.", "error");
        return;
      }

      // For shared blocks, redirect to content management page for editing
      logger.info("🔍 Checking redirect conditions:", {
        isSharedBlock: isSharedBlock,
        sharedBlockId: sharedBlockId,
        bothTrue: isSharedBlock && sharedBlockId,
        willRedirect: !!(isSharedBlock && sharedBlockId),
      });

      if (isSharedBlock && sharedBlockId) {
        logger.info(
          "📝 SHARED BLOCK - Opening direct editor for block:",
          sharedBlockId
        );
        await openSharedBlockEditor(sharedBlockId, blockInstance);
        return; // Exit early to prevent regular block logic
      } else if (isSharedBlock && !sharedBlockId) {
        logger.info(
          "⚠️ Block is shared but no sharedBlockId found - proceeding with regular edit"
        );
      } else if (!isSharedBlock) {
        logger.info("📝 Regular block - proceeding with normal edit flow");
      }

      // Only execute regular block logic if we're not dealing with a shared block
      try {
        logger.info("📡 Fetching block data from API...");
        const response = await fetch(
          `/api/pagecontentblocks/page/${currentlyEditingBlockId}`
        );
        logger.info("📡 API Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ API Error response:", errorText);
          throw new Error("Could not fetch block content.");
        }

        const blockData = await response.json();
        logger.info("📄 Block data received:", blockData);

        // Populate the name input
        const nameInput = editorModal.querySelector("#block-name-input");
        if (nameInput) {
          nameInput.value = blockData.InstanceName || "";
        }

        // Determine block type from the block instance dataset or class
        let blockType = blockInstance.dataset.blockType || null;
        if (!blockType) {
          // Fallback: determine from CSS classes
          if (blockInstance.classList.contains("javascript-block")) {
            blockType = "javascript";
          } else if (blockInstance.classList.contains("css-block")) {
            blockType = "css";
          } else if (blockInstance.classList.contains("empty-block")) {
            blockType = "empty";
          }
        }

        logger.info("🎯 Determined block type for editor:", blockType);

        initializeEditors(blockData, blockType);
        editorModal.style.display = "block";
        logger.info("✅ Editor modal opened");
      } catch (error) {
        console.error("❌ Error loading block content:", error);
        showNotification(
          "Could not load block content for editing: " + error.message,
          "error"
        );
      }
    }
    if (e.target.classList.contains("delete-btn")) {
      const blockInstance = e.target.closest(".content-block-instance");
      const instanceId = blockInstance.dataset.instanceId;

      showConfirmation(
        "Are you sure you want to delete this block?",
        async () => {
          blockInstance.remove();
          if (instanceId) {
            try {
              await fetch(`/api/pagecontentblocks/page/${instanceId}`, {
                method: "DELETE",
              });
              showNotification("Block deleted successfully", "success");
            } catch (error) {
              console.error("Error deleting block from database:", error);
              showNotification("Failed to delete block from database", "error");
            }
          }
        }
      );
    }

    if (e.target.classList.contains("unshare-btn")) {
      showConfirmation(
        "Are you sure you want to unshare this block? This will create a unique copy for this page only.",
        async () => {
          const blockInstance = e.target.closest(".content-block-instance");
          const instanceId = blockInstance.dataset.instanceId;

          if (!instanceId) {
            console.error("❌ No instance ID found for unshare operation");
            showNotification("Error: Block instance ID not found.", "error");
            return;
          }

          try {
            logger.info("🔄 Unsharing block with instance ID:", instanceId);

            // Call the unshare API endpoint
            const response = await fetch(
              `/api/pagecontentblocks/unshare/${instanceId}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ Unshare API Error:", errorText);
              throw new Error("Failed to unshare block");
            }

            const result = await response.json();
            logger.info("✅ Block unshared successfully:", result);

            // Update the block instance to reflect it's no longer shared
            blockInstance.classList.remove("shared-block");
            blockInstance.dataset.isShared = "false";
            blockInstance.dataset.templateId = result.newContentTemplateId;

            // Update the header to remove "Shared Block:" prefix and unshare button
            const titleElement = blockInstance.querySelector(
              ".content-block-title"
            );
            const actionsElement = blockInstance.querySelector(
              ".content-block-actions"
            );

            if (titleElement) {
              const currentTitle = titleElement.textContent;
              const newTitle = currentTitle.replace("Shared Block: ", "");
              titleElement.textContent = newTitle;
            }

            if (actionsElement) {
              actionsElement.innerHTML = `<button class="edit-btn">Edit</button><button class="delete-btn">Delete</button>`;
            }

            showNotification(
              "Block has been unshared successfully! This is now a unique copy for this page.",
              "success"
            );
          } catch (error) {
            console.error("❌ Error unsharing block:", error);
            showNotification(
              "Failed to unshare block: " + error.message,
              "error"
            );
          }
        }
      );
    }
  }

  async function handleSaveBlock() {
    // Check if we're editing a shared block first
    const modal = document.getElementById("editor-modal");
    const isSharedMode = modal.dataset.editMode === "shared";
    const sharedBlockId = modal.dataset.sharedBlockId;

    if (isSharedMode && sharedBlockId) {
      await handleSaveSharedBlock(sharedBlockId);
      return;
    }

    // For regular blocks, check if we have a currentlyEditingBlockId
    if (!currentlyEditingBlockId) return;

    const nameInput = document.getElementById("block-name-input");
    const updatedName = nameInput ? nameInput.value.trim() : "";

    // Determine the current block type from the editing block instance
    const blockInstance = document.querySelector(
      `[data-instance-id='${currentlyEditingBlockId}']`
    );
    const blockType = blockInstance
      ? blockInstance.dataset.blockType || null
      : null;

    logger.info("🔧 Saving block with type:", blockType);

    // Get HTML content based on block type
    let htmlContent = "";
    if (blockType === "javascript" || blockType === "css") {
      // For JS/CSS blocks, get HTML from textarea directly
      const htmlEditor = document.getElementById("html-editor");
      htmlContent = htmlEditor ? htmlEditor.value : "";
    } else {
      // For other blocks, use TinyMCE
      const tinymceEditor = tinymce.get("html-editor");
      htmlContent = tinymceEditor ? tinymceEditor.getContent() : "";
    }

    // Debug: Check if editors exist and get fresh references
    let cssContent = "";
    let jsContent = "";

    try {
      const currentCssEditor = document.getElementById("css-editor");
      const currentJsEditor = document.getElementById("js-editor");

      logger.info("🔍 Debug editor elements:", {
        cssEditor: !!cssEditor,
        jsEditor: !!jsEditor,
        currentCssEditor: !!currentCssEditor,
        currentJsEditor: !!currentJsEditor,
        cssEditorValue: cssEditor?.value,
        jsEditorValue: jsEditor?.value,
        currentCssValue: currentCssEditor?.value,
        currentJsValue: currentJsEditor?.value,
      });

      cssContent = currentCssEditor ? currentCssEditor.value : "";
      jsContent = currentJsEditor ? currentJsEditor.value : "";

      logger.info("✅ Successfully retrieved editor values:", {
        cssLength: cssContent.length,
        jsLength: jsContent.length,
      });
    } catch (error) {
      console.error("❌ Error retrieving CSS/JS content:", error);
      cssContent = "";
      jsContent = "";
    }

    logger.info("💾 Saving block content:", {
      instanceId: currentlyEditingBlockId,
      name: updatedName,
      htmlLength: htmlContent.length,
      cssLength: cssContent.length,
      jsLength: jsContent.length,
      cssContent: cssContent,
      jsContent: jsContent,
    });

    try {
      logger.info("📡 About to send save request...");
      logger.info("📦 Request payload:", {
        htmlContent: htmlContent,
        cssContent: cssContent,
        jsContent: jsContent,
        instanceName: updatedName,
      });

      const response = await fetch(
        `/api/pagecontentblocks/page/${currentlyEditingBlockId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            htmlContent: htmlContent,
            cssContent: cssContent,
            jsContent: jsContent,
            instanceName: updatedName,
          }),
        }
      );

      logger.info(
        "📡 Save response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Save failed with response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || "Failed to save block.");
        } catch (parseError) {
          throw new Error(
            `Failed to save block. Status: ${response.status}, Response: ${errorText}`
          );
        }
      }

      const responseData = await response.json();
      logger.info("✅ Save successful, response data:", responseData);

      const blockInstance = document.querySelector(
        `[data-instance-id='${currentlyEditingBlockId}']`
      );

      // Update the block title in the header
      if (blockInstance && updatedName) {
        const titleElement = blockInstance.querySelector(
          ".content-block-title"
        );
        if (titleElement) {
          titleElement.textContent = updatedName;
        }
      }

      const iframe = blockInstance.querySelector("iframe");
      const updatedBlockData = {
        HtmlContent: htmlContent,
        CssContent: cssContent,
        JsContent: jsContent,
      };
      updateIframeContent(iframe, updatedBlockData);
      setTimeout(() => {
        iframe.style.height =
          iframe.contentWindow.document.body.scrollHeight + "px";
      }, 100);

      closeEditor();
      currentlyEditingBlockId = null;
    } catch (error) {
      console.error("❌ Save operation failed:", error);
      console.error("❌ Error stack:", error.stack);
      showNotification("Could not save the block: " + error.message, "error");
    }
  }

  async function handleSaveSharedBlock(sharedBlockId) {
    try {
      logger.info("💾 Saving shared block:", sharedBlockId);

      // Get content from editors and name input
      const nameInput = document.getElementById("block-name-input");
      const blockName = nameInput ? nameInput.value.trim() : "";
      const htmlContent = tinymce.get("html-editor").getContent();
      const cssEditor = document.getElementById("css-editor");
      const jsEditor = document.getElementById("js-editor");

      const cssContent = cssEditor ? cssEditor.value : "";
      const jsContent = jsEditor ? jsEditor.value : "";

      logger.info("📦 Shared block data to save:", {
        sharedBlockId,
        blockName,
        htmlLength: htmlContent.length,
        cssLength: cssContent.length,
        jsLength: jsContent.length,
      });

      logger.info("📦 API request payload being sent:", {
        Name: blockName,
        HtmlContent: htmlContent ? `${htmlContent.substring(0, 50)}...` : null,
        CssContent: cssContent ? `${cssContent.substring(0, 50)}...` : null,
        JsContent: jsContent ? `${jsContent.substring(0, 50)}...` : null,
      });

      // Save to SharedContent API
      const response = await fetch(`/api/sharedcontent/${sharedBlockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: blockName,
          HtmlContent: htmlContent,
          CssContent: cssContent,
          JsContent: jsContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Shared block save failed:", errorText);
        throw new Error("Failed to save shared block");
      }

      const responseData = await response.json();
      logger.info("✅ Shared block saved successfully:", responseData);
      logger.info("✅ Server returned updated Name:", responseData.Name);
      logger.info("✅ Original blockName we sent:", blockName);

      // Update the current shared block instance on the canvas
      if (window.currentEditingSharedBlock) {
        // Update the block title in the header if name was changed
        if (blockName) {
          const titleElement = window.currentEditingSharedBlock.querySelector(
            ".content-block-title"
          );
          if (titleElement) {
            titleElement.textContent = blockName;
          }
        }

        const iframe = window.currentEditingSharedBlock.querySelector("iframe");
        if (iframe) {
          const updatedBlockData = {
            HtmlContent: htmlContent,
            CssContent: cssContent,
            JsContent: jsContent,
          };
          updateIframeContent(iframe, updatedBlockData);

          // Adjust iframe height
          setTimeout(() => {
            iframe.style.height =
              iframe.contentWindow.document.body.scrollHeight + "px";
          }, 100);
        }
      }

      // Update titles for all instances of this shared block on the canvas
      if (blockName) {
        const allSharedBlocks = document.querySelectorAll(
          `[data-shared-block-id="${sharedBlockId}"]`
        );
        allSharedBlocks.forEach((block) => {
          const titleElement = block.querySelector(".content-block-title");
          if (titleElement) {
            titleElement.textContent = blockName;
          }
        });
      }

      // Refresh all shared blocks of this type on the canvas
      refreshSharedBlockOnCanvas(sharedBlockId);

      // Notify other tabs/pages that this shared block was updated
      localStorage.setItem(
        "sharedBlockUpdated",
        JSON.stringify({
          blockId: sharedBlockId,
          timestamp: Date.now(),
        })
      );

      // Close the editor
      closeEditor();

      // Reset modal state
      const modal = document.getElementById("editor-modal");
      delete modal.dataset.editMode;
      delete modal.dataset.sharedBlockId;
      window.currentEditingSharedBlock = null;

      logger.info("✅ Shared block editing completed successfully");
    } catch (error) {
      console.error("❌ Error saving shared block:", error);
      showNotification(
        "Failed to save shared block: " + error.message,
        "error"
      );
    }
  }

  async function handleSavePage() {
    if (!currentPageId) return;
    const zoneContent = {};
    canvasArea
      .querySelectorAll(".layout-placeholder")
      .forEach((placeholder) => {
        const zoneId = placeholder.id;
        zoneContent[zoneId] = [];
        placeholder
          .querySelectorAll(".content-block-instance")
          .forEach((instance) => {
            const templateId = instance.dataset.templateId;
            if (templateId)
              zoneContent[zoneId].push({ type: "template", id: templateId });
          });
      });
    savePageBtn.disabled = true;
    savePageBtn.textContent = "Saving...";
    try {
      const response = await fetch(`/api/pages/${currentPageId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneContent }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save and publish page.");
      }
      const result = await response.json();
      showNotification(result.message, "success");
    } catch (error) {
      showNotification(`Could not publish the page: ${error.message}`, "error");
    } finally {
      savePageBtn.disabled = false;
      savePageBtn.textContent = "Save Page";
    }
  }

  function handleViewPage() {
    if (!currentPageId) {
      showNotification("Please create and save a page first.", "warning");
      return;
    }
    
    // Open preview in new tab, same as the existing View button
    const previewUrl = `/pages/${currentPageId}/preview`;
    window.open(previewUrl, "_blank");
  }

  function applyFilters() {
    if (!setFilter || !categoryFilter) return;
    const selectedSet = setFilter.value;
    const selectedCategory = categoryFilter.value;
    allCards.forEach((card) => {
      const setMatch =
        selectedSet === "all" || card.dataset.templateset === selectedSet;
      const categoryMatch =
        selectedCategory === "all" ||
        (selectedCategory === "null" && (!card.dataset.categoryId || card.dataset.categoryId === "null")) ||
        card.dataset.categoryId === selectedCategory;
      card.style.display = setMatch && categoryMatch ? "flex" : "none";
    });
  }
  if (setFilter) setFilter.addEventListener("change", applyFilters);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);

  const previewPopup = document.getElementById("image-preview-popup");
  if (previewPopup) {
    const previewImage = previewPopup.querySelector("img");
    allCards.forEach((card) => {
      card.addEventListener("mouseenter", (e) => {
        previewImage.src = card.querySelector("img").src;
        previewPopup.style.display = "block";
      });
      card.addEventListener("mouseleave", () => {
        previewPopup.style.display = "none";
      });
      card.addEventListener("mousemove", (e) => {
        previewPopup.style.left = e.clientX + 15 + "px";
        previewPopup.style.top = e.clientY + 15 + "px";
      });
    });
  }

  async function loadExistingPage(pageId) {
    logger.info("🔄 LOADING EXISTING PAGE:", pageId);
    if (!pageId) {
      logger.info("❌ No page ID provided");
      return;
    }

    try {
      logger.info(`🔍 DEBUG: Making fetch request to /api/pages/${pageId}`);
      const response = await fetch(`/api/pages/${pageId}`);
      logger.info(
        `🔍 DEBUG: Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.info(`❌ DEBUG: Response error text:`, errorText);
        throw new Error(
          `Failed to fetch page data: ${response.status} ${response.statusText}`
        );
      }
      const pageData = await response.json();
      logger.info(`✅ DEBUG: Received page data:`, pageData);

      currentPageId = pageData.PageID;
      currentPageInfo = {
        pageId: pageData.PageID,
        pageName: pageData.Title,
        websiteId: pageData.WebsiteID,
        domain: pageData.Hostname,
        url: pageData.URL,
        path: pageData.Path,
      };

      if (websiteSelector) websiteSelector.value = pageData.WebsiteID;
      await fetchAndPopulatePaths(pageData.WebsiteID);

      if (parentPathSelector && pageData.Path) {
        parentPathSelector.value = pageData.Path.substring(
          0,
          pageData.Path.lastIndexOf("/") + 1
        );
      }

      if (pageNameInput) pageNameInput.value = pageData.Title || "";
      if (layoutSelector) layoutSelector.value = pageData.PageTemplateID || "";
      if (pageUrlSlugInput && pageData.Path) {
        pageUrlSlugInput.value = pageData.Path.split("/").pop() || "";
      }

      if (websiteSelector) websiteSelector.parentElement.style.display = "none";
      if (createPageBtn) createPageBtn.style.display = "none";
      if (savePageBtn) savePageBtn.disabled = false;
      if (viewPageBtn) viewPageBtn.style.display = "inline-block";
      if (canvasTitle)
        canvasTitle.textContent = `Editing Page: ${pageData.Title}`;

      await loadPageLayout(pageData.PageTemplateID);

      // Check if blocks exist before iterating
      if (pageData.blocks && Array.isArray(pageData.blocks)) {
        logger.info("📦 Loading", pageData.blocks.length, "content blocks");
        for (const block of pageData.blocks) {
          const placeholder = document.getElementById(block.PlaceholderID);
          if (placeholder) {
            try {
              // Fetch the actual PageContentBlock data instead of just the template
              // This ensures we get the latest content including any changes made after unsharing
              const response = await fetch(
                `/api/pagecontentblocks/page/${block.ID}`
              );
              if (response.ok) {
                const blockData = await response.json();
                // For compatibility, also fetch the template data to check block type
                const templateResponse = await fetch(
                  `/api/pagecontentblocks/template/${block.ContentTemplateID}`
                );
                const templateData = templateResponse.ok
                  ? await templateResponse.json()
                  : { Name: "Unknown Block" };
                const tempElement = document.createElement("div");
                placeholder.appendChild(tempElement);

                // Check if this is a shared block by examining the template slug
                const isSharedBlock =
                  templateData.Slug &&
                  templateData.Slug.startsWith("shared-block-");

                // Use the actual block data as the primary source of content
                let blockDataToUse = {
                  ...blockData, // Use actual block content (HtmlContent, CssContent, JsContent)
                  Name: templateData.Name, // Use template name for block type detection
                  Slug: templateData.Slug, // Use template slug for shared block detection
                };

                // For shared blocks, fetch the latest data from SharedContent instead of using cached template
                if (isSharedBlock) {
                  const sharedBlockId = templateData.Slug.replace(
                    "shared-block-",
                    ""
                  );
                  try {
                    logger.info(
                      `🔄 Fetching fresh SharedContent data for block ${sharedBlockId}`
                    );
                    const sharedResponse = await fetch(
                      `/api/sharedcontent/${sharedBlockId}`
                    );
                    if (sharedResponse.ok) {
                      const sharedData = await sharedResponse.json();
                      logger.info(
                        `✅ Got fresh SharedContent data:`,
                        sharedData
                      );
                      // Use SharedContent data but keep the template structure
                      blockDataToUse = {
                        ...templateData, // Keep template metadata (ID, Slug, etc.)
                        HtmlContent: sharedData.HtmlContent,
                        CssContent: sharedData.CssContent,
                        JsContent: sharedData.JsContent,
                        Name: sharedData.Name,
                        Description: sharedData.Description,
                      };
                    } else {
                      console.warn(
                        `Failed to fetch fresh SharedContent for ${sharedBlockId}, using template data`
                      );
                    }
                  } catch (sharedError) {
                    console.error(
                      `Error fetching SharedContent for ${sharedBlockId}:`,
                      sharedError
                    );
                  }
                }

                // Check if this is a special block type (JavaScript, CSS, Empty)
                // Use templateData.Name for type detection since that determines the block type
                const isJavaScriptBlock =
                  templateData.Name === "JavaScript Block";
                const isCssBlock = templateData.Name === "CSS Block";
                const isEmptyBlock =
                  templateData.Name === "Empty Content Block";

                if (isJavaScriptBlock || isCssBlock || isEmptyBlock) {
                  // Use createSpecialBlockInstance for these block types
                  const blockType = isJavaScriptBlock
                    ? "javascript"
                    : isCssBlock
                    ? "css"
                    : "empty";
                  logger.info(`🔄 Loading existing ${blockType} block`);

                  createSpecialBlockInstance(
                    tempElement,
                    {
                      ...blockDataToUse, // This now includes the actual content from PageContentBlocks
                      ID: block.ID,
                      Name:
                        blockData.InstanceName ||
                        block.InstanceName ||
                        templateData.Name,
                      InstanceName:
                        blockData.InstanceName || block.InstanceName,
                    },
                    blockType
                  );
                } else {
                  createBlockInstance(
                    tempElement,
                    {
                      ...blockDataToUse, // This now includes actual content from PageContentBlocks
                      ID: block.ID,
                      // For shared blocks, use the fresh shared block name, otherwise use instance name
                      Name: isSharedBlock
                        ? blockDataToUse.Name
                        : blockData.InstanceName ||
                          block.InstanceName ||
                          templateData.Name,
                      InstanceName: isSharedBlock
                        ? blockDataToUse.Name
                        : blockData.InstanceName || block.InstanceName,
                    },
                    block.ContentTemplateID,
                    isSharedBlock
                  );
                }
              } else {
                console.error(
                  "Failed to load content template:",
                  block.ContentTemplateID
                );
              }
            } catch (blockError) {
              console.error("Error loading block:", block, blockError);
            }
          } else {
            console.warn("Placeholder not found:", block.PlaceholderID);
          }
        }
      } else {
        logger.info("📦 No content blocks to load");
      }
      logger.info("✅ EXISTING PAGE LOADED SUCCESSFULLY");
    } catch (error) {
      console.error("❌ ERROR LOADING EXISTING PAGE:", error);
    }
  }

  // Use unified notification system - showNotification is provided by notifications.js

  async function initializePage() {
    logger.info("🔄 INITIALIZING PAGE...");
    try {
      if (initialPageData) {
        logger.info("📄 Loading existing page data:", initialPageData);
        await loadExistingPage(initialPageData.PageID);
      } else if (currentWebsite && currentWebsite.CurrentWorkingSite) {
        logger.info(
          "🌐 Fetching paths for website:",
          currentWebsite.CurrentWorkingSite
        );
        await fetchAndPopulatePaths(currentWebsite.CurrentWorkingSite);
      } else {
        logger.info("❌ No website selected, disabling path selector");
        if (parentPathSelector) {
          parentPathSelector.disabled = true;
          parentPathSelector.innerHTML =
            '<option value="">-- No website selected --</option>';
        }
      }
      logger.info("✅ PAGE INITIALIZATION COMPLETE");
    } catch (error) {
      console.error("❌ ERROR DURING PAGE INITIALIZATION:", error);
    }
  }

  async function initializePathDropdown() {
    if (currentWebsite && currentWebsite.CurrentWorkingSite) {
      const websiteId = currentWebsite.CurrentWorkingSite;
      parentPathSelector.disabled = false;
      parentPathSelector.innerHTML =
        '<option value="/">Loading paths...</option>';
      try {
        const response = await fetch(`/api/websites/${websiteId}/paths`);
        if (!response.ok) throw new Error("Failed to load paths");
        const paths = await response.json();
        parentPathSelector.innerHTML = '<option value="/">/ (Root)</option>';
        paths.forEach((path) => {
          if (path !== "/") {
            const option = document.createElement("option");
            option.value = path;
            option.textContent = path;
            parentPathSelector.appendChild(option);
          }
        });
      } catch (error) {
        console.error("Error loading paths:", error);
        parentPathSelector.innerHTML = '<option value="/">/ (Root)</option>';
      }
    } else {
      parentPathSelector.disabled = true;
      parentPathSelector.innerHTML =
        '<option value="">-- No website selected --</option>';
    }
  }

  initializePathDropdown();
  initializePage();

  // Check if Tailwind CSS is loaded
  function checkTailwindCSS() {
    logger.info("🎨 CHECKING TAILWIND CSS...");
    const testElement = document.createElement("div");
    testElement.className = "hidden";
    document.body.appendChild(testElement);
    const isHidden = getComputedStyle(testElement).display === "none";
    document.body.removeChild(testElement);
    logger.info("Tailwind CSS loaded:", isHidden);
    return isHidden;
  }

  // Check Tailwind after a short delay
  setTimeout(() => {
    checkTailwindCSS();
  }, 1000);

  // --- Listen for shared block refresh messages from other tabs ---
  window.addEventListener("storage", function (e) {
    if (e.key === "sharedBlockRefresh" && e.newValue) {
      try {
        const refreshMessage = JSON.parse(e.newValue);
        logger.info(
          "🔄 Received shared block refresh message:",
          refreshMessage
        );

        if (refreshMessage.type === "REFRESH_SHARED_BLOCKS") {
          refreshSharedBlockOnCanvas(refreshMessage.sharedBlockId);
          // Also refresh the dropdown to show new/updated shared blocks
          fetchAndPopulateSharedBlocks();
        }
      } catch (error) {
        console.error("Error processing shared block refresh message:", error);
      }
    }
  });

  // --- Function to refresh a specific shared block on the canvas ---
  async function refreshSharedBlockOnCanvas(sharedBlockId) {
    try {
      logger.info(
        "🔄 Refreshing shared block on canvas and sidebar:",
        sharedBlockId
      );

      // If no specific sharedBlockId provided, refresh all shared blocks
      if (!sharedBlockId) {
        logger.info("🔄 Refreshing all shared blocks");

        // 1. Refresh the shared blocks dropdown
        await fetchAndPopulateSharedBlocks();

        // 2. Refresh all shared blocks on the canvas
        const sharedBlocks = document.querySelectorAll(
          ".content-block-instance.shared-block"
        );

        for (const blockElement of sharedBlocks) {
          const sharedBlockIdFromElement = blockElement.dataset.sharedBlockId;
          if (sharedBlockIdFromElement) {
            await refreshSingleSharedBlockElement(
              blockElement,
              sharedBlockIdFromElement
            );
          }
        }
        return;
      }

      // 1. Refresh shared blocks on the canvas that match the specific ID
      const sharedBlocks = document.querySelectorAll(
        ".content-block-instance.shared-block"
      );

      for (const blockElement of sharedBlocks) {
        const elementSharedBlockId = blockElement.dataset.sharedBlockId;
        if (elementSharedBlockId == sharedBlockId) {
          await refreshSingleSharedBlockElement(blockElement, sharedBlockId);
        }
      }

      // 2. Refresh the shared blocks in the sidebar
      logger.info("🔄 Refreshing shared blocks sidebar");
      await fetchAndPopulateSharedBlocks();
      logger.info("✅ Refreshed shared blocks sidebar");
    } catch (error) {
      console.error("Error refreshing shared block on canvas:", error);
    }
  }

  // --- Helper function to refresh a single shared block element ---
  async function refreshSingleSharedBlockElement(blockElement, sharedBlockId) {
    try {
      logger.info(
        "🔄 Refreshing shared block instance:",
        blockElement.dataset.instanceId,
        "with ID:",
        sharedBlockId
      );

      let blockData = null;

      // Always fetch fresh data from SharedContent for shared blocks (source of truth)
      const response = await fetch(`/api/sharedcontent/${sharedBlockId}`);
      if (!response.ok) {
        console.error(
          "Failed to fetch updated shared block data from SharedContent"
        );
        return;
      }
      blockData = await response.json();
      logger.info("📦 Got fresh data from SharedContent:", blockData);

      // Get the iframe inside this block and refresh its content
      const iframe = blockElement.querySelector("iframe");
      if (iframe) {
        // Update the iframe content with the latest shared block data
        updateIframeContent(iframe, blockData);
        logger.info("✅ Refreshed shared block iframe content");
      }
    } catch (error) {
      console.error("Error refreshing single shared block element:", error);
    }
  }

  // Function to open shared block editor directly in the buildpage modal
  async function openSharedBlockEditor(sharedBlockId, blockInstance) {
    try {
      logger.info("📡 Fetching shared block data for editing...");

      // Fetch shared block data from the SharedContent API
      const response = await fetch(`/api/sharedcontent/${sharedBlockId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shared block data");
      }

      const sharedBlockData = await response.json();
      logger.info("📦 Got shared block data:", sharedBlockData);

      // Clear any regular block editing state
      currentlyEditingBlockId = null;

      // Set modal mode to shared block editing
      const modal = document.getElementById("editor-modal");
      modal.dataset.editMode = "shared";
      modal.dataset.sharedBlockId = sharedBlockId;

      // Update modal title to indicate shared block editing
      const modalTitle = modal.querySelector(".modal-title");
      if (modalTitle) {
        modalTitle.textContent = `Edit Shared Block: ${
          sharedBlockData.Name || "Unnamed Block"
        }`;
      }

      // Store reference to the block instance for later updates
      window.currentEditingSharedBlock = blockInstance;

      // Populate the name input with shared block name
      const nameInput = modal.querySelector("#block-name-input");
      if (nameInput) {
        nameInput.value = sharedBlockData.Name || "";
      }

      // Initialize editors with shared block data (this will properly initialize TinyMCE)
      initializeEditors(sharedBlockData);

      // Show the modal
      modal.style.display = "block";
      document.body.classList.add("modal-open");

      logger.info("✅ Shared block editor opened successfully");
    } catch (error) {
      console.error("❌ Error opening shared block editor:", error);
      showNotification(
        "Failed to load shared block data for editing. Please try again.",
        "error"
      );
    }
  }

  // Expose refresh function globally so it can be called from content.js
  window.refreshSharedBlockOnCanvas = refreshSharedBlockOnCanvas;

  // --- New Shared Block Modal Functions ---
  function openNewSharedBlockModal() {
    logger.info("🆕 Opening new shared block modal");

    // Clear form fields
    if (sharedBlockNameInput) sharedBlockNameInput.value = "";
    if (sharedBlockDescriptionInput) sharedBlockDescriptionInput.value = "";
    if (sharedHtmlEditor) sharedHtmlEditor.value = "";
    if (sharedCssEditor) sharedCssEditor.value = "";
    if (sharedJsEditor) sharedJsEditor.value = "";

    // Reset to HTML tab
    const tabButtons = newSharedBlockModal.querySelectorAll(".tab-button");
    const tabContents = newSharedBlockModal.querySelectorAll(".tab-content");

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    const htmlTabBtn = newSharedBlockModal.querySelector(
      '[data-tab="shared-html"]'
    );
    const htmlTabContent =
      newSharedBlockModal.querySelector("#shared-html-tab");

    if (htmlTabBtn) htmlTabBtn.classList.add("active");
    if (htmlTabContent) htmlTabContent.classList.add("active");

    // Show modal
    newSharedBlockModal.style.display = "block";
    document.body.classList.add("modal-open");

    // Focus on name input
    if (sharedBlockNameInput) {
      setTimeout(() => sharedBlockNameInput.focus(), 100);
    }
  }

  function closeNewSharedBlockModal() {
    logger.info("❌ Closing new shared block modal");
    newSharedBlockModal.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  async function handleSaveNewSharedBlock() {
    logger.info("💾 Saving new shared block");

    try {
      // Validate required fields
      const name = sharedBlockNameInput?.value?.trim();
      if (!name) {
        showNotification("Please enter a name for the shared block", "error");
        sharedBlockNameInput?.focus();
        return;
      }

      // Check if we have a current working site
      if (!currentWorkingSite || !currentWorkingSite.WebsiteID) {
        showNotification(
          "No website selected. Please select a website first.",
          "error"
        );
        return;
      }

      // Prepare data
      const sharedBlockData = {
        WebsiteID: currentWorkingSite.WebsiteID,
        Name: name,
        Description: sharedBlockDescriptionInput?.value?.trim() || "",
        HtmlContent: sharedHtmlEditor?.value || "",
        CssContent: sharedCssEditor?.value || "",
        JsContent: sharedJsEditor?.value || "",
      };

      logger.info("📤 Sending shared block data:", sharedBlockData);

      // Save to server
      const response = await fetch("/api/sharedcontent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sharedBlockData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Duplicate name error
          throw new Error(
            errorData.error || "A shared block with this name already exists"
          );
        } else if (response.status === 400) {
          // Validation error
          throw new Error(errorData.error || "Invalid data provided");
        } else {
          throw new Error(errorData.error || "Failed to create shared block");
        }
      }

      const result = await response.json();
      logger.info("✅ Shared block created successfully:", result);

      // Show success notification
      showNotification(
        `Shared block "${name}" created successfully!`,
        "success"
      );

      // Close modal
      closeNewSharedBlockModal();

      // Refresh the shared blocks dropdown and container
      await fetchAndPopulateSharedBlocks();
    } catch (error) {
      console.error("❌ Error creating shared block:", error);
      showNotification(
        error.message || "Failed to create shared block. Please try again.",
        "error"
      );
    }
  }

  // Handle tab switching in new shared block modal
  newSharedBlockModal?.addEventListener("click", function (e) {
    if (e.target.classList.contains("tab-button")) {
      const targetTab = e.target.dataset.tab;

      // Remove active class from all tabs and contents
      const tabButtons = newSharedBlockModal.querySelectorAll(".tab-button");
      const tabContents = newSharedBlockModal.querySelectorAll(".tab-content");

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      e.target.classList.add("active");
      const targetContent = newSharedBlockModal.querySelector(
        `#${targetTab}-tab`
      );
      if (targetContent) {
        targetContent.classList.add("active");
      }
    }
  });

  // Close modal when clicking outside
  newSharedBlockModal?.addEventListener("click", function (e) {
    if (e.target === newSharedBlockModal) {
      closeNewSharedBlockModal();
    }
  });

  // --- Metadata Modal Functions ---
  async function openMetadataModal() {
    logger.info("📋 Opening metadata modal");
    const metadataModal = document.getElementById("metadata-modal");
    if (metadataModal) {
      metadataModal.style.display = "block";
      document.body.classList.add("modal-open");
      
      // Load existing metadata from database if we have a page
      if (currentPageId) {
        await loadPageMetadata(currentPageId);
      } else {
        // Clear fields if no page is selected
        clearMetadataFields();
      }
    }
  }

  async function loadPageMetadata(pageId) {
    try {
      logger.info(`📥 Loading metadata for page ${pageId}`);
      
      const response = await fetch(`/pages/${pageId}/metadata`);
      if (response.ok) {
        const metadata = await response.json();
        logger.info("📋 Loaded metadata:", metadata);
        
        // Populate form fields
        const metaTitle = document.getElementById("meta-title");
        const metaKeywords = document.getElementById("meta-keywords");
        const metaDescription = document.getElementById("meta-description");
        
        if (metaTitle) {
          metaTitle.value = metadata.MetaTitle || "";
        }
        if (metaKeywords) {
          metaKeywords.value = metadata.MetaKeywords || "";
        }
        if (metaDescription) {
          metaDescription.value = metadata.MetaDescription || "";
        }
        
        // Populate alternative URLs
        populateAlternativeUrls(metadata.AlternativeUrls || []);
        
      } else if (response.status === 404) {
        // No metadata exists yet - clear fields
        clearMetadataFields();
        logger.info("📋 No existing metadata found - fields cleared");
      } else {
        throw new Error("Failed to load metadata");
      }
    } catch (error) {
      logger.error("❌ Error loading metadata:", error);
      clearMetadataFields();
      showNotification("Could not load existing metadata", "warning");
    }
  }

  function clearMetadataFields() {
    const metaTitle = document.getElementById("meta-title");
    const metaKeywords = document.getElementById("meta-keywords");
    const metaDescription = document.getElementById("meta-description");
    
    if (metaTitle) metaTitle.value = "";
    if (metaKeywords) metaKeywords.value = "";
    if (metaDescription) metaDescription.value = "";
    
    // Clear alternative URLs and reset to one empty field
    const container = document.getElementById("alternative-urls-container");
    if (container) {
      container.innerHTML = `
        <div class="alternative-url-input">
          <input
            type="text"
            class="alternative-url-field"
            placeholder="/alternative-title"
          />
          <button type="button" class="remove-url-btn" disabled>
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    }
  }

  function populateAlternativeUrls(urls) {
    const container = document.getElementById("alternative-urls-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    // If no URLs, add one empty field
    if (urls.length === 0) {
      urls = [""];
    }
    
    urls.forEach((url, index) => {
      const urlDiv = document.createElement("div");
      urlDiv.className = "alternative-url-input";
      urlDiv.innerHTML = `
        <input
          type="text"
          class="alternative-url-field"
          placeholder="/alternative-title"
          value="${url || ""}"
        />
        <button type="button" class="remove-url-btn" ${index === 0 && urls.length === 1 ? 'disabled' : ''}>
          <i class="fas fa-trash"></i>
        </button>
      `;
      container.appendChild(urlDiv);
    });
    
    // Add event listeners to remove buttons
    setupAlternativeUrlHandlers();
  }

  function setupAlternativeUrlHandlers() {
    // Add remove URL button handlers
    const removeButtons = document.querySelectorAll(".remove-url-btn");
    removeButtons.forEach(button => {
      button.addEventListener("click", function() {
        const container = document.getElementById("alternative-urls-container");
        const urlInputs = container.querySelectorAll(".alternative-url-input");
        
        if (urlInputs.length > 1) {
          button.closest(".alternative-url-input").remove();
          
          // Update remove button states
          updateRemoveButtonStates();
        }
      });
    });
  }

  function updateRemoveButtonStates() {
    const container = document.getElementById("alternative-urls-container");
    const urlInputs = container.querySelectorAll(".alternative-url-input");
    const removeButtons = container.querySelectorAll(".remove-url-btn");
    
    removeButtons.forEach((button, index) => {
      button.disabled = urlInputs.length === 1;
    });
  }

  function closeMetadataModal() {
    logger.info("❌ Closing metadata modal");
    const metadataModal = document.getElementById("metadata-modal");
    if (metadataModal) {
      metadataModal.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  }

  async function handleSaveMetadata() {
    logger.info("💾 Saving page metadata");
    
    try {
      if (!currentPageId) {
        showNotification("Please create a page first before saving metadata", "error");
        return;
      }

      const metaTitle = document.getElementById("meta-title")?.value?.trim() || "";
      const metaKeywords = document.getElementById("meta-keywords")?.value?.trim() || "";
      const metaDescription = document.getElementById("meta-description")?.value?.trim() || "";
      
      // Collect alternative URLs
      const altUrlInputs = document.querySelectorAll(".alternative-url-field");
      const alternativeUrls = Array.from(altUrlInputs)
        .map(input => input.value?.trim())
        .filter(url => url && url.length > 0);

      const metadataData = {
        PageID: currentPageId,
        MetaTitle: metaTitle,
        MetaKeywords: metaKeywords,
        MetaDescription: metaDescription,
        AlternativeUrls: alternativeUrls
      };

      logger.info("📤 Sending metadata:", metadataData);

      const response = await fetch(`/pages/${currentPageId}/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadataData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save metadata");
      }

      const result = await response.json();
      logger.info("✅ Metadata saved successfully:", result);

      showNotification("Metadata saved successfully!", "success");
      closeMetadataModal();

      // Update current page info with new metadata
      if (currentPageInfo) {
        currentPageInfo.MetaTitle = metaTitle;
        currentPageInfo.MetaKeywords = metaKeywords;
        currentPageInfo.MetaDescription = metaDescription;
      }

    } catch (error) {
      logger.error("❌ Error saving metadata:", error);
      showNotification(
        error.message || "Failed to save metadata. Please try again.",
        "error"
      );
    }
  }

  logger.info("🎉 BUILDPAGE.JS INITIALIZATION COMPLETE");
});
