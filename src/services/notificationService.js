const sql = require("mssql");
const db = require("../../db");

/**
 * Notification Service
 * Centralized service for creating notifications across all routes and actions
 */
class NotificationService {
  /**
   * Create a new notification
   * @param {Object} params - Notification parameters
   * @param {number} params.userId - The user ID to notify
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {string} [params.type='info'] - Notification type (success, error, warning, info)
   * @param {string} [params.category='general'] - Notification category
   * @param {number} [params.websiteId=null] - Related website ID
   * @param {string} [params.relatedEntityType=null] - Type of related entity (page, content, user, etc.)
   * @param {string} [params.relatedEntityID=null] - ID of related entity
   * @param {Object} [params.metadata=null] - Additional metadata
   * @returns {Promise<Object>} Created notification object
   */
  static async createNotification({
    userId,
    title,
    message,
    type = "info",
    category = "general",
    websiteId = null,
    relatedEntityType = null,
    relatedEntityID = null,
    metadata = null,
  }) {
    try {
      if (!userId) {
        logger.warn("NotificationService: No user ID provided");
        return null;
      }

      if (!title && !message) {
        logger.warn("NotificationService: No title or message provided");
        return null;
      }

      const pool = await db;
      const request = pool.request();

      request
        .input("userId", sql.Int, userId)
        .input("title", sql.NVarChar(255), title || message.substring(0, 255))
        .input("message", sql.NVarChar(1000), message)
        .input("type", sql.NVarChar(20), type)
        .input("category", sql.NVarChar(50), category)
        .input("relatedEntityType", sql.NVarChar(50), relatedEntityType)
        .input("relatedEntityID", sql.NVarChar(100), relatedEntityID)
        .input(
          "metadata",
          sql.NVarChar(sql.MAX),
          metadata ? JSON.stringify(metadata) : null
        );

      // Handle WebsiteID - only include if not null
      let query;
      if (websiteId !== null && websiteId !== undefined) {
        request.input("websiteId", sql.BigInt, websiteId);
        query = `
          INSERT INTO Notifications 
          (AuthorID, WebsiteID, Title, Message, Type, Category, RelatedEntityType, RelatedEntityID, Metadata)
          OUTPUT INSERTED.ID, INSERTED.CreatedAt
          VALUES (@userId, @websiteId, @title, @message, @type, @category, @relatedEntityType, @relatedEntityID, @metadata)
        `;
      } else {
        query = `
          INSERT INTO Notifications 
          (AuthorID, Title, Message, Type, Category, RelatedEntityType, RelatedEntityID, Metadata)
          OUTPUT INSERTED.ID, INSERTED.CreatedAt
          VALUES (@userId, @title, @message, @type, @category, @relatedEntityType, @relatedEntityID, @metadata)
        `;
      }

      const result = await request.query(query);

      const notification = {
        id: result.recordset[0].ID,
        createdAt: result.recordset[0].CreatedAt,
        title,
        message,
        type,
        category,
      };

      logger.info(
        `📢 Notification created: ${title} (${type}) for user ${userId}`
      );
      return notification;
    } catch (error) {
      logger.error("NotificationService: Error creating notification", {
        error: error,
      });
      return null;
    }
  }

  /**
   * Convenience method for success notifications
   */
  static async success({
    userId,
    title,
    message,
    category,
    websiteId,
    relatedEntityType,
    relatedEntityID,
    metadata,
  }) {
    return this.createNotification({
      userId,
      title,
      message,
      type: "success",
      category,
      websiteId,
      relatedEntityType,
      relatedEntityID,
      metadata,
    });
  }

  /**
   * Convenience method for error notifications
   */
  static async error({
    userId,
    title,
    message,
    category,
    websiteId,
    relatedEntityType,
    relatedEntityID,
    metadata,
  }) {
    return this.createNotification({
      userId,
      title,
      message,
      type: "error",
      category,
      websiteId,
      relatedEntityType,
      relatedEntityID,
      metadata,
    });
  }

  /**
   * Convenience method for warning notifications
   */
  static async warning({
    userId,
    title,
    message,
    category,
    websiteId,
    relatedEntityType,
    relatedEntityID,
    metadata,
  }) {
    return this.createNotification({
      userId,
      title,
      message,
      type: "warning",
      category,
      websiteId,
      relatedEntityType,
      relatedEntityID,
      metadata,
    });
  }

  /**
   * Convenience method for info notifications
   */
  static async info({
    userId,
    title,
    message,
    category,
    websiteId,
    relatedEntityType,
    relatedEntityID,
    metadata,
  }) {
    return this.createNotification({
      userId,
      title,
      message,
      type: "info",
      category,
      websiteId,
      relatedEntityType,
      relatedEntityID,
      metadata,
    });
  }

  /**
   * Helper to extract user ID from request
   */
  static getUserId(req) {
    return req.session?.authorID || null;
  }

  /**
   * Helper to extract website ID from request
   */
  static getWebsiteId(req) {
    return (
      req.session?.currentWebsiteId ||
      req.body?.websiteId ||
      req.params?.websiteId ||
      null
    );
  }

  /**
   * Create notification for user operations
   */
  static async notifyUserAction({
    req,
    action,
    targetUserId = null,
    success = true,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const type = success ? "success" : "error";
    const targetUser = targetUserId ? `user ${targetUserId}` : "user";
    const title = success ? `${action} completed` : `${action} failed`;
    const message = success
      ? `Successfully ${action.toLowerCase()} ${targetUser}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`
      : `Failed to ${action.toLowerCase()} ${targetUser}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`;

    return this.createNotification({
      userId,
      title,
      message,
      type,
      category: "user_management",
      relatedEntityType: "user",
      relatedEntityID: targetUserId?.toString(),
    });
  }

  /**
   * Create notification for website operations
   */
  static async notifyWebsiteAction({
    req,
    action,
    websiteId = null,
    success = true,
    websiteName = null,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const type = success ? "success" : "error";
    const website =
      websiteName || (websiteId ? `website ${websiteId}` : "website");
    const title = success ? `${action} completed` : `${action} failed`;

    // Enhanced message with detailed site information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${website}`
      : `Failed to ${action.toLowerCase()} ${website}`;

    if (websiteId) {
      detailedMessage += ` (Site ID: ${websiteId})`;
    }
    if (websiteName && websiteId) {
      detailedMessage += ` - Site Name: ${websiteName}`;
    }
    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "website_management",
      websiteId,
      relatedEntityType: "website",
      relatedEntityID: websiteId?.toString(),
    });
  }

  /**
   * Create notification for page operations
   */
  static async notifyPageAction({
    req,
    action,
    pageId = null,
    success = true,
    pageName = null,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const page = pageName || (pageId ? `page ${pageId}` : "page");
    const title = success ? `${action} completed` : `${action} failed`;

    // Enhanced message with detailed page information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${page}`
      : `Failed to ${action.toLowerCase()} ${page}`;

    if (pageId) {
      detailedMessage += ` (Page ID: ${pageId})`;
    }
    if (pageName && pageId) {
      detailedMessage += ` - Page Name: ${pageName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }
    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "page_management",
      websiteId,
      relatedEntityType: "page",
      relatedEntityID: pageId?.toString(),
    });
  }

  /**
   * Create notification for content operations
   */
  static async notifyContentAction({
    req,
    action,
    contentId = null,
    success = true,
    contentName = null,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const content =
      contentName || (contentId ? `content ${contentId}` : "content");
    const title = success ? `${action} completed` : `${action} failed`;

    // Enhanced message with detailed content block information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${content}`
      : `Failed to ${action.toLowerCase()} ${content}`;

    if (contentId) {
      detailedMessage += ` (Content Block ID: ${contentId})`;
    }
    if (contentName && contentId) {
      detailedMessage += ` - Block Name: ${contentName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }

    // Check if this is a shared block operation
    if (action.toLowerCase().includes("shared")) {
      detailedMessage += ` - Block Type: Shared Content Block`;
    } else if (action.toLowerCase().includes("page")) {
      detailedMessage += ` - Block Type: Page Content Block`;
    }

    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "content_management",
      websiteId,
      relatedEntityType: "content",
      relatedEntityID: contentId?.toString(),
    });
  }

  /**
   * Create notification for template operations
   */
  static async notifyTemplateAction({
    req,
    action,
    templateId = null,
    success = true,
    templateName = null,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const template =
      templateName || (templateId ? `template ${templateId}` : "template");
    const title = success ? `${action} completed` : `${action} failed`;
    const message = success
      ? `Successfully ${action.toLowerCase()} ${template}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`
      : `Failed to ${action.toLowerCase()} ${template}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`;

    return this.createNotification({
      userId,
      title,
      message,
      type,
      category: "template_management",
      websiteId,
      relatedEntityType: "template",
      relatedEntityID: templateId?.toString(),
    });
  }

  /**
   * Create notification for authentication events
   */
  static async notifyAuthAction({
    req,
    action,
    success = true,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    // For login, we might not have userId yet, so we can skip notification creation
    if (!userId && action !== "logout") return null;

    const type = success ? "success" : "error";
    const title = success ? `${action} successful` : `${action} failed`;
    const message = success
      ? `Successfully ${action.toLowerCase()}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`
      : `Failed to ${action.toLowerCase()}${
          additionalInfo ? `: ${additionalInfo}` : ""
        }`;

    // Temporarily disable authentication notifications to prevent WebsiteID issues
    // TODO: Fix WebsiteID column requirement in Notifications table
    logger.debug(
      `📢 Auth notification (disabled): ${action} ${
        success ? "successful" : "failed"
      }${additionalInfo ? ` - ${additionalInfo}` : ""}`
    );
    return null;
  }

  /**
   * Create notification for Azure Storage operations
   */
  static async notifyStorageAction({
    req,
    action,
    fileName = null,
    success = true,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const file = fileName || "file";
    const title = success ? `${action} completed` : `${action} failed`;

    // Enhanced message with detailed file information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${file}`
      : `Failed to ${action.toLowerCase()} ${file}`;

    if (fileName) {
      detailedMessage += ` - File: ${fileName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }
    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "storage_management",
      websiteId,
      relatedEntityType: "file",
      relatedEntityID: fileName,
    });
  }

  /**
   * Create notification for shared content operations
   */
  static async notifySharedContentAction({
    req,
    action,
    sharedBlockId = null,
    success = true,
    blockName = null,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const sharedBlock =
      blockName ||
      (sharedBlockId ? `shared block ${sharedBlockId}` : "shared block");
    const title = success ? `${action} completed` : `${action} failed`;

    // Enhanced message with detailed shared block information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${sharedBlock}`
      : `Failed to ${action.toLowerCase()} ${sharedBlock}`;

    if (sharedBlockId) {
      detailedMessage += ` (Shared Block ID: ${sharedBlockId})`;
    }
    if (blockName && sharedBlockId) {
      detailedMessage += ` - Block Name: ${blockName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }
    detailedMessage += ` - Block Type: Shared Content Block`;

    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "shared_content_management",
      websiteId,
      relatedEntityType: "shared_content",
      relatedEntityID: sharedBlockId?.toString(),
    });
  }

  /**
   * Create notification for publish operations
   */
  static async notifyPublishAction({
    req,
    action,
    pageId = null,
    pageName = null,
    success = true,
    publishType = "page",
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const entity =
      pageName || (pageId ? `${publishType} ${pageId}` : publishType);
    const title = success ? `${action} successful` : `${action} failed`;

    // Enhanced message with detailed publish information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${entity}`
      : `Failed to ${action.toLowerCase()} ${entity}`;

    if (pageId) {
      detailedMessage += ` (${
        publishType.charAt(0).toUpperCase() + publishType.slice(1)
      } ID: ${pageId})`;
    }
    if (pageName && pageId) {
      detailedMessage += ` - ${
        publishType.charAt(0).toUpperCase() + publishType.slice(1)
      } Name: ${pageName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }

    if (success) {
      detailedMessage += ` - Status: Published Successfully`;
    } else {
      detailedMessage += ` - Status: Publish Failed`;
    }

    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "publishing",
      websiteId,
      relatedEntityType: publishType,
      relatedEntityID: pageId?.toString(),
    });
  }

  /**
   * Create notification for deletion operations
   */
  static async notifyDeletionAction({
    req,
    action,
    entityId = null,
    entityName = null,
    entityType = "item",
    success = true,
    additionalInfo = null,
  }) {
    const userId = this.getUserId(req);
    if (!userId) return null;

    const websiteId = this.getWebsiteId(req);
    const type = success ? "success" : "error";
    const entity =
      entityName || (entityId ? `${entityType} ${entityId}` : entityType);
    const title = success ? `${action} successful` : `${action} failed`;

    // Enhanced message with detailed deletion information
    let detailedMessage = success
      ? `Successfully ${action.toLowerCase()} ${entity}`
      : `Failed to ${action.toLowerCase()} ${entity}`;

    if (entityId) {
      detailedMessage += ` (${
        entityType.charAt(0).toUpperCase() + entityType.slice(1)
      } ID: ${entityId})`;
    }
    if (entityName && entityId) {
      detailedMessage += ` - ${
        entityType.charAt(0).toUpperCase() + entityType.slice(1)
      } Name: ${entityName}`;
    }
    if (websiteId) {
      detailedMessage += ` - Site ID: ${websiteId}`;
    }

    detailedMessage += ` - Action: ${
      entityType.charAt(0).toUpperCase() + entityType.slice(1)
    } Deleted`;

    if (additionalInfo) {
      detailedMessage += ` - Details: ${additionalInfo}`;
    }

    return this.createNotification({
      userId,
      title,
      message: detailedMessage,
      type,
      category: "deletion",
      websiteId,
      relatedEntityType: entityType,
      relatedEntityID: entityId?.toString(),
    });
  }
}

module.exports = NotificationService;
