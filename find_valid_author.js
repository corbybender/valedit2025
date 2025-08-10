const sql = require("mssql");
const db = require("./db");

async function findValidAuthor() {
  try {
    await db.connect();
    logger.info("🔍 Finding valid AuthorID...");

    const authorsResult = await db.request().query(`
      SELECT TOP 5 *
      FROM Authors
      ORDER BY AuthorID
    `);

    logger.info("\n📋 Available Authors:");
    authorsResult.recordset.forEach((author) => {
      logger.info(`   Author record:`, author);
    });

    // Also check existing notifications to see what AuthorIDs are being used
    const notificationAuthorsResult = await db.request().query(`
      SELECT DISTINCT AuthorID, COUNT(*) as NotificationCount
      FROM Notifications
      GROUP BY AuthorID
      ORDER BY NotificationCount DESC
    `);

    logger.info("\n📊 AuthorIDs currently used in notifications:");
    notificationAuthorsResult.recordset.forEach((author) => {
      logger.info(
        `   AuthorID: ${author.AuthorID}, Notifications: ${author.NotificationCount}`
      );
    });
  } catch (error) {
    console.error("❌ Error finding valid author:", error);
  }
}

findValidAuthor();
