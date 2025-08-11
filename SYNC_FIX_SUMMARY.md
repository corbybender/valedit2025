# Sync Page Fix Summary

## Issue Identified

The `/sync` page was showing "error loading sync queue" instead of displaying the pending sync grid.

## Root Cause

The sync route queries were using incorrect column names that didn't match the actual database table structure.

### Database Table Structure (PageSyncQueue)

**Actual Columns:**

- `SyncQueueID` (Primary Key)
- `PageID`
- `WebsiteID`
- `ChangeType` (Action type)
- `Status`
- `QueuedAt`
- `QueuedBy`
- `SyncCompletedAt` (Completion timestamp)
- `SyncNotes` (Notes/Error messages)

**Code was expecting:**

- `ID` (should be `SyncQueueID`)
- `Action` (should be `ChangeType`)
- `ProcessedAt` (should be `SyncCompletedAt`)
- `ErrorMessage` (should be `SyncNotes`)

## Fix Applied

### 1. Updated Queue Items Query (`/sync/queue`)

```sql
-- Before (FAILED)
SELECT psq.ID, psq.Action, psq.ProcessedAt, psq.ErrorMessage, ...

-- After (WORKING)
SELECT
  psq.SyncQueueID as ID,
  psq.ChangeType as Action,
  psq.SyncCompletedAt as ProcessedAt,
  psq.SyncNotes as ErrorMessage,
  ...
```

### 2. Updated Access Check Query (`/sync/retry/:id`)

```sql
-- Before (FAILED)
WHERE psq.ID = @SyncID

-- After (WORKING)
WHERE psq.SyncQueueID = @SyncID
```

### 3. Updated Retry Update Query

```sql
-- Before (FAILED)
UPDATE PageSyncQueue
SET Status = 'pending', ErrorMessage = NULL, ProcessedAt = NULL
WHERE ID = @SyncID

-- After (WORKING)
UPDATE PageSyncQueue
SET Status = 'pending', SyncNotes = NULL, SyncCompletedAt = NULL
WHERE SyncQueueID = @SyncID
```

## Test Results

✅ **Sync Statistics Query**: Working (4 total items: 3 pending, 1 completed)
✅ **Sync Queue API**: Working (returns 4 items with correct data structure)
✅ **Column Mapping**: All columns now correctly aliased to expected names

## Expected Behavior

- `/sync` page now loads successfully with sync statistics
- Sync queue table populates with actual data from database
- Retry functionality works for failed sync items
- All API endpoints return proper JSON responses

## Files Modified

- `routes/sync.js` - Fixed all database queries to use correct column names

The sync page should now display the pending sync queue correctly instead of showing an error message.
