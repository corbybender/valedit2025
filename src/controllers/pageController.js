const db = require("../config/database");
const sql = require("mssql");
const workingSiteService = require("../services/workingSiteService");
const { getInitials } = require("../utils/helpers");

const showPagesForWebsite = async (req, res) => {
  console.log("🎯 PAGE CONTROLLER: showPagesForWebsite called");
  console.log("🎯 PAGE CONTROLLER: websiteId =", req.params.websiteId);
  console.log("🎯 PAGE CONTROLLER: authorID =", req.session.authorID);
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }
    const { websiteId } = req.params;
    const { sort } = req.query;

    const websiteResult =
      await db.query`SELECT WebsiteID, Domain FROM Websites WHERE WebsiteID = ${websiteId}`;
    if (websiteResult.recordset.length === 0) {
      return res.status(404).send("Website not found");
    }

    const website = websiteResult.recordset[0];
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    // Determine sort order based on query parameter
    let orderBy = "p.Title";
    if (sort === "lastmodified") {
      orderBy = "COALESCE(p.LastModified, p.CreatedAt, '1900-01-01') DESC";
    } else if (sort === "created") {
      orderBy = "COALESCE(p.CreatedAt, '1900-01-01') DESC";
    }

    // Build page tree with sync status
    const pool = await db;
    const request = pool.request();
    const queryStr = `
        SELECT 
          p.PageID, 
          p.ParentPageID, 
          p.Title, 
          p.URL,
          p.CreatedAt,
          p.LastModified,
          psq.Status as SyncStatus,
          psq.ChangeType as SyncChangeType,
          psq.QueuedAt as SyncQueuedAt
        FROM dbo.Pages p
        LEFT JOIN (
          SELECT DISTINCT 
            PageID, 
            Status, 
            ChangeType, 
            QueuedAt,
            ROW_NUMBER() OVER (PARTITION BY PageID ORDER BY QueuedAt DESC) as rn
          FROM PageSyncQueue 
        ) psq ON p.PageID = psq.PageID AND psq.rn = 1
        WHERE p.WebsiteID = @websiteId 
        ORDER BY ${orderBy}
      `;
    const pagesResult = await request
      .input("websiteId", sql.Int, websiteId)
      .query(queryStr);

    const pages = pagesResult.recordset;
    let pageTree = [];

    if (pages.length > 0) {
      const pageMap = new Map();
      pages.forEach((page) =>
        pageMap.set(page.PageID, {
          ...page,
          children: [],
          syncStatus: {
            status: page.SyncStatus,
            changeType: page.SyncChangeType,
            queuedAt: page.SyncQueuedAt,
          },
        })
      );

      for (const page of pageMap.values()) {
        if (page.ParentPageID && pageMap.has(page.ParentPageID)) {
          pageMap.get(page.ParentPageID).children.push(page);
        } else {
          pageTree.push(page);
        }
      }
    }

    res.render("pages/pages", {
      title: `Pages - ${website.Domain}`,
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      website: website,
      pageTree: pageTree,
      currentSort: sort || "title",
    });
  } catch (error) {
    console.error("🎯 PAGE CONTROLLER ERROR:", error);
    console.error("🎯 PAGE CONTROLLER ERROR STACK:", error.stack);
    logger.error("Error loading pages for website", {
      error: error,
      websiteId: req.params.websiteId,
      authorID: req.session.authorID,
    });
    res.status(500).send("Error loading pages. Please try again.");
  }
};

const showBuildPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );
    if (!currentSite || !currentSite.CurrentWorkingSite) {
      return res.redirect("/websites");
    }

    const [
      templateSetsResult,
      categoriesResult,
      templatesResult,
      pageLayoutsResult,
    ] = await Promise.all([
      db.query`SELECT DISTINCT TemplateSet FROM ContentTemplates WHERE TemplateSet IS NOT NULL ORDER BY TemplateSet`,
      db.query`SELECT CategoryID as ID, Name FROM Categories ORDER BY Name`,
      db.query`SELECT ID, Name, TemplateSet, CategoryID FROM ContentTemplates ORDER BY Name`,
      db.query`SELECT ID, Name FROM PageTemplates ORDER BY Name`,
    ]);

    let pageData = null;
    const pageIdToLoad = req.query.pageid;
    if (pageIdToLoad) {
      const pageResult =
        await db.query`SELECT * FROM Pages WHERE PageID = ${pageIdToLoad}`;
      if (pageResult.recordset.length > 0) {
        pageData = pageResult.recordset[0];
        const blocksResult = await db.query`
            SELECT 
                pcb.ID, 
                pcb.ContentTemplateID, 
                pcb.PlaceholderID, 
                pcb.SortOrder,
                pcb.InstanceName,
                pcb.HtmlContent as Content,
                pcb.CssContent,
                pcb.JsContent,
                cb.Name,
                cb.HtmlContent as TemplateHtmlContent,
                cb.CssContent as TemplateCssContent,
                cb.JsContent as TemplateJsContent
            FROM PageContentBlocks pcb
            LEFT JOIN ContentTemplates cb ON pcb.ContentTemplateID = cb.ID
            WHERE pcb.PageID = ${pageIdToLoad}
            ORDER BY pcb.SortOrder ASC`;
        pageData.blocks = blocksResult.recordset;
      }
    }

    res.render("pages/buildpage", {
      title: "Build Page",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      currentWebsite: currentSite,
      templateSets: templateSetsResult.recordset,
      categories: categoriesResult.recordset,
      templates: templatesResult.recordset,
      pageLayouts: pageLayoutsResult.recordset,
      pageData: pageData,
    });
  } catch (error) {
    logger.error("Error loading buildpage", {
      error: error,
      pageId: req.query.pageid,
      authorID: req.session.authorID,
    });
    res.status(500).send("Error loading build page. Please try again.");
  }
};

const showPageTemplates = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );
    const templatesResult =
      await db.query`SELECT ID, Name, Description FROM PageTemplates ORDER BY Name`;

    res.render("pages/pagetemplates", {
      title: "Page Templates",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: currentSite,
      templates: templatesResult.recordset,
    });
  } catch (error) {
    logger.error("Error loading page templates", {
      error: error,
      authorID: req.session.authorID,
    });
    res.status(500).send("Error loading page templates. Please try again.");
  }
};

module.exports = {
  showPagesForWebsite,
  showBuildPage,
  showPageTemplates,
};
