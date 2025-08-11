const express = require("express");
const router = express.Router();
const { BlobServiceClient } = require("@azure/storage-blob");
const multer = require("multer");
const sanitizeFilename = require("sanitize-filename");
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");

// Ensure logger is available (it's set up globally in debug-logger.js)
const logger = global.logger || console;

// --- Azure Blob Storage Setup ---
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!connectionString || !containerName) {
  throw new Error(
    "Azure Storage connection string or container name is not configured in .env file."
  );
}

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

const baseUrl = process.env.AZURE_STORAGE_PUBLIC_URL
  ? `${process.env.AZURE_STORAGE_PUBLIC_URL}/${containerName}`
  : `${containerClient.url}`;

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// --- Helper Functions ---
async function listBlobsByPrefix(prefix) {
  const blobs = [];
  for await (const blob of containerClient.listBlobsByHierarchy("/", {
    prefix,
  })) {
    if (blob.kind === "blob" && blob.name.replace(prefix, "")) {
      blobs.push({
        name: blob.name.replace(prefix, ""),
        url: `${baseUrl}/${blob.name}`,
        lastModified: blob.properties.lastModified,
        size: blob.properties.contentLength,
      });
    }
  }
  return blobs;
}

async function getAllowedLibraryProviders(websiteID) {
  logger.debug(
    `🔍 [DEBUG] getAllowedLibraryProviders called with websiteID: ${websiteID} (type: ${typeof websiteID})`
  );

  if (!websiteID) {
    logger.debug("⚠️  [DEBUG] No websiteID provided, returning empty array");
    return [];
  }

  try {
    logger.debug(
      `📊 [DEBUG] Starting database query for WebsiteID: ${websiteID}`
    );
    logger.debug(
      `🔗 [DEBUG] Database connection status: ${
        db ? "Connected" : "Not connected"
      }`
    );

    const pool = await db;
    const request = pool.request();
    logger.debug(
      `📝 [DEBUG] Adding SQL parameter - WebsiteID: ${websiteID} (BigInt)`
    );
    request.input("WebsiteID", sql.BigInt, websiteID);

    const sqlQuery =
      "SELECT LibraryProviderName, DisplayName FROM dbo.WebsiteLibraryProviderLinks WHERE WebsiteID = @WebsiteID";
    logger.debug(`🎯 [DEBUG] Executing SQL query: ${sqlQuery}`);
    logger.debug(`🔢 [DEBUG] Query parameters: WebsiteID = ${websiteID}`);

    const startTime = Date.now();
    const result = await request.query(sqlQuery);
    const queryTime = Date.now() - startTime;

    logger.debug(`⏱️  [DEBUG] Query completed in ${queryTime}ms`);
    logger.debug(`📋 [DEBUG] Raw database result:`, {
      recordsetLength: result.recordset ? result.recordset.length : 0,
      recordset: result.recordset,
      rowsAffected: result.rowsAffected,
      returnValue: result.returnValue,
    });

    if (!result.recordset) {
      logger.debug("❌ [DEBUG] No recordset returned from query");
      return [];
    }

    logger.debug(
      `📊 [DEBUG] Database query returned ${result.recordset.length} records for WebsiteID ${websiteID}:`
    );

    result.recordset.forEach((row, index) => {
      logger.debug(`  📝 [DEBUG] Record ${index + 1}:`, {
        LibraryProviderName: row.LibraryProviderName,
        DisplayName: row.DisplayName,
        rawRow: row,
      });
    });

    const providers = result.recordset.map((row, index) => {
      const mapped = {
        providerName: row.LibraryProviderName,
        displayName: row.DisplayName || row.LibraryProviderName, // Fallback to provider name if no display name
      };
      logger.debug(`🔄 [DEBUG] Mapping record ${index + 1}:`, {
        original: row,
        mapped: mapped,
      });
      return mapped;
    });

    logger.debug(
      `✅ [DEBUG] Final mapped library providers for WebsiteID ${websiteID}:`,
      providers
    );
    logger.debug(`📊 [DEBUG] Returning ${providers.length} providers`);

    return providers;
  } catch (error) {
    console.error("❌ [ERROR] getAllowedLibraryProviders failed:", {
      error: error.message,
      stack: error.stack,
      websiteID: websiteID,
      errorCode: error.code,
      errorNumber: error.number,
      severity: error.severity,
      state: error.state,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
    });
    return [];
  }
}

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}

// --- Routes ---
router.get("/", (req, res) => {
  res.render("pages/AzureStorage", {
    title: "Azure Storage Manager",
    user: req.user,
  });
});

// Debug route to check current website
router.get("/debug/current-website", (req, res) => {
  res.json({
    currentWebsiteID: res.locals.currentWebsiteID,
    currentWebsite: res.locals.currentWebsite,
    authorID: res.locals.authorID,
    sessionInfo: {
      hasSession: !!req.session,
      authorID: req.session?.authorID,
      userInfo: req.session?.userInfo,
    },
  });
});

// Debug route to check WebsiteLibraryProviderLinks
router.get("/debug/library-providers", async (req, res) => {
  try {
    const websiteID = res.locals.currentWebsiteID;
    logger.debug(
      `🔍 [DEBUG-ENDPOINT] WebsiteLibraryProviderLinks debug requested for websiteID: ${websiteID}`
    );

    if (!websiteID) {
      return res.json({
        error: "No current websiteID found",
        websiteID: websiteID,
        locals: res.locals,
      });
    }

    // Get providers using our function
    const providers = await getAllowedLibraryProviders(websiteID);

    // Also do a raw query to see what's actually in the database
    const rawQuery =
      "SELECT * FROM dbo.WebsiteLibraryProviderLinks WHERE WebsiteID = @WebsiteID";
    logger.debug(`📝 [DEBUG-ENDPOINT] Executing raw query: ${rawQuery}`);

    const rawResult = await db
      .request()
      .input("WebsiteID", sql.BigInt, websiteID)
      .query(rawQuery);

    logger.debug(
      `📊 [DEBUG-ENDPOINT] Raw query returned ${rawResult.recordset.length} records`
    );

    // Get all records for all websites (for comparison)
    const allRecordsQuery =
      "SELECT * FROM dbo.WebsiteLibraryProviderLinks ORDER BY WebsiteID, LibraryProviderName";
    const pool = await db;
    const allRecordsResult = await pool.request().query(allRecordsQuery);

    res.json({
      success: true,
      websiteID: websiteID,
      websiteIDType: typeof websiteID,
      currentProviders: providers,
      currentProvidersCount: providers.length,
      rawQueryResult: {
        recordCount: rawResult.recordset.length,
        records: rawResult.recordset,
      },
      allRecords: {
        totalCount: allRecordsResult.recordset.length,
        records: allRecordsResult.recordset,
        websiteIDs: [
          ...new Set(allRecordsResult.recordset.map((r) => r.WebsiteID)),
        ],
      },
      debugInfo: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        dbConnected: !!db,
      },
    });
  } catch (error) {
    console.error(`❌ [ERROR] Debug endpoint failed:`, error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      websiteID: res.locals.currentWebsiteID,
    });
  }
});
router.get("/api/list", async (req, res) => {
  try {
    const docs = await listBlobsByPrefix("docs/");
    const images = await listBlobsByPrefix("images/");

    res.json({
      docs,
      images,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({
      message: "Failed to list files.",
      error: error.message,
    });
  }
});

// POST /api/browse: API for hierarchical folder Browse
router.post("/api/browse", async (req, res) => {
  const prefix = req.body.prefix || "";
  const continuationToken = req.body.continuationToken || undefined;
  const websiteID = res.locals.currentWebsiteID;

  logger.debug(
    `📝 [DEBUG] Browse API called with prefix: "${prefix}", websiteID: ${websiteID} (type: ${typeof websiteID})`
  );
  logger.debug(`📊 [DEBUG] Browse - Request details:`, {
    prefix: prefix,
    websiteID: websiteID,
    continuationToken: continuationToken,
    hasWebsiteID: !!websiteID,
    prefixType: typeof prefix,
  });

  if (
    !prefix.startsWith("images/") &&
    !prefix.startsWith("docs/") &&
    prefix !== ""
  ) {
    return res
      .status(403)
      .json({ message: "Access to the requested path is forbidden." });
  }

  // Check if websiteID is available
  if (!websiteID) {
    logger.error("❌ [ERROR] No websiteID available in browse API");
    return res.status(400).json({
      message: "No working website selected. Please select a website first.",
      error: "MISSING_WEBSITE_ID",
    });
  }

  try {
    const folders = [];
    const files = [];
    const maxPageSize = 24;

    // Special handling for images/ root directory - show virtual library provider folders
    if (prefix === "images/" && !continuationToken) {
      logger.debug(
        `Debug: Entering images/ root handling for WebsiteID: ${websiteID}`
      );
      const allowedProviders = await getAllowedLibraryProviders(websiteID);
      logger.debug(
        `Debug: WebsiteID ${websiteID}, Allowed providers for images/ root:`,
        allowedProviders
      );

      // For each allowed provider, check for case variations that actually exist in Azure storage
      logger.debug(
        `🔍 [DEBUG] Processing ${allowedProviders.length} allowed providers for case variations...`
      );
      for (const provider of allowedProviders) {
        logger.debug(
          `📝 [DEBUG] Checking variations for provider: "${provider.providerName}" (Display: "${provider.displayName}")`
        );

        // Generate possible case variations of the provider name
        const variations = [
          provider.providerName, // Original from database (e.g., librariesProvider120)
          provider.providerName.toLowerCase(), // All lowercase (e.g., librariesprovider120)
          provider.providerName.charAt(0).toLowerCase() +
            provider.providerName.slice(1), // First letter lowercase (e.g., librariesProvider120)
        ];
        logger.debug(
          `🔄 [DEBUG] Generated variations for "${provider.providerName}":`,
          variations
        );

        // Remove duplicates
        const uniqueVariations = [...new Set(variations)];
        logger.debug(
          `🎯 [DEBUG] Unique variations after deduplication:`,
          uniqueVariations
        );

        // Check which variations actually exist in Azure storage
        for (const variation of uniqueVariations) {
          const testPath = `images/${variation}/`;
          logger.debug(
            `🔍 [DEBUG] Testing if variation exists in Azure: "${testPath}"`
          );

          try {
            const testPages = containerClient
              .listBlobsByHierarchy("/", { prefix: testPath })
              .byPage({ maxPageSize: 1 });
            const testPage = await testPages.next();

            logger.debug(`📊 [DEBUG] Azure test result for "${testPath}":`, {
              done: testPage.done,
              blobItems: testPage.done
                ? 0
                : testPage.value.segment.blobItems.length,
              blobPrefixes: testPage.done
                ? 0
                : testPage.value.segment.blobPrefixes.length,
            });

            // Always show library provider folders, regardless of whether they exist in Azure yet
            // This allows users to navigate into empty folders and upload files
            const displayName = provider.displayName || variation;
            logger.debug(`🏷️  [DEBUG] Creating folder entry for library provider:`, {
              name: displayName,
              path: `images/${variation}/`,
              actualProvider: variation,
              providerId: provider.providerName,
              existsInAzure: !testPage.done && (testPage.value.segment.blobItems.length > 0 || testPage.value.segment.blobPrefixes.length > 0)
            });

            folders.push({
              name: displayName,
              path: `images/${variation}/`,
              actualProvider: variation, // Store the actual provider name for path resolution
              providerId: provider.providerName, // Store LibraryProviderName for tooltip
            });
            
            if (!testPage.done &&
              (testPage.value.segment.blobItems.length > 0 ||
                testPage.value.segment.blobPrefixes.length > 0)) {
              logger.debug(`✅ [DEBUG] Library provider "${variation}" has existing content in Azure`);
            } else {
              logger.debug(`📝 [DEBUG] Library provider "${variation}" is empty - users can upload files to create it`);
            }
            
            // Break after adding the first variation that matches the provider
            // (We don't want duplicate folders for the same provider)
            break;
          } catch (azureError) {
            console.error(
              `❌ [ERROR] Azure test failed for variation "${variation}":`,
              {
                error: azureError.message,
                variation: variation,
                testPath: testPath,
              }
            );
          }
        }
      }

      logger.debug(
        `Debug: Found ${folders.length} existing library provider variations`
      );

      // Don't add any other folders from Azure storage for images/ root
      // Only show the existing library provider variations

      logger.debug(
        `Debug: Returning ${folders.length} folders and ${files.length} files for images/ root`
      );
      logger.debug(
        `Debug: Folders being returned:`,
        folders.map((f) => f.name)
      );

      res.json({
        prefix,
        folders,
        files,
        continuationToken: null, // No pagination for virtual folders
      });
    } else if (prefix.startsWith("images/") && prefix !== "images/") {
      // Handle browsing inside any folder under images/ - could be a library provider or other folder
      const folderName = prefix.replace("images/", "").split("/")[0]; // Get first folder name

      logger.debug(
        `Debug: Browsing folder "${folderName}" under images/, full prefix: "${prefix}"`
      );

      // Check if this is a library provider variation from our allowed list
      const allowedProviders = await getAllowedLibraryProviders(websiteID);
      logger.debug(
        `📊 [DEBUG] Browse - Retrieved ${allowedProviders.length} allowed providers for folder validation:`,
        allowedProviders
      );

      // Check if folderName is a variation of any allowed provider
      let isAllowedProvider = false;
      let matchedProvider = null;

      logger.debug(
        `🔍 [DEBUG] Browse - Checking if folder "${folderName}" matches any allowed provider variations...`
      );

      for (const provider of allowedProviders) {
        const variations = [
          provider.providerName, // Original from database (e.g., librariesProvider120)
          provider.providerName.toLowerCase(), // All lowercase (e.g., librariesprovider120)
          provider.providerName.charAt(0).toLowerCase() +
            provider.providerName.slice(1), // First letter lowercase (e.g., librariesProvider120)
        ];

        logger.debug(
          `🔄 [DEBUG] Browse - Testing provider "${provider.providerName}" variations against "${folderName}":`,
          variations
        );

        if (variations.includes(folderName)) {
          isAllowedProvider = true;
          matchedProvider = provider;
          logger.debug(
            `✅ [DEBUG] Browse - MATCH FOUND! Provider "${provider.providerName}" matches folder "${folderName}"`
          );
          break;
        } else {
          logger.debug(
            `❌ [DEBUG] Browse - No match for provider "${provider.providerName}" against folder "${folderName}"`
          );
        }
      }

      logger.debug(
        `🎯 [DEBUG] Browse - Final result: isAllowedProvider=${isAllowedProvider}, matchedProvider=${
          matchedProvider ? matchedProvider.providerName : "null"
        }`
      );

      if (isAllowedProvider && matchedProvider) {
        logger.debug(
          `✅ [DEBUG] Browse - "${folderName}" is an allowed library provider (matched: "${matchedProvider.providerName}") - using exact database path`
        );

        // Use the exact prefix as provided - no case conversion
        const actualPrefix = prefix;
        logger.debug(`Debug: Using exact prefix: ${actualPrefix}`);

        const pages = containerClient
          .listBlobsByHierarchy("/", { prefix: actualPrefix })
          .byPage({ continuationToken, maxPageSize });
        const page = await pages.next();

        logger.debug(`Debug: Azure API response - page.done: ${page.done}`);
        if (!page.done) {
          logger.debug(
            `Debug: Found ${page.value.segment.blobItems.length} blob items and ${page.value.segment.blobPrefixes.length} blob prefixes`
          );

          // Log all found items for debugging
          page.value.segment.blobItems.forEach((item, index) => {
            logger.debug(`Debug: Blob item ${index}: ${item.name}`);
          });
          page.value.segment.blobPrefixes.forEach((item, index) => {
            logger.debug(`Debug: Blob prefix ${index}: ${item.name}`);
          });
        } else {
          logger.debug(
            `Debug: Azure API returned empty result for prefix: ${actualPrefix}`
          );
        }

        if (!page.done) {
          // Add files
          for (const item of page.value.segment.blobItems) {
            if (
              item.name.includes("tmb-0") ||
              item.name.includes("tmb-thumbnail") ||
              item.name.endsWith(".folderplaceholder")
            ) {
              continue;
            }
            files.push({
              name: item.name.replace(actualPrefix, ""),
              url: `${baseUrl}/${item.name}`,
              lastModified: item.properties.lastModified,
              size: item.properties.contentLength,
              fullName: item.name,
            });
          }

          // Add subfolders
          for (const item of page.value.segment.blobPrefixes) {
            const subFolderName = item.name
              .replace(actualPrefix, "")
              .replace("/", "");
            folders.push({
              name: subFolderName,
              path: prefix + subFolderName + "/", // Use virtual path
            });
          }
        }

        logger.debug(
          `Debug: Found ${files.length} files and ${folders.length} folders in ${actualPrefix}`
        );

        res.json({
          prefix,
          folders,
          files,
          continuationToken: page.value.continuationToken || null,
        });
      } else {
        logger.debug(
          `Debug: "${folderName}" is not a library provider - treating as regular folder`
        );
        // This is a regular folder browsing (non-library provider)
        const pages = containerClient
          .listBlobsByHierarchy("/", { prefix })
          .byPage({ continuationToken, maxPageSize });
        const page = await pages.next();

        if (!page.done) {
          // Add files
          for (const item of page.value.segment.blobItems) {
            if (
              item.name.includes("tmb-0") ||
              item.name.includes("tmb-thumbnail") ||
              item.name.endsWith(".folderplaceholder")
            ) {
              continue;
            }
            files.push({
              name: item.name.replace(prefix, ""),
              url: `${baseUrl}/${item.name}`,
              lastModified: item.properties.lastModified,
              size: item.properties.contentLength,
              fullName: item.name,
            });
          }

          // Add folders
          if (!continuationToken) {
            for (const item of page.value.segment.blobPrefixes) {
              const subFolderName = item.name
                .replace(prefix, "")
                .replace("/", "");
              folders.push({
                name: subFolderName,
                path: item.name,
              });
            }
          }
        }

        res.json({
          prefix,
          folders,
          files,
          continuationToken: page.value.continuationToken || null,
        });
      }
    } else {
      // Handle normal browsing (non-library provider paths)
      const pages = containerClient
        .listBlobsByHierarchy("/", { prefix })
        .byPage({ continuationToken, maxPageSize });
      const page = await pages.next();

      if (!page.done) {
        // Add files
        for (const item of page.value.segment.blobItems) {
          if (
            item.name.includes("tmb-0") ||
            item.name.includes("tmb-thumbnail") ||
            item.name.endsWith(".folderplaceholder")
          ) {
            continue;
          }
          files.push({
            name: item.name.replace(prefix, ""),
            url: `${baseUrl}/${item.name}`,
            lastModified: item.properties.lastModified,
            size: item.properties.contentLength,
            fullName: item.name,
          });
        }

        // Add folders
        if (!continuationToken) {
          for (const item of page.value.segment.blobPrefixes) {
            const folderName = item.name.replace(prefix, "").replace("/", "");
            folders.push({
              name: folderName,
              path: item.name,
            });
          }
        }
      }

      res.json({
        prefix,
        folders,
        files,
        continuationToken: page.value.continuationToken || null,
      });
    }
  } catch (error) {
    console.error("Error Browse blobs:", error);
    res
      .status(500)
      .json({ message: "Failed to browse files.", error: error.message });
  }
});

// Other routes remain unchanged
router.post("/api/upload", (req, res, next) => {
  upload.array("files")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          message: "File too large. Maximum file size is 50MB.",
          error: "FILE_TOO_LARGE"
        });
      }
      return res.status(500).json({ 
        message: "File upload error occurred.",
        error: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  let folder; // Declare folder at function scope so it's accessible in catch block
  
  try {
    const { folderPath } = req.body;
    const authorID = req.session.authorID;
    const websiteID = res.locals.currentWebsiteID;

    if (!authorID || !folderPath) {
      return res
        .status(400)
        .json({ error: "AuthorID and folderPath are required." });
    }

    if (websiteID) {
      const pool = await db;
      const validateAccess = await pool
        .request()
        .input("AuthorID", sql.Int, authorID)
        .input("WebsiteID", sql.BigInt, websiteID)
        .query(
          "SELECT 1 FROM dbo.AuthorWebsiteAccess WHERE AuthorID = @AuthorID AND WebsiteID = @WebsiteID"
        );

      if (validateAccess.recordset.length === 0) {
        return res
          .status(403)
          .json({ error: "You do not have access to this website." });
      }
    }

    folder = req.body.folder; // Assign to the function-scoped variable

    // Debug logging
    logger.debug(
      `📋 [DEBUG] Upload request - folder: "${
        folder || folderPath
      }", websiteID: ${websiteID}, files:`,
      req.files.map((file) => file.originalname)
    );
    logger.debug(`📊 [DEBUG] Upload - Request details:`, {
      folderPath: folderPath,
      folder: folder,
      websiteID: websiteID,
      authorID: authorID,
      fileCount: req.files.length,
    });

    folder = folder || folderPath;

    // Handle virtual library provider paths - check for allowed variations
    if (folder.startsWith("images/")) {
      const folderName = folder.replace("images/", "").split("/")[0];
      logger.debug(
        `📝 [DEBUG] Upload - Checking library provider access for folder: "${folderName}" (from path: "${folder}")`
      );

      const allowedProviders = await getAllowedLibraryProviders(websiteID);
      logger.debug(
        `📊 [DEBUG] Upload - Retrieved ${allowedProviders.length} allowed providers for websiteID ${websiteID}:`,
        allowedProviders
      );

      // Check if folderName is a variation of any allowed provider
      let isAllowedProvider = false;
      let matchedProvider = null;

      for (const provider of allowedProviders) {
        const variations = [
          provider.providerName, // Original from database (e.g., librariesProvider120)
          provider.providerName.toLowerCase(), // All lowercase (e.g., librariesprovider120)
          provider.providerName.charAt(0).toLowerCase() +
            provider.providerName.slice(1), // First letter lowercase (e.g., librariesProvider120)
        ];

        logger.debug(
          `🔄 [DEBUG] Upload - Checking provider "${provider.providerName}" variations:`,
          variations
        );

        if (variations.includes(folderName)) {
          isAllowedProvider = true;
          matchedProvider = provider;
          logger.debug(
            `✅ [DEBUG] Upload - Found matching provider: "${provider.providerName}" for folder "${folderName}"`
          );
          break;
        } else {
          logger.debug(
            `❌ [DEBUG] Upload - No match for provider "${provider.providerName}" against folder "${folderName}"`
          );
        }
      }

      if (isAllowedProvider && matchedProvider) {
        logger.debug(
          `✅ [DEBUG] Upload - Access granted for library provider variation. Using exact path: "${folder}" (matched provider: "${matchedProvider.providerName}")`
        );
        // Use the folder path exactly as provided - no case conversion
      } else {
        logger.debug(
          `❌ [DEBUG] Upload - Access denied. Folder "${folderName}" is not a variation of any allowed provider`
        );
      }
    }

    if (!folder) {
      return res.status(400).json({ message: "Folder path is required." });
    }

    if (!folder.endsWith("/")) {
      folder += "/";
    }

    if (!folder.startsWith("docs/") && !folder.startsWith("images/")) {
      return res
        .status(403)
        .json({ message: "Access to the requested path is forbidden." });
    }

    const uploadResults = [];

    for (const file of req.files) {
      const originalName = file.originalname;
      const sanitizedName = sanitizeFilename(originalName);
      const blobName = `${folder}${sanitizedName}`;

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();
      if (exists) {
        uploadResults.push({
          file: sanitizedName,
          status: "conflict",
          message: `File "${sanitizedName}" already exists in /${folder}. Use replace instead.`,
        });
        continue;
      }

      const contentType = file.mimetype || "application/octet-stream";

      await blockBlobClient.upload(file.buffer, file.buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      uploadResults.push({
        file: sanitizedName,
        status: "success",
        message: `File "${sanitizedName}" uploaded successfully to /${folder}.`,
      });
    }

    // Create notifications for each upload result
    const successCount = uploadResults.filter(
      (r) => r.status === "success"
    ).length;
    const conflictCount = uploadResults.filter(
      (r) => r.status === "conflict"
    ).length;

    if (successCount > 0) {
      await NotificationService.notifyStorageAction({
        req,
        action: "Files uploaded",
        success: true,
        additionalInfo: `${successCount} file(s) uploaded to ${folder}`,
      });
    }

    if (conflictCount > 0) {
      await NotificationService.notifyStorageAction({
        req,
        action: "File upload conflicts",
        success: false,
        additionalInfo: `${conflictCount} file(s) already exist in ${folder}`,
      });
    }

    // Format response to match frontend expectations
    const uploadedFiles = uploadResults.filter(r => r.status === 'success').map(r => r.file);
    const failedFiles = uploadResults.filter(r => r.status !== 'success');
    
    res.json({ 
      uploadedFiles: uploadedFiles,
      results: uploadResults,
      summary: {
        success: uploadedFiles.length,
        conflicts: conflictCount,
        total: uploadResults.length
      }
    });
  } catch (error) {
    console.error("Error uploading files:", error);

    // Create error notification
    await NotificationService.notifyStorageAction({
      req,
      action: "File upload",
      success: false,
      additionalInfo: `Upload to ${folder || "unknown folder"}`,
    });

    res.status(500).json({ message: "Failed to upload files." });
  }
});
router.post("/api/get-content", async (req, res) => {
  try {
    const { blobName } = req.body;
    if (!blobName) {
      return res.status(400).json({ message: "Blob name is required." });
    }

    // Security check: only allow access to docs/ and images/ folders
    if (!blobName.startsWith("docs/") && !blobName.startsWith("images/")) {
      return res
        .status(403)
        .json({ message: "Access to the requested path is forbidden." });
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({ message: "File not found." });
    }

    // Download the blob content
    const downloadResponse = await blockBlobClient.download();
    const content = await streamToString(downloadResponse.readableStreamBody);

    res.set("Content-Type", "text/plain");
    res.send(content);
  } catch (error) {
    console.error("Error getting file content:", error);
    res.status(500).json({
      message: "Failed to get file content.",
      error: error.message,
    });
  }
});
router.post("/api/replace", upload.single("file"), async (req, res) => {
  try {
    const { blobName, content } = req.body;

    if (!blobName) {
      return res.status(400).json({ message: "Blob name is required." });
    }

    // Security check: only allow access to docs/ and images/ folders
    if (!blobName.startsWith("docs/") && !blobName.startsWith("images/")) {
      return res
        .status(403)
        .json({ message: "Access to the requested path is forbidden." });
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({ message: "File not found." });
    }

    if (req.file) {
      // File replacement - upload new file
      const contentType = req.file.mimetype || "application/octet-stream";

      await blockBlobClient.upload(req.file.buffer, req.file.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });

      res.json({
        message: `File "${blobName}" replaced successfully.`,
        url: `${baseUrl}/${blobName}`,
      });
    } else if (content !== undefined) {
      // Text content replacement - for editing text files
      const buffer = Buffer.from(content, "utf8");

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: "text/plain; charset=utf-8",
        },
      });

      res.json({
        message: `File "${blobName}" updated successfully.`,
        url: `${baseUrl}/${blobName}`,
      });
    } else {
      return res
        .status(400)
        .json({ message: "No file or content provided for replacement." });
    }
  } catch (error) {
    console.error("Error replacing file:", error);
    res.status(500).json({
      message: "Failed to replace file.",
      error: error.message,
    });
  }
});
router.delete("/api/delete", async (req, res) => {
  try {
    const { blobName } = req.body;

    if (!blobName) {
      return res.status(400).json({ message: "Blob name is required." });
    }

    // Security check: only allow access to docs/ and images/ folders
    if (!blobName.startsWith("docs/") && !blobName.startsWith("images/")) {
      return res
        .status(403)
        .json({ message: "Access to the requested path is forbidden." });
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({ message: "File not found." });
    }

    // Delete the blob
    await blockBlobClient.delete();

    // Create success notification
    await NotificationService.notifyStorageAction({
      req,
      action: "File deleted",
      fileName: blobName,
      success: true,
    });

    res.json({
      message: `File "${blobName}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting file:", error);

    // Create error notification
    await NotificationService.notifyStorageAction({
      req,
      action: "File deletion",
      fileName: blobName,
      success: false,
      additionalInfo: error.message,
    });

    res.status(500).json({
      message: "Failed to delete file.",
      error: error.message,
    });
  }
});

// Create folder endpoint
router.post("/api/create-folder", async (req, res) => {
  logger.debug(`📝 [DEBUG] Create-folder API called`);
  logger.debug(`📊 [DEBUG] Create-folder - Request body:`, req.body);
  logger.debug(`📊 [DEBUG] Create-folder - Session info:`, {
    hasSession: !!req.session,
    authorID: req.session?.authorID,
    sessionKeys: req.session ? Object.keys(req.session) : [],
  });
  logger.debug(`📊 [DEBUG] Create-folder - Response locals:`, {
    currentWebsiteID: res.locals.currentWebsiteID,
    currentWebsite: res.locals.currentWebsite,
    authorID: res.locals.authorID,
  });

  try {
    const { folderPath, folderName, websiteId } = req.body;
    const authorID = req.session.authorID;

    logger.debug(`📝 [DEBUG] Create-folder - Extracted parameters:`, {
      folderPath: folderPath,
      folderName: folderName,
      websiteId: websiteId,
      authorID: authorID,
    });

    // Use websiteId from request body, fallback to res.locals.currentWebsiteID
    const currentWebsiteID = websiteId || res.locals.currentWebsiteID;
    logger.debug(
      `🎯 [DEBUG] Create-folder - Final websiteID: ${currentWebsiteID} (from: ${
        websiteId ? "request body" : "res.locals"
      })`
    );

    // Validation
    if (!authorID) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!folderPath || !folderName || !currentWebsiteID) {
      return res.status(400).json({
        error: "folderPath, folderName, and websiteId are required.",
      });
    }

    // Sanitize folder name
    logger.debug(
      `🧼 [DEBUG] Create-folder - Sanitizing folder name: "${folderName}"`
    );
    const sanitizedFolderName = sanitizeFilename(folderName.trim());
    logger.debug(
      `🧼 [DEBUG] Create-folder - Sanitized result: "${sanitizedFolderName}"`
    );

    if (!sanitizedFolderName) {
      logger.debug(
        `❌ [DEBUG] Create-folder - Sanitization failed, rejecting request`
      );
      return res.status(400).json({
        error: "Invalid folder name.",
      });
    }

    // Validate folder name doesn't contain invalid characters
    if (
      sanitizedFolderName.includes("/") ||
      sanitizedFolderName.includes("\\")
    ) {
      return res.status(400).json({
        error: "Folder name cannot contain slashes.",
      });
    }

    // Check website access if currentWebsiteID is provided
    if (currentWebsiteID) {
      const validateAccess = await db
        .request()
        .input("AuthorID", sql.Int, authorID)
        .input("WebsiteID", sql.BigInt, currentWebsiteID)
        .query(
          "SELECT 1 FROM dbo.AuthorWebsiteAccess WHERE AuthorID = @AuthorID AND WebsiteID = @WebsiteID"
        );

      if (validateAccess.recordset.length === 0) {
        return res.status(403).json({
          error: "You do not have access to this website.",
        });
      }
    }

    // Ensure folderPath ends with /
    let normalizedFolderPath = folderPath;
    if (!normalizedFolderPath.endsWith("/")) {
      normalizedFolderPath += "/";
    }

    // Security check: only allow folder creation in docs/ and images/ folders
    if (
      !normalizedFolderPath.startsWith("docs/") &&
      !normalizedFolderPath.startsWith("images/")
    ) {
      return res.status(403).json({
        error: "Folders can only be created in docs/ or images/ directories.",
      });
    }

    // Handle library provider paths for images
    if (normalizedFolderPath.startsWith("images/")) {
      const pathParts = normalizedFolderPath.replace("images/", "").split("/");
      if (pathParts.length > 1 && pathParts[0]) {
        // This is inside a library provider folder
        const providerName = pathParts[0];
        const allowedProviders = await getAllowedLibraryProviders(
          currentWebsiteID
        );

        // Check if this is an allowed provider variation
        logger.debug(
          `🔍 [DEBUG] Create-folder - Checking if provider "${providerName}" is allowed for websiteID ${currentWebsiteID}`
        );
        let isAllowedProvider = false;
        let matchedProvider = null;

        for (const provider of allowedProviders) {
          const variations = [
            provider.providerName,
            provider.providerName.toLowerCase(),
            provider.providerName.charAt(0).toLowerCase() +
              provider.providerName.slice(1),
          ];

          logger.debug(
            `🔄 [DEBUG] Create-folder - Checking provider "${provider.providerName}" variations:`,
            variations
          );

          if (variations.includes(providerName)) {
            isAllowedProvider = true;
            matchedProvider = provider;
            logger.debug(
              `✅ [DEBUG] Create-folder - Found matching provider: "${provider.providerName}" for folder "${providerName}"`
            );
            break;
          } else {
            logger.debug(
              `❌ [DEBUG] Create-folder - No match for provider "${provider.providerName}" against folder "${providerName}"`
            );
          }
        }

        if (matchedProvider) {
          logger.debug(
            `✅ [DEBUG] Create-folder - Access granted for library provider (matched: "${matchedProvider.providerName}")`
          );
        }

        if (!isAllowedProvider) {
          return res.status(403).json({
            error:
              "You don't have permission to create folders in this library provider.",
          });
        }
      }
    }

    // Create the full folder path
    const fullFolderPath = normalizedFolderPath + sanitizedFolderName + "/";

    // Check if folder already exists by trying to list items in it
    const existingItems = containerClient
      .listBlobsByHierarchy("/", { prefix: fullFolderPath })
      .byPage({ maxPageSize: 1 });
    const firstPage = await existingItems.next();

    if (
      !firstPage.done &&
      (firstPage.value.segment.blobItems.length > 0 ||
        firstPage.value.segment.blobPrefixes.length > 0)
    ) {
      return res.status(409).json({
        error: "A folder with this name already exists.",
      });
    }

    // Azure Blob Storage doesn't have true folders, so we need to create a placeholder file
    // to make the folder visible in the browser immediately
    logger.debug(
      `📁 [DEBUG] Creating folder in Azure Blob Storage: ${fullFolderPath}`
    );

    // Create a placeholder file to make the folder visible
    const placeholderFileName = `${fullFolderPath}.folderplaceholder`;
    const placeholderContent = `This is a placeholder file to create the folder structure in Azure Blob Storage.\nFolder: ${fullFolderPath}\nCreated: ${new Date().toISOString()}\nCreated by: AuthorID ${authorID}`;

    try {
      logger.debug(
        `📝 [DEBUG] Creating placeholder file: ${placeholderFileName}`
      );
      const placeholderBlobClient =
        containerClient.getBlockBlobClient(placeholderFileName);

      await placeholderBlobClient.upload(
        Buffer.from(placeholderContent, "utf8"),
        Buffer.byteLength(placeholderContent, "utf8"),
        {
          blobHTTPHeaders: {
            blobContentType: "text/plain; charset=utf-8",
          },
          metadata: {
            purpose: "folder-placeholder",
            folderPath: fullFolderPath,
            createdBy: authorID.toString(),
            createdAt: new Date().toISOString(),
          },
        }
      );

      logger.debug(
        `✅ [DEBUG] Placeholder file created successfully: ${placeholderFileName}`
      );
    } catch (azureError) {
      console.error(
        `❌ [ERROR] Failed to create placeholder file in Azure:`,
        azureError.message
      );
      return res.status(500).json({
        error: "Failed to create folder in Azure Blob Storage.",
        details: azureError.message,
      });
    }

    // Insert into WebsiteLibraryProviderLinks
    logger.debug(
      `📝 [DEBUG] Starting WebsiteLibraryProviderLinks INSERT operation`
    );
    logger.debug(`📊 [DEBUG] INSERT parameters:`, {
      WebsiteID: currentWebsiteID,
      LibraryProviderName: sanitizedFolderName,
      DisplayName: sanitizedFolderName,
      WebsiteIDType: typeof currentWebsiteID,
      sanitizedFolderNameType: typeof sanitizedFolderName,
    });

    try {
      logger.debug(
        `🔗 [DEBUG] Database connection status for INSERT: ${
          db ? "Connected" : "Not connected"
        }`
      );

      const pool = await db;
      const insertRequest = pool.request();
      logger.debug(`📝 [DEBUG] Adding INSERT SQL parameters...`);

      insertRequest.input("WebsiteID", sql.BigInt, currentWebsiteID);
      logger.debug(
        `  ✅ WebsiteID parameter added: ${currentWebsiteID} (BigInt)`
      );

      insertRequest.input(
        "LibraryProviderName",
        sql.NVarChar,
        sanitizedFolderName
      );
      logger.debug(
        `  ✅ LibraryProviderName parameter added: "${sanitizedFolderName}" (NVarChar)`
      );

      insertRequest.input("DisplayName", sql.NVarChar, sanitizedFolderName);
      logger.debug(
        `  ✅ DisplayName parameter added: "${sanitizedFolderName}" (NVarChar)`
      );

      const insertQuery =
        "INSERT INTO dbo.WebsiteLibraryProviderLinks (WebsiteID, LibraryProviderName, DisplayName) VALUES (@WebsiteID, @LibraryProviderName, @DisplayName)";
      logger.debug(`🎯 [DEBUG] Executing INSERT query: ${insertQuery}`);

      const insertStartTime = Date.now();
      const insertResult = await insertRequest.query(insertQuery);
      const insertTime = Date.now() - insertStartTime;

      logger.debug(`⏱️  [DEBUG] INSERT completed in ${insertTime}ms`);
      logger.debug(`✅ [DEBUG] INSERT result:`, {
        rowsAffected: insertResult.rowsAffected,
        returnValue: insertResult.returnValue,
        recordset: insertResult.recordset,
      });

      if (insertResult.rowsAffected && insertResult.rowsAffected[0] > 0) {
        logger.debug(
          `🎉 [DEBUG] Successfully inserted ${insertResult.rowsAffected[0]} row(s) into WebsiteLibraryProviderLinks`
        );
      } else {
        logger.debug(
          `⚠️  [DEBUG] INSERT completed but no rows were affected. rowsAffected:`,
          insertResult.rowsAffected
        );
      }

      // Verify the insert by querying back
      logger.debug(`🔍 [DEBUG] Verifying INSERT by querying back the record...`);
      const verifyPool = await db;
      const verifyRequest = verifyPool.request();
      verifyRequest.input("VerifyWebsiteID", sql.BigInt, currentWebsiteID);
      verifyRequest.input(
        "VerifyProviderName",
        sql.NVarChar,
        sanitizedFolderName
      );

      const verifyQuery =
        "SELECT * FROM dbo.WebsiteLibraryProviderLinks WHERE WebsiteID = @VerifyWebsiteID AND LibraryProviderName = @VerifyProviderName";
      logger.debug(`🔍 [DEBUG] Verification query: ${verifyQuery}`);

      const verifyResult = await verifyRequest.query(verifyQuery);
      logger.debug(`🔍 [DEBUG] Verification result:`, {
        recordsFound: verifyResult.recordset
          ? verifyResult.recordset.length
          : 0,
        records: verifyResult.recordset,
      });
    } catch (insertError) {
      console.error("❌ [ERROR] WebsiteLibraryProviderLinks INSERT failed:", {
        error: insertError.message,
        stack: insertError.stack,
        parameters: {
          WebsiteID: currentWebsiteID,
          LibraryProviderName: sanitizedFolderName,
          DisplayName: sanitizedFolderName,
        },
        errorCode: insertError.code,
        errorNumber: insertError.number,
        severity: insertError.severity,
        state: insertError.state,
        procedure: insertError.procedure,
        lineNumber: insertError.lineNumber,
      });
      throw insertError; // Re-throw to maintain original error handling
    }

    logger.debug(
      `🎉 [SUCCESS] Folder created: ${fullFolderPath} by user ${authorID} and linked to website ${currentWebsiteID}`
    );

    // Final verification - query all providers for this website to confirm the insert
    logger.debug(
      `🔍 [DEBUG] Final verification - querying all providers for websiteID ${currentWebsiteID}...`
    );
    try {
      const finalVerifyProviders = await getAllowedLibraryProviders(
        currentWebsiteID
      );
      logger.debug(
        `📊 [DEBUG] Final verification result - Total providers now:`,
        finalVerifyProviders.length
      );
      finalVerifyProviders.forEach((provider, index) => {
        logger.debug(
          `  📝 [DEBUG] Provider ${index + 1}: "${
            provider.providerName
          }" (Display: "${provider.displayName}")`
        );
      });
    } catch (finalVerifyError) {
      console.error(
        `❌ [ERROR] Final verification failed:`,
        finalVerifyError.message
      );
    }

    res.json({
      success: true,
      message: `Folder "${sanitizedFolderName}" created and linked successfully.`,
      folderPath: fullFolderPath,
      folderName: sanitizedFolderName,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({
      error: "Failed to create folder.",
      details: error.message,
    });
  }
});

// Delete folder endpoint
router.delete("/api/delete-folder", async (req, res) => {
  logger.debug(`📝 [DEBUG] Delete-folder API called`);
  logger.debug(`📊 [DEBUG] Delete-folder - Request body:`, req.body);

  try {
    const { folderPath } = req.body;
    const authorID = req.session.authorID;
    const currentWebsiteID = res.locals.currentWebsiteID;

    // Validation
    if (!authorID) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!folderPath || !currentWebsiteID) {
      return res.status(400).json({
        error: "folderPath and websiteId are required.",
      });
    }

    // Ensure folderPath ends with /
    let normalizedFolderPath = folderPath;
    if (!normalizedFolderPath.endsWith("/")) {
      normalizedFolderPath += "/";
    }

    // Security check: only allow folder deletion in docs/ and images/ folders
    if (
      !normalizedFolderPath.startsWith("docs/") &&
      !normalizedFolderPath.startsWith("images/")
    ) {
      return res.status(403).json({
        error: "Folders can only be deleted from docs/ or images/ directories.",
      });
    }

    logger.debug(
      `📁 [DEBUG] Attempting to delete folder: ${normalizedFolderPath}`
    );

    // Check if folder has any files (excluding placeholder)
    const folderItems = containerClient
      .listBlobsByHierarchy("/", { prefix: normalizedFolderPath })
      .byPage({ maxPageSize: 10 });
    const firstPage = await folderItems.next();

    let hasRealFiles = false;
    if (!firstPage.done) {
      // Check for real files (not placeholders)
      for (const item of firstPage.value.segment.blobItems) {
        if (!item.name.endsWith(".folderplaceholder")) {
          hasRealFiles = true;
          break;
        }
      }
      // Check for subfolders
      if (firstPage.value.segment.blobPrefixes.length > 0) {
        hasRealFiles = true;
      }
    }

    if (hasRealFiles) {
      return res.status(400).json({
        error:
          "Cannot delete folder that contains files or subfolders. Please delete all contents first.",
      });
    }

    // Delete the placeholder file if it exists
    const placeholderFileName = `${normalizedFolderPath}.folderplaceholder`;
    try {
      const placeholderBlobClient =
        containerClient.getBlockBlobClient(placeholderFileName);
      const exists = await placeholderBlobClient.exists();

      if (exists) {
        await placeholderBlobClient.delete();
        logger.debug(
          `✅ [DEBUG] Placeholder file deleted: ${placeholderFileName}`
        );
      } else {
        logger.debug(
          `ℹ️  [DEBUG] No placeholder file found: ${placeholderFileName}`
        );
      }
    } catch (placeholderError) {
      console.error(
        `⚠️  [WARNING] Failed to delete placeholder file:`,
        placeholderError.message
      );
      // Continue with database cleanup even if placeholder deletion fails
    }

    // Remove from database if this was a library provider folder
    if (normalizedFolderPath.startsWith("images/")) {
      const folderName = normalizedFolderPath
        .replace("images/", "")
        .replace("/", "");

      try {
        const pool = await db;
        const deleteRequest = pool.request();
        deleteRequest.input("WebsiteID", sql.BigInt, currentWebsiteID);
        deleteRequest.input("LibraryProviderName", sql.NVarChar, folderName);

        const deleteQuery =
          "DELETE FROM dbo.WebsiteLibraryProviderLinks WHERE WebsiteID = @WebsiteID AND LibraryProviderName = @LibraryProviderName";
        const deleteResult = await deleteRequest.query(deleteQuery);

        logger.debug(`📊 [DEBUG] Database deletion result:`, {
          rowsAffected: deleteResult.rowsAffected,
          folderName: folderName,
          websiteID: currentWebsiteID,
        });
      } catch (dbError) {
        console.error(
          `❌ [ERROR] Failed to remove folder from database:`,
          dbError.message
        );
        // Continue - folder was deleted from Azure even if DB cleanup failed
      }
    }

    res.json({
      success: true,
      message: `Folder "${normalizedFolderPath}" deleted successfully.`,
      folderPath: normalizedFolderPath,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({
      error: "Failed to delete folder.",
      details: error.message,
    });
  }
});

module.exports = router;
