# Super Admin Setup Guide

This guide explains how to create a super admin user so you can sign in and test the Elira Event Platform.

## Quick Start

Run this command from the project root:

```bash
node scripts/create-super-admin.mjs --email admin@example.com --password MySecurePassword123
```

Replace:
- `admin@example.com` with your desired email
- `MySecurePassword123` with your desired password (must be at least 8 characters)

## Command Options

```bash
node scripts/create-super-admin.mjs \
  --email admin@example.com \
  --password MySecurePassword123 \
  --name "John Admin"
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--email` | Yes | Email address for the super admin user |
| `--password` | Yes | Password for the super admin user (min 8 characters) |
| `--name` | No | Full name for the super admin (default: "Super Admin") |

## What the Script Does

1. **Creates an Auth User** — Registers a new user in Supabase Auth with the provided email and password
2. **Creates a Tenant** — Sets up a default tenant for the super admin
3. **Creates a User Record** — Inserts a record in the `users` table with the `super_admin` role

## After Running the Script

1. **Start the app** (if not already running):
   ```bash
   npm run dev
   ```

2. **Go to the login page**:
   - Navigate to `http://localhost:3000/login`

3. **Sign in with your credentials**:
   - Email: The email you provided
   - Password: The password you provided

4. **You will be redirected to** `/admin` (the super admin dashboard)

## What You Can Do as Super Admin

Once signed in as a super admin, you can:

- 📋 View the admin dashboard
- 👥 Manage organizers (add, remove, view)
- 📊 View all events and organizers across tenants
- 🔍 Access the super admin panel

## Example Usage

```bash
# Create a super admin with custom name
node scripts/create-super-admin.mjs \
  --email super.admin@elira.com \
  --password EliRa@2024Admin \
  --name "Sarah Admin"
```

Then sign in with:
- Email: `super.admin@elira.com`
- Password: `EliRa@2024Admin`

## Troubleshooting

### "Missing required environment variables"

**Error:**
```
❌ Error: Missing required environment variables
   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
```

**Solution:** Make sure your environment variables are set. They should be in `.env.local` or `.env.development.local`:

```bash
# Check if they're set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# If not set, you may need to:
# 1. Create a .env.local file
# 2. Copy the values from your Supabase project settings
```

### "User with this email already exists"

**Error:**
```
❌ Error: User with this email already exists
```

**Solution:** Either:
1. Use a different email address
2. Delete the existing user from Supabase Auth:
   - Go to Supabase dashboard → Authentication → Users
   - Find the user and delete them
   - Run the script again

### "Password must be at least 8 characters long"

**Error:**
```
❌ Error: Password must be at least 8 characters long
```

**Solution:** Use a password with at least 8 characters.

## Creating Other Users

To create other types of users (organizers, staff, etc.), they can:

1. **Sign up** via `/signup` page
2. **Accept invites** from organizers or super admin
3. **Be added** by the super admin to specific events

## Need Help?

If you encounter issues:

1. Check that your Supabase project is running
2. Verify environment variables are correctly set
3. Check the browser console for error messages
4. Check the terminal for detailed error output

For more information, see the main README.md in the project root.
