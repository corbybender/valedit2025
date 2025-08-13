# Google Analytics Integration Setup

This implementation provides comprehensive Google Analytics and tracking code management for your CMS. Here's how to set it up and use it.

## 🗄️ Database Setup

### Step 1: Create the Analytics Table

Run the following SQL script in your MSSQL database:

```sql
-- Create table for storing Google Analytics tracking codes per website
CREATE TABLE WebsiteAnalytics (
    ID int IDENTITY(1,1) PRIMARY KEY,
    WebsiteID int NOT NULL,
    GoogleAnalyticsID nvarchar(50) NULL, -- GA4 measurement ID (G-XXXXXXXXXX)
    GoogleTagManagerID nvarchar(50) NULL, -- GTM container ID (GTM-XXXXXXX)
    FacebookPixelID nvarchar(50) NULL, -- Facebook Pixel ID for future use
    CustomTrackingCode nvarchar(MAX) NULL, -- Custom analytics/tracking scripts
    IsActive bit NOT NULL DEFAULT 1,
    CreatedDate datetime2 NOT NULL DEFAULT GETDATE(),
    ModifiedDate datetime2 NOT NULL DEFAULT GETDATE(),
    CreatedBy int NULL, -- References Authors.AuthorID
    ModifiedBy int NULL, -- References Authors.AuthorID
    
    -- Foreign key constraints
    CONSTRAINT FK_WebsiteAnalytics_Websites FOREIGN KEY (WebsiteID) REFERENCES Websites(WebsiteID) ON DELETE CASCADE,
    CONSTRAINT FK_WebsiteAnalytics_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Authors(AuthorID),
    CONSTRAINT FK_WebsiteAnalytics_ModifiedBy FOREIGN KEY (ModifiedBy) REFERENCES Authors(AuthorID),
    
    -- Ensure only one analytics record per website
    CONSTRAINT UK_WebsiteAnalytics_WebsiteID UNIQUE (WebsiteID)
);

-- Create index for performance
CREATE INDEX IX_WebsiteAnalytics_WebsiteID ON WebsiteAnalytics(WebsiteID);

-- Add trigger to update ModifiedDate automatically
CREATE TRIGGER TR_WebsiteAnalytics_UpdateModifiedDate
ON WebsiteAnalytics
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE WebsiteAnalytics 
    SET ModifiedDate = GETDATE()
    FROM WebsiteAnalytics wa
    INNER JOIN inserted i ON wa.ID = i.ID;
END;
```

### Step 2: Restart Your Application

After creating the database table, restart your Node.js application to ensure all services can access the new table.

## 🎯 How It Works

### Architecture Overview

1. **Database Storage**: Analytics settings are stored per-website in the `WebsiteAnalytics` table
2. **CMS Interface**: Manage analytics codes through the `/analytics` page in your CMS
3. **Automatic Injection**: Analytics codes are automatically injected during:
   - Page publishing (`POST /pages/:id/publish`)
   - Page previews (`GET /pages/:id/preview`)

### Code Injection Process

1. **Head Scripts**: Google Analytics, GTM head code, and custom tracking scripts are injected into the `<head>` section
2. **Body Scripts**: GTM noscript fallback is injected after the opening `<body>` tag
3. **Error Handling**: Analytics injection errors won't break page publishing/preview

## 📖 User Guide

### Setting Up Analytics for a Website

1. **Navigate to Analytics**: Click "Analytics" in the main navigation
2. **Select Website**: Ensure you have the correct website selected in the website switcher
3. **Configure Tracking Codes**:
   - **Google Analytics (GA4)**: Enter your measurement ID (format: G-XXXXXXXXXX)
   - **Google Tag Manager**: Enter your container ID (format: GTM-XXXXXXX)
   - **Facebook Pixel**: Enter your pixel ID (15-16 digits)
   - **Custom Code**: Add any additional tracking scripts or HTML
4. **Enable/Disable**: Use the "Enable analytics tracking" checkbox
5. **Save**: Click "Save Settings"

### Testing Your Setup

1. **Preview Code**: Use the "Preview Code" button to see generated tracking scripts
2. **Test Tracking**: Use the "Test Tracking" button to validate ID formats
3. **Verify Pages**: Publish a page and check the HTML source to confirm analytics injection

### Supported Tracking Systems

#### Google Analytics (GA4)
- **ID Format**: G-XXXXXXXXXX (where X is alphanumeric)
- **What it does**: Tracks page views, user behavior, conversions
- **Injection**: Head section with gtag configuration

#### Google Tag Manager
- **ID Format**: GTM-XXXXXXX (where X is alphanumeric)
- **What it does**: Container for managing multiple tracking codes
- **Injection**: Head script + body noscript fallback

#### Facebook Pixel
- **ID Format**: 15-16 digit number
- **What it does**: Tracks conversions and user behavior for Facebook ads
- **Status**: Ready for implementation (extend AnalyticsService as needed)

#### Custom Tracking Code
- **Format**: Any HTML/JavaScript
- **What it does**: Allows custom tracking implementations
- **Injection**: Head section

## 🔧 Technical Details

### API Endpoints

- `GET /api/analytics/:websiteId` - Get analytics settings
- `POST /api/analytics/:websiteId` - Create/update analytics settings
- `DELETE /api/analytics/:websiteId` - Delete analytics settings
- `GET /api/analytics/:websiteId/preview` - Preview generated scripts

### Files Created/Modified

#### New Files
- `/src/services/analyticsService.js` - Core analytics management service
- `/routes/analytics.js` - API routes for analytics management
- `/views/pages/analytics.ejs` - Analytics configuration UI
- `/public/js/analytics.js` - Frontend JavaScript for analytics UI
- `/sql/create_website_analytics_table.sql` - Database table creation script

#### Modified Files
- `/src/server.js` - Added analytics route registration
- `/src/routes/mainRoutes.js` - Added analytics page route
- `/views/partials/tailwind-megamenu.ejs` - Added analytics navigation link
- `/routes/pages.js` - Added analytics injection to publish and preview

### Security Considerations

1. **Input Validation**: All tracking IDs are validated with regex patterns
2. **SQL Injection Prevention**: All queries use parameterized inputs
3. **User Permissions**: Analytics management requires authentication
4. **XSS Prevention**: HTML content is properly handled by Cheerio
5. **Error Isolation**: Analytics errors won't break core functionality

## 🚀 Advanced Usage

### Extending Analytics Support

To add support for additional tracking systems (e.g., Adobe Analytics), modify:

1. **Database**: Add new columns to `WebsiteAnalytics` table
2. **Service**: Add generation methods in `AnalyticsService.js`
3. **UI**: Add form fields in `analytics.ejs`
4. **Frontend**: Add validation in `analytics.js`

### Custom Script Templates

You can create reusable custom script templates by modifying the `generateTrackingScripts` method in `AnalyticsService.js`.

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Database table `WebsiteAnalytics` exists
- [ ] Analytics page loads at `/analytics`
- [ ] Can save/load analytics settings per website
- [ ] Preview shows generated tracking codes
- [ ] Published pages contain analytics scripts in HTML source
- [ ] Page previews include analytics scripts
- [ ] Analytics navigation link appears in header

## 🛠️ Troubleshooting

### Common Issues

1. **"Analytics service not found"**: Restart your application after creating the database table
2. **"No current website selected"**: Select a website using the website switcher
3. **"Invalid format" errors**: Check your tracking ID formats match the expected patterns
4. **Scripts not appearing in pages**: Verify analytics are enabled and website has published pages

### Debug Information

Check your application logs for:
- `Analytics head scripts injected for website: [ID]`
- `Analytics body scripts injected for website: [ID]`
- `No analytics scripts to inject for website: [ID]`
- Any analytics-related error messages

## 📈 Benefits

1. **Centralized Management**: Configure once, applies to all pages
2. **Multi-Website Support**: Different analytics per website
3. **Flexible**: Supports multiple tracking systems
4. **Automatic**: No manual script insertion required
5. **Reliable**: Error handling ensures pages still publish if analytics fails
6. **Developer Friendly**: Clean separation of concerns and extensible architecture

This implementation provides a production-ready analytics management system that integrates seamlessly with your existing CMS workflow.