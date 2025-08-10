const express = require("express");
const sql = require("mssql");
const db = require("./db");

async function debugNotificationIssue() {
  try {
    await db.connect();
    logger.info("🔍 Debugging notification bell issue...");

    // Check all users and their notification counts
    logger.info("\n1. Checking all users and their notification counts:");
    const allUsersResult = await db.request().query(`
      SELECT 
        a.AuthorID, 
        a.AuthorName, 
        COUNT(n.ID) as NotificationCount,
        COUNT(CASE WHEN n.IsRead = 0 THEN 1 END) as UnreadCount
      FROM Authors a
      LEFT JOIN Notifications n ON a.AuthorID = n.AuthorID
      GROUP BY a.AuthorID, a.AuthorName
      ORDER BY NotificationCount DESC
    `);

    allUsersResult.recordset.forEach((user) => {
      logger.info(
        `   User ${user.AuthorID} (${user.AuthorName}): ${user.NotificationCount} total, ${user.UnreadCount} unread`
      );
    });

    // Check the notification route in detail
    logger.info("\n2. Testing GET /api/notifications route requirements:");

    // Simulate a request without session (what might be happening)
    logger.info("   Testing without session...");
    const mockReqWithoutSession = { session: null };
    const userId1 = mockReqWithoutSession.session?.authorID;
    logger.info(
      `   - userId from session: ${userId1} (should be undefined/null)`
    );

    // Simulate a request with session
    logger.info("   Testing with session...");
    const mockReqWithSession = {
      session: {
        authorID: 5,
        userInfo: { name: "Test User" },
      },
    };
    const userId2 = mockReqWithSession.session?.authorID;
    logger.info(`   - userId from session: ${userId2} (should be 5)`);

    if (userId2) {
      logger.info("   - Session valid, would proceed with query");

      // Show what the actual route returns
      const notificationsResult = await db
        .request()
        .input("userId", sql.Int, userId2)
        .input("limit", sql.Int, 50)
        .input("offset", sql.Int, 0).query(`
          SELECT 
            ID, Title, Message, Type, IsRead, CreatedAt, ReadAt, 
            Category, RelatedEntityType, RelatedEntityID, Metadata, WebsiteID
          FROM Notifications 
          WHERE AuthorID = @userId 
          ORDER BY CreatedAt DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

      logger.info(
        `   - Would return ${notificationsResult.recordset.length} notifications`
      );
    } else {
      logger.info("   - No session, would return 401 error");
    }

    // Check what pages are being served and how they authenticate
    logger.info("\n3. Authentication status check:");
    logger.info("   - The bell should only work if user is logged in");
    logger.info("   - Session must contain authorID property");
    logger.info("   - Frontend makes GET request to /api/notifications");
    logger.info("   - This request must include session cookies");

    logger.info("\n💡 LIKELY ISSUES:");
    logger.info("   1. User might not be logged in when bell loads");
    logger.info("   2. Session cookies might not be sent with AJAX request");
    logger.info("   3. Session might expire between page load and bell click");
    logger.info("   4. CORS or authentication middleware issue");
  } catch (error) {
    console.error("❌ Error debugging notifications:", error);
  }
}

debugNotificationIssue();
