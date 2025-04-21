# Election Notification Testing Guide

This guide explains how to test the election notification flow between Admins and Super Admins in the TrustElect system.

## Role-Based Notification Flow

The TrustElect system notification process works as follows:

1. When an **Admin** creates an election, all **Super Admins** receive a notification about the election needing approval.
2. When a **Super Admin** approves an election, the **Admin** who created it receives a notification.
3. Students receive notifications about elections they're eligible for once they've been approved.

## Critical Fix Implementation

The system has been updated to use `role_id` values instead of string-based role names due to issues with the database structure:

- **Super Admin**: `role_id = 1` 
- **Admin**: `role_id = 2`
- **Student**: `role_id = 3`

These numeric IDs are more reliable than string-based role names for determining permissions.

## How to Test the Notification System

### Method 1: Using the Enhanced Diagnostic Endpoint

The most reliable way to test is using our comprehensive diagnostic endpoint:

```
POST /api/notifications/debug/test-election-notification-flow
```

**Requirements:**
- You must be logged in as either an Admin or Super Admin
- Authentication token must be included in the request

This endpoint:
1. Checks if superadmins exist in the database
2. Verifies the notifications table structure 
3. Simulates an Admin creating an election (notifying Super Admins)
4. Simulates a Super Admin approving the election (notifying the Admin)
5. Verifies that notifications were properly stored in the database
6. Provides detailed diagnostics about any issues found

**Example Request:**

```bash
curl -X POST http://localhost:5000/api/notifications/debug/test-election-notification-flow \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Method 2: Checking User Accounts

You can diagnose common issues with this endpoint:

```
GET /api/notifications/debug/diagnose-superadmin-notifications
```

This will check:
- If superadmins exist in the users table with `role_id = 1`
- If the superadmins table has records
- If any superadmin notifications exist in the system
- If test notifications can be created successfully

### Method 3: Real-World Testing

To test with actual election data:

1. **As an Admin:**
   - Log in to the admin panel
   - Create a new election (which will automatically require approval)
   - Note the election ID in the console logs

2. **As a Super Admin:**
   - Log in to the super admin panel
   - Check notifications (you should see the new election)
   - Go to Elections → Pending Approval
   - Approve the election you created as an Admin

3. **As the Admin again:**
   - Check notifications (you should see the approval notification)

## Troubleshooting

If notifications aren't appearing:

1. **Check User Accounts:** Ensure user accounts have the correct `role_id` values:
   - Super Admin: `role_id = 1`
   - Admin: `role_id = 2`
   - Student: `role_id = 3`

2. **Check Server Logs:** The diagnostic endpoints will output detailed logs to the server console.

3. **Verify Database Structure:** Make sure the notifications table has these columns:
   - `id`: Notification ID
   - `user_id`: ID of the user receiving the notification
   - `role`: Role string of the target user
   - `title`: Notification title
   - `message`: Notification content
   - `type`: Notification type (info, success, etc.)
   - `related_entity`: Entity type (election, ballot, etc.)
   - `entity_id`: ID of the related entity
   - `is_read`: Whether the notification has been read
   - `created_at`: When the notification was created

4. **Check Authentication:** Ensure your authentication token includes the correct `role_id`.

## Fixed Issues

The notification system has been updated to address these issues:

1. **Role detection:** Now using `role_id` from the database instead of inconsistent string roles
2. **Token enhancement:** The token verification middleware now adds `role_id` to the user object
3. **Multiple role checking methods:** The permission middleware now checks roles in three ways for reliability
4. **Comprehensive diagnostics:** New testing endpoints provide detailed information about issues
5. **Fallback mechanisms:** The system attempts multiple methods to find and notify superadmins

## Database Tables Used for Notifications

- `notifications`: Stores all notification records
- `users`: Contains user records with `role_id` values
- `elections`: Contains the election records
- `admins`: Contains admin-specific information
- `superadmins`: Contains superadmin-specific information

## Important Code Fixes

Recent fixes address issues with the notification system:

1. Removed references to non-existent `role` column in the `users` table
2. Added improved admin lookup via email when direct user ID lookup fails
3. Enhanced role detection using `role_id` instead of string-based role values
4. Added detailed logging throughout the notification process 