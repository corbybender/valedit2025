const sql = require("mssql");
const db = require("./db");

async function checkNotifications() {
  try {
    // Ensure database connection is established
    await db.connect();
    logger.info("🔍 Checking current notifications in database...");

    const result = await db.request().query(`
      SELECT TOP 10 
        ID, Title, Message, Type, Category, CreatedAt, 
        RelatedEntityType, RelatedEntityID, WebsiteID, AuthorID
      FROM Notifications 
      ORDER BY CreatedAt DESC
    `);

    logger.info(
      `\n📊 Found ${result.recordset.length} recent notifications:\n`
    );

    result.recordset.forEach((notification, index) => {
      logger.info(
        `${index + 1}. [${notification.Type.toUpperCase()}] ${
          notification.Title
        }`
      );
      logger.debug(`   Message: ${notification.Message}`);
      logger.debug(`   Category: ${notification.Category}`);
      logger.debug(
        `   Entity: ${notification.RelatedEntityType || "N/A"} (ID: ${
          notification.RelatedEntityID || "N/A"
        })`
      );
      logger.debug(`   Website ID: ${notification.WebsiteID || "N/A"}`);
      logger.debug(`   Created: ${notification.CreatedAt}`);
      logger.debug("   ---");
    });

    logger.info("\n🔍 Checking notification categories:");
    const categoriesResult = await db.request().query(`
      SELECT Category, COUNT(*) as Count
      FROM Notifications 
      GROUP BY Category
      ORDER BY Count DESC
    `);

    categoriesResult.recordset.forEach((cat) => {
      logger.info(`   ${cat.Category}: ${cat.Count} notifications`);
    });
  } catch (error) {
    console.error("❌ Error checking notifications:", error);
  }
}

checkNotifications();
