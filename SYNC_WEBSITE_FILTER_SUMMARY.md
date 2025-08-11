# Sync Page Website Search Implementation

## Feature Added

Added a website search bar to the `/sync` page that allows users to filter sync queue items by typing website names, exactly like the search functionality on the `/websites` page. The current working site is pre-populated by default.

## Implementation Details

### 1. Backend Changes (`routes/sync.js`)

#### Added Working Site Service Integration

```javascript
const workingSiteService = require("../src/services/workingSiteService");
```

#### Updated Main Sync Route (`GET /sync`)

- Now fetches current working site and all user websites
- Passes this data to the view for the filter dropdown

#### Enhanced Queue API (`GET /sync/queue`)

- Added optional `search` query parameter for website filtering
- Uses SQL LIKE query to match website domains
- Returns filtered results based on website name search
- Supports partial matching (e.g., "agsense" matches "www.agsense.com")

#### New Stats API (`GET /sync/stats`)

- New endpoint for filtered statistics
- Supports same website search filtering as queue endpoint
- Returns real-time stats for matching websites

### 2. Frontend Changes (`views/pages/sync.ejs`)

#### Website Search Bar

- Text input with search icon (matches `/websites` page design)
- Pre-populated with current working site name if available
- Real-time search as user types
- Clear button to reset search
- Escape key support to clear search

#### Enhanced JavaScript Functionality

- `loadSyncQueue()`: Now respects website search input
- `updateSyncStats()`: Updates statistics cards based on search
- `performSearch()`: Triggers search on input/keyup events
- `clearWebsiteFilter()`: Clears search and resets view
- Real-time filtering as user types
- Automatic stats update when search changes

#### Improved User Experience

- Search persists during pagination
- Loading states and error handling
- Clear messaging when no items found matching search
- Instant feedback as user types
- Keyboard shortcuts (Escape to clear)

## Key Features

### 🎯 **Smart Default Behavior**

- Automatically defaults to current working site
- Shows all websites if no working site is selected
- Maintains filter selection during refresh operations

### 🔄 **Real-Time Updates**

- Statistics cards update instantly when filter changes
- Queue table refreshes with filtered data
- No page reload required

### 📊 **Filtered Statistics**

- Total, Pending, Processing, Completed, and Failed counts
- Updates dynamically based on selected website
- Accurate counts for filtered view

### 🔍 **Enhanced Search Experience**

- Similar to `/websites` page search functionality
- Dropdown-based filtering for better UX
- Clear visual indication of current selection

## API Endpoints

### `GET /sync/queue?website={websiteId}`

- Returns filtered sync queue items
- Supports pagination with filtering
- Maintains all existing functionality

### `GET /sync/stats?website={websiteId}`

- Returns filtered sync statistics
- Real-time data for selected website
- Used for dynamic stats updates

## Database Queries

### Filtered Queue Query

```sql
SELECT psq.SyncQueueID as ID, psq.ChangeType as Action, ...
FROM PageSyncQueue psq
JOIN Pages p ON psq.PageID = p.PageID
JOIN Websites w ON psq.WebsiteID = w.WebsiteID
JOIN AuthorWebsiteAccess awa ON psq.WebsiteID = awa.WebsiteID
WHERE awa.AuthorID = @AuthorID
AND psq.WebsiteID = @WebsiteID  -- Optional filter
ORDER BY psq.QueuedAt DESC
```

### Filtered Stats Query

```sql
SELECT COUNT(*) as TotalItems,
       SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as PendingItems,
       ...
FROM PageSyncQueue psq
JOIN Pages p ON psq.PageID = p.PageID
JOIN AuthorWebsiteAccess awa ON p.WebsiteID = awa.WebsiteID
WHERE awa.AuthorID = @AuthorID
AND psq.WebsiteID = @WebsiteID  -- Optional filter
```

## User Workflow

1. **Page Load**: Sync page loads with current working site pre-selected
2. **View Current Site**: See sync items for currently active website
3. **Switch Websites**: Use dropdown to filter by different websites
4. **Real-Time Updates**: Statistics and queue update instantly
5. **Refresh Data**: Refresh button updates both stats and queue for selected filter

## Benefits

- **Focused View**: Users can focus on specific website sync status
- **Reduced Clutter**: Filter out irrelevant sync items from other websites
- **Better Performance**: Smaller result sets for large multi-website setups
- **Intuitive UX**: Follows familiar pattern from websites page
- **Maintains Context**: Remembers current working site selection

The sync page now provides a much more focused and user-friendly experience for managing sync operations across multiple websites!
