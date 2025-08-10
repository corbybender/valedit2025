/**
 * Fixed Notification System
 * Simplified and more reliable implementation
 */

logger.info("🔔 NOTIFICATIONS-FIXED.JS LOADING");

class NotificationManager {
  constructor() {
    logger.info("🔔 NotificationManager constructor called");
    this.container = null;
    this.bellIcon = null;
    this.badge = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.historyDropdown = null;

    // Initialize immediately
    this.init();
  }

  init() {
    logger.info("🔔 NotificationManager init() called");

    // Create notification container
    this.createNotificationContainer();

    // Create bell icon
    this.createBellIcon();

    // Load notification history
    this.loadNotificationHistory().catch((error) => {
      console.error("🔔 Error loading notification history:", error);
    });

    logger.info("🔔 NotificationManager init() completed");
  }

  createNotificationContainer() {
    logger.info("🔔 Creating notification container");

    // Find existing container or create new one
    this.container = document.getElementById("notificationContainer");

    if (!this.container) {
      logger.info("🔔 Creating new notification container");
      this.container = document.createElement("div");
      this.container.id = "notificationContainer";
      this.container.className = "notification-container";
      document.body.appendChild(this.container);
    }

    logger.info("🔔 Notification container ready:", !!this.container);
  }

  createBellIcon() {
    logger.info("🔔 Creating bell icon");

    const headerActions = document.querySelector(".header-actions");
    logger.info("🔔 Header actions found:", !!headerActions);

    if (!headerActions) {
      console.error("🔔 Header actions not found - cannot create bell icon");
      return;
    }

    // Remove existing bell if any
    const existingBell = document.querySelector(".notification-bell-container");
    if (existingBell) {
      existingBell.remove();
      logger.info("🔔 Removed existing bell icon");
    }

    // Create bell container
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
    if (fontControls) {
      headerActions.insertBefore(bellContainer, fontControls);
      logger.info("🔔 Bell inserted before font controls");
    } else {
      headerActions.appendChild(bellContainer);
      logger.info("🔔 Bell appended to header actions");
    }

    // Get references to bell elements
    this.bellIcon = document.getElementById("notification-bell");
    this.badge = document.getElementById("notification-badge");

    logger.info("🔔 Bell icon element:", !!this.bellIcon);
    logger.info("🔔 Badge element:", !!this.badge);

    if (this.bellIcon) {
      // Create history dropdown
      this.createHistoryDropdown();

      // Add click event listener
      this.bellIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        logger.info("🔔 Bell icon clicked");
        this.toggleHistory();
      });

      logger.info("🔔 Bell icon event listener added");
    }

    // Close history when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".notification-bell-container")) {
        this.closeHistory();
      }
    });
  }

  createHistoryDropdown() {
    logger.info("🔔 Creating history dropdown");

    const bellContainer = document.querySelector(
      ".notification-bell-container"
    );
    if (!bellContainer) {
      console.error("🔔 Bell container not found for dropdown");
      return;
    }

    // Remove existing dropdown
    const existingDropdown = document.getElementById("notification-history");
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Create dropdown
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
    `;

    bellContainer.appendChild(dropdown);
    this.historyDropdown = dropdown;

    // Add event listener for mark all as read
    const markAllReadBtn = dropdown.querySelector("#mark-all-read");
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener("click", () => {
        this.markAllAsRead();
      });
    }

    logger.info("🔔 History dropdown created");
  }

  show(message, type = "info", options = {}) {
    logger.info("🔔 Showing notification:", message, type);

    if (!this.container) {
      console.error("🔔 Notification container not available");
      this.createNotificationContainer();
    }

    // Create notification element
    const notification = this.createNotificationElement(
      message,
      type,
      options.title
    );

    // Add to container
    this.container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Auto-remove after duration
    const duration = options.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    logger.info("🔔 Notification displayed");
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
        <button class="notification-close" onclick="this.closest('.notification').remove()">
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

  toggleHistory() {
    if (!this.historyDropdown) {
      console.error("🔔 History dropdown not available");
      return;
    }

    const isVisible = this.historyDropdown.style.display !== "none";
    if (isVisible) {
      this.closeHistory();
    } else {
      this.openHistory();
    }
  }

  openHistory() {
    if (this.historyDropdown) {
      this.historyDropdown.style.display = "block";
      this.renderHistory();
      logger.info("🔔 History dropdown opened");
    }
  }

  closeHistory() {
    if (this.historyDropdown) {
      this.historyDropdown.style.display = "none";
      logger.info("🔔 History dropdown closed");
    }
  }

  async loadNotificationHistory() {
    logger.info("🔔 Loading notification history");
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
        this.updateBadge();
        logger.info("🔔 Loaded", this.notifications.length, "notifications");
      }
    } catch (error) {
      console.error("🔔 Failed to load notification history:", error);
      // Don't throw error - just continue without history
    }
  }

  renderHistory() {
    const content = document.getElementById("notification-history-content");
    if (!content) return;

    if (this.notifications.length === 0) {
      content.innerHTML =
        '<div class="no-notifications">No notifications</div>';
      return;
    }

    content.innerHTML = this.notifications
      .map(
        (notification) => `
        <div class="notification-item ${!notification.IsRead ? "unread" : ""}" 
             data-id="${notification.ID}">
          <div class="notification-title">${
            notification.Title || "Notification"
          }</div>
          <div class="notification-message">${notification.Message}</div>
          <div class="notification-time">${this.formatTime(
            notification.CreatedAt
          )}</div>
          <div class="notification-actions">
            ${
              !notification.IsRead
                ? `<button onclick="notificationManager.markAsRead(${notification.ID})">Mark as read</button>`
                : ""
            }
            <button onclick="notificationManager.removeFromHistory(${
              notification.ID
            })">Remove</button>
          </div>
        </div>
      `
      )
      .join("");
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
      logger.info("🔔 Badge updated:", this.unreadCount);
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
        const wasUnread = this.notifications.find(
          (n) => n.ID === notificationId && !n.IsRead
        );
        this.notifications = this.notifications.filter(
          (n) => n.ID !== notificationId
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

  // Convenience methods
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

// Global variables
let notificationManager;

// Initialize when DOM is ready
function initializeNotifications() {
  logger.info("🔔 Initializing notifications, DOM state:", document.readyState);

  try {
    notificationManager = new NotificationManager();
    window.NOTIFICATIONS_JS_LOADED = true;
    logger.info("🔔 NotificationManager created successfully");
  } catch (error) {
    console.error("🔔 Error creating NotificationManager:", error);
  }
}

// Check if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNotifications);
} else {
  // DOM is already ready
  initializeNotifications();
}

// Global function for backward compatibility
function showNotification(message, type = "info", options = {}) {
  logger.info("🔔 showNotification called:", message, type);

  if (notificationManager) {
    return notificationManager.show(message, type, options);
  } else {
    console.warn(
      "🔔 NotificationManager not ready, creating fallback notification"
    );

    // Create a simple fallback notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      padding: 15px 20px; border-radius: 5px; color: white; font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2); max-width: 300px;
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

    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);

    return notification;
  }
}

// Additional global functions
function updateNotificationCount() {
  if (notificationManager) {
    return notificationManager.updateUnreadCount();
  }
}

logger.info("🔔 NOTIFICATIONS-FIXED.JS LOADED");
