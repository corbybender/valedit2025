const db = require("../config/database");
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

const generateSitemap = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const currentWebsiteID = res.locals.currentWebsiteID;
    if (!currentWebsiteID) {
      return res.status(400).json({ success: false, error: "No website selected" });
    }

    // Get website domain
    const websiteResult = await db.query`
      SELECT Domain FROM Websites WHERE WebsiteID = ${currentWebsiteID}
    `;
    
    if (websiteResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Website not found" });
    }

    const domain = websiteResult.recordset[0].Domain;
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

    // Get all published pages for the website
    const pagesResult = await db.query`
      SELECT URL, Title 
      FROM Pages 
      WHERE WebsiteID = ${currentWebsiteID} 
      AND URL IS NOT NULL 
      AND URL != ''
      ORDER BY URL
    `;

    // Generate XML sitemap
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add each page
    for (const page of pagesResult.recordset) {
      const pageUrl = page.URL.startsWith('/') ? page.URL : `/${page.URL}`;
      const fullUrl = `${baseUrl}${pageUrl}`;
      
      sitemap += '  <url>\n';
      sitemap += `    <loc>${fullUrl}</loc>\n`;
      sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.8</priority>\n';
      sitemap += '  </url>\n';
    }

    sitemap += '</urlset>';

    // Save sitemap to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');

    res.json({ 
      success: true, 
      message: 'Sitemap generated successfully',
      pageCount: pagesResult.recordset.length,
      sitemapUrl: '/public/sitemap.xml'
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sitemap' });
  }
};

module.exports = {
  generateSitemap
};