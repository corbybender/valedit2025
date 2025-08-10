/**
 * Notifications System
 * Simple, working version to fix server startup issues
 */

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

class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.historyDropdown = null;

    this.init();
  }

  init() {
    logger.info("🔔 Initializing NotificationManager");

    // Create notification container
    this.createNotificationContainer();
  }

  createNotificationContainer() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "notificationContainer";
      this.container.className = "fixed top-4 right-4 z-50 space-y-2";
      document.body.appendChild(this.container);
      logger.info("🔔 Notification container created");
    }
  }

  show(message, type = "info", options = {}) {
    logger.info("🔔 Showing notification:", message, type);

    const notification = {
      title: options.title || this.getDefaultTitle(type),
      message: message,
      type: type,
      date: new Date(),
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > 100) {
      this.notifications.pop();
    }

    // Create notification element
    const notificationElement = this.createNotificationElement(
      message,
      type,
      options.title
    );

    // Add to container
    this.container.appendChild(notificationElement);

    // Show notification
    setTimeout(() => {
      notificationElement.classList.add("show");
    }, 100);

    // Auto-remove after delay
    const delay = options.duration || 1500;
    setTimeout(() => {
      this.removeNotification(notificationElement);
    }, delay);

    // Log to database if enabled
    if (options.logToDatabase !== false) {
      this.logNotificationToDatabase(message, type, options).catch((error) => {
        console.warn("Failed to log notification to database:", error);
      });
    }

    return notificationElement;
  }

  createNotificationElement(message, type, title) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    const content = document.createElement("div");
    content.className = "notification-content";

    // Add icon
    const icon = document.createElement("i");
    icon.className = this.getIconClass(type);
    content.appendChild(icon);

    // Add text content
    const textDiv = document.createElement("div");
    textDiv.className = "notification-text";

    if (title) {
      const titleDiv = document.createElement("div");
      titleDiv.className = "notification-title";
      titleDiv.textContent = title;
      textDiv.appendChild(titleDiv);
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "notification-message";
    messageDiv.textContent = message;
    textDiv.appendChild(messageDiv);

    content.appendChild(textDiv);

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => this.removeNotification(notification);
    content.appendChild(closeBtn);

    notification.appendChild(content);
    return notification;
  }

  removeNotification(notification) {
    if (notification && notification.parentElement) {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }

  getIconClass(type) {
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-times-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };
    return icons[type] || icons.info;
  }

  getDefaultTitle(type) {
    const titles = {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Information",
    };
    return titles[type] || "Notification";
  }

  async logNotificationToDatabase(message, type, options = {}) {
    try {
      const notificationPayload = {
        title: options.title || this.getDefaultTitle(type),
        message: message,
        type: type,
        category: options.category || "system",
        relatedEntityType: options.relatedEntityType || null,
        relatedEntityID: options.relatedEntityID || null,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      };

      logger.info("🔔 Logging notification to database:", notificationPayload);

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationPayload),
      });

      if (response.ok) {
        logger.info("✅ Notification logged to database successfully");
      } else if (response.status === 401) {
        console.warn(
          "⚠️ User not authenticated - notification not logged to database"
        );
      } else {
        console.warn(
          "⚠️ Failed to log notification to database:",
          response.status
        );
      }
    } catch (error) {
      console.error("❌ Error logging notification to database:", error);
    }
  }

  async loadNotificationHistory() {
    // Notifications are now handled via /logs route
  }

  toggleHistory() {
    if (this.historyDropdown && this.historyDropdown.parentElement) {
      this.historyDropdown.remove();
      this.historyDropdown = null;
      return;
    }

    this.historyDropdown = document.createElement("div");
    this.historyDropdown.className = "notification-history-dropdown";

    this.historyDropdown.innerHTML = `
      <div class="notification-history-header">
        <h3>Notification History</h3>
        <button id="clear-notifications-btn">Clear All</button>
      </div>
      <div class="notification-history-body"></div>
    `;

    document.body.appendChild(this.historyDropdown);

    const body = this.historyDropdown.querySelector(
      ".notification-history-body"
    );
    if (this.notifications.length === 0) {
      body.innerHTML = "<p>No notifications</p>";
    } else {
      this.notifications.forEach((notification) => {
        const item = document.createElement("div");
        item.className = "notification-history-item";
        item.innerHTML = `
          <div class="notification-history-item-title">${notification.title}</div>
          <div class="notification-history-item-message">${notification.message}</div>
        `;
        body.appendChild(item);
      });
    }

    this.historyDropdown
      .querySelector("#clear-notifications-btn")
      .addEventListener("click", () => {
        this.notifications = [];
        this.toggleHistory();
      });
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
    window.notificationManager = new NotificationManager();
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
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
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
