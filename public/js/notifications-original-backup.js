/**
 * Unified Notification System
 * Handles both real-time notifications and notification history
 */

// Immediate test to verify file loading
logger.info("🔔 NOTIFICATIONS.JS FILE LOADED - TOP OF FILE");
if (typeof window !== "undefined") {
  window.NOTIFICATIONS_JS_LOADED = true;
}

class NotificationManager {
  constructor() {
    logger.info("🔔 NotificationManager constructor called");
    try {
      this.container = null;
      this.historyContainer = null;
      this.bellIcon = null;
      this.badge = null;
      this.unreadCount = 0;
      this.notifications = [];
      this.isHistoryOpen = false;

      this.init();
      logger.info("🔔 NotificationManager constructor completed successfully");
    } catch (error) {
      console.error("🔔 Error in NotificationManager constructor:", error);
      throw error;
    }
  }

  init() {
    logger.info("🔔 NotificationManager init() called");

    // Find or create notification container
    this.container = document.getElementById("notificationContainer");
    logger.info("🔔 Found notification container:", !!this.container);

    if (!this.container) {
      logger.info("🔔 Creating notification container");
      this.container = document.createElement("div");
      this.container.id = "notificationContainer";
      this.container.className = "notification-container";
      document.body.appendChild(this.container);
    }

    // Initialize notification history
    logger.info("🔔 Calling initNotificationHistory");
    this.initNotificationHistory();

    // Load existing notifications (async, non-blocking)
    logger.info("🔔 Calling loadNotificationHistory");
    this.loadNotificationHistory().catch((error) => {
      console.error("🔔 Error loading notification history:", error);
    });

    logger.info("🔔 NotificationManager init() completed");
  }

  initNotificationHistory() {
    logger.info("🔔 Initializing notification history");
    // Find the bell icon or create it
    const headerActions = document.querySelector(".header-actions");
    logger.info("🔔 Header actions found:", !!headerActions);

    if (headerActions) {
      logger.info("🔔 Header actions HTML:", headerActions.innerHTML);

      // Create bell icon container
      const bellContainer = document.createElement("div");
      bellContainer.className = "notification-bell-container";
      bellContainer.innerHTML = `
        <button id="notification-bell" class="notification-bell-btn" title="Notifications">
          <i class="fas fa-bell"></i>
          <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
        </button>
      `;

      // Insert before font controls
      const fontControls = headerActions.querySelector(".font-controls");
      logger.info("🔔 Font controls found:", !!fontControls);

      if (fontControls) {
        headerActions.insertBefore(bellContainer, fontControls);
        logger.info("🔔 Bell inserted before font controls");
      } else {
        headerActions.appendChild(bellContainer);
        logger.info("🔔 Bell appended to header actions");
      }

      this.bellIcon = document.getElementById("notification-bell");
      this.badge = document.getElementById("notification-badge");

      logger.info("🔔 Bell icon element:", !!this.bellIcon);
      logger.info("🔔 Badge element:", !!this.badge);

      // Create notification history dropdown
      this.createHistoryDropdown();

      // Add event listeners
      if (this.bellIcon) {
        this.bellIcon.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleHistory();
        });
        logger.info("🔔 Bell icon click listener added");
      }

      // Close history when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".notification-bell-container")) {
          this.closeHistory();
        }
      });
    } else {
      console.error("🔔 Header actions not found!");
    }
  }

  createHistoryDropdown() {
    const bellContainer = document.querySelector(
      ".notification-bell-container"
    );
    if (bellContainer) {
      const dropdown = document.createElement("div");
      dropdown.className = "notification-history-dropdown";
      dropdown.id = "notification-history";
      dropdown.style.display = "none";
      dropdown.innerHTML = `
        <div class="notification-history-header">
          <h3>Notifications</h3>
          <button id="mark-all-read" class="mark-all-read-btn">Mark all as read</button>
        </div>
        <div class="notification-history-content" id="notification-history-content">
          <div class="loading">Loading notifications...</div>
        </div>
        <div class="notification-history-footer">
          <button id="clear-all-notifications" class="clear-all-btn">Clear all</button>
        </div>
      `;

      bellContainer.appendChild(dropdown);
      this.historyContainer = dropdown;

      // Add event listeners for history actions
      document.getElementById("mark-all-read").addEventListener("click", () => {
        this.markAllAsRead();
      });

      document
        .getElementById("clear-all-notifications")
        .addEventListener("click", () => {
          this.clearAllNotifications();
        });
    }
  }

  /**
   * Show a notification banner
   * @param {string} message - The notification message
   * @param {string} type - The notification type ('success', 'error', 'warning', 'info')
   * @param {Object} options - Additional options
   */
  show(message, type = "info", options = {}) {
    const {
      title = "",
      duration = 5000,
      persistent = false,
      category = "general",
      relatedEntityType = null,
      relatedEntityID = null,
      saveToHistory = true,
    } = options;

    // Create notification element
    const notification = this.createNotificationElement(message, type, title);

    // Add to container
    this.container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Auto-remove if not persistent
    if (!persistent && duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    // Save to history if enabled
    if (saveToHistory) {
      this.saveToHistory(
        title || message,
        message,
        type,
        category,
        relatedEntityType,
        relatedEntityID
      );
    }

    return notification;
  }

  createNotificationElement(message, type, title) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    const iconMap = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    const icon = iconMap[type] || iconMap.info;

    notification.innerHTML = `
      <div class="notification-content">
        <i class="${icon}"></i>
        <div class="notification-text">
          ${title ? `<div class="notification-title">${title}</div>` : ""}
          <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="notificationManager.removeNotification(this.parentElement.parentElement)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    return notification;
  }

  removeNotification(notification) {
    if (notification && notification.parentElement) {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }
  }

  async saveToHistory(
    title,
    message,
    type,
    category,
    relatedEntityType,
    relatedEntityID
  ) {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          type,
          category,
          relatedEntityType,
          relatedEntityID,
        }),
      });

      if (response.ok) {
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error("Failed to save notification to history:", error);
    }
  }

  async loadNotificationHistory() {
    logger.info("🔔 loadNotificationHistory() called");
    try {
      logger.info("🔔 Fetching notifications from /api/notifications");
      const response = await fetch("/api/notifications");
      logger.info("🔔 Response status:", response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        logger.info("🔔 Received notification data:", data);
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
        this.updateBadge();
        this.renderHistory();
      } else if (response.status === 401) {
        logger.info(
          "🔔 User not authenticated, skipping notification history load"
        );
        // Initialize with empty data for non-authenticated users
        this.notifications = [];
        this.unreadCount = 0;
        this.updateBadge();
        this.renderHistory();
      } else {
        console.warn(
          "🔔 API response not OK:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("🔔 Failed to load notification history:", error);
    }
  }

  renderHistory() {
    logger.info("🔔 renderHistory() called");
    const content = document.getElementById("notification-history-content");
    if (!content) {
      logger.info(
        "🔔 notification-history-content element not found, skipping render"
      );
      return;
    }

    if (this.notifications.length === 0) {
      content.innerHTML =
        '<div class="no-notifications">No notifications yet</div>';
      return;
    }

    content.innerHTML = this.notifications
      .map(
        (notification) => `
      <div class="history-notification ${
        notification.IsRead ? "read" : "unread"
      }" data-id="${notification.ID}">
        <div class="history-notification-content">
          <div class="history-notification-header">
            <span class="history-notification-title">${
              notification.Title
            }</span>
            <span class="history-notification-time">${this.formatTime(
              notification.CreatedAt
            )}</span>
          </div>
          <div class="history-notification-message">${
            notification.Message
          }</div>
          <div class="history-notification-meta">
            <span class="notification-type-badge type-${notification.Type}">${
          notification.Type
        }</span>
            ${
              notification.Category
                ? `<span class="notification-category">${notification.Category}</span>`
                : ""
            }
          </div>
        </div>
        <button class="history-notification-close" onclick="notificationManager.removeFromHistory(${
          notification.ID
        })">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
      )
      .join("");

    // Add click listeners to mark as read
    content.querySelectorAll(".history-notification.unread").forEach((item) => {
      item.addEventListener("click", () => {
        this.markAsRead(parseInt(item.dataset.id));
      });
    });
  }

  toggleHistory() {
    if (this.isHistoryOpen) {
      this.closeHistory();
    } else {
      this.openHistory();
    }
  }

  openHistory() {
    if (this.historyContainer) {
      this.historyContainer.style.display = "block";
      this.isHistoryOpen = true;
      this.loadNotificationHistory(); // Refresh data
    }
  }

  closeHistory() {
    if (this.historyContainer) {
      this.historyContainer.style.display = "none";
      this.isHistoryOpen = false;
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        // Update local state
        const notification = this.notifications.find(
          (n) => n.ID === notificationId
        );
        if (notification && !notification.IsRead) {
          notification.IsRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateBadge();
          this.renderHistory();
        }
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
      });

      if (response.ok) {
        this.notifications.forEach((n) => (n.IsRead = true));
        this.unreadCount = 0;
        this.updateBadge();
        this.renderHistory();
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  async removeFromHistory(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        this.notifications = this.notifications.filter(
          (n) => n.ID !== notificationId
        );
        const wasUnread = this.notifications.find(
          (n) => n.ID === notificationId && !n.IsRead
        );
        if (wasUnread) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.updateBadge();
        this.renderHistory();
      }
    } catch (error) {
      console.error("Failed to remove notification:", error);
    }
  }

  async clearAllNotifications() {
    if (confirm("Are you sure you want to clear all notifications?")) {
      try {
        const response = await fetch("/api/notifications", {
          method: "DELETE",
        });

        if (response.ok) {
          this.notifications = [];
          this.unreadCount = 0;
          this.updateBadge();
          this.renderHistory();
        }
      } catch (error) {
        console.error("Failed to clear all notifications:", error);
      }
    }
  }

  async updateUnreadCount() {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        this.unreadCount = data.count || 0;
        this.updateBadge();
      }
    } catch (error) {
      console.error("Failed to update unread count:", error);
    }
  }

  updateBadge() {
    if (this.badge) {
      if (this.unreadCount > 0) {
        this.badge.textContent =
          this.unreadCount > 99 ? "99+" : this.unreadCount.toString();
        this.badge.style.display = "block";
      } else {
        this.badge.style.display = "none";
      }
    }
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  // Convenience methods for different notification types
  success(message, options = {}) {
    return this.show(message, "success", options);
  }

  error(message, options = {}) {
    return this.show(message, "error", options);
  }

  warning(message, options = {}) {
    return this.show(message, "warning", options);
  }

  info(message, options = {}) {
    return this.show(message, "info", options);
  }
}

// Create global instance when DOM is ready
let notificationManager;

// Initialize when DOM is ready
logger.info("🔔 Notifications.js loaded, DOM state:", document.readyState);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    logger.info("🔔 DOM loaded, initializing NotificationManager");
    try {
      notificationManager = new NotificationManager();
      logger.info("🔔 NotificationManager created successfully");
    } catch (error) {
      console.error("🔔 Error creating NotificationManager:", error);
    }
  });
} else {
  // DOM is already ready
  logger.info("🔔 DOM already ready, initializing NotificationManager");
  try {
    notificationManager = new NotificationManager();
    logger.info("🔔 NotificationManager created successfully");
  } catch (error) {
    console.error("🔔 Error creating NotificationManager:", error);
  }
}

// Global function for backward compatibility
function showNotification(message, type = "info", options = {}) {
  logger.info(
    "🔔 showNotification called:",
    message,
    type,
    "Manager ready:",
    !!notificationManager
  );
  if (notificationManager) {
    return notificationManager.show(message, type, options);
  } else {
    // Fallback: create a simple notification if manager not ready
    console.warn(
      "NotificationManager not ready, showing fallback notification"
    );
    const container =
      document.getElementById("notificationContainer") || document.body;
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      padding: 12px 20px; border-radius: 4px; color: white;
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
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
}

// Additional global functions for dashboard test buttons
function updateNotificationCount() {
  if (notificationManager) {
    return notificationManager.updateUnreadCount();
  }
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NotificationManager,
    notificationManager,
    showNotification,
  };
}
