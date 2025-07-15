# Supabase Database Setup Guide

## Overview
This guide will help you migrate from the current database to Supabase for your AI Voice Assistant application.

## Step 1: Create a Supabase Project

1. Go to the [Supabase dashboard](https://supabase.com/dashboard/projects)
2. Click "New Project"
3. Choose your organization (or create one)
4. Fill in project details:
   - **Name**: AI Voice Assistant (or your preferred name)
   - **Database Password**: Create a strong password and save it securely
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Database Connection String

1. Once your project is ready, click the "Connect" button in the top toolbar
2. Select "Database" from the connection options
3. Copy the URI value under "Connection string" → "Transaction pooler"
4. The URL will look like: `postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
5. Replace `[YOUR-PASSWORD]` with the database password you set when creating the project

## Step 3: Update Environment Variables

1. In your Replit project, go to the "Tools" panel
2. Click on "Secrets" 
3. Find the `DATABASE_URL` secret and update it with your Supabase connection string
4. The connection string should be in this format:
   ```
   postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:your_password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

## Step 4: Deploy Database Schema

After updating the DATABASE_URL, run the following command to deploy your database schema to Supabase:

```bash
npm run db:push
```

This will create all the necessary tables in your Supabase database:
- users
- sessions
- voice_profiles
- writing_samples
- embeddings
- conversations
- messages
- structure_templates
- user_sessions
- security_events

## Step 5: Verify the Migration

1. Go to your Supabase dashboard
2. Navigate to "Table Editor" in the left sidebar
3. You should see all the tables listed above
4. The application should now be using Supabase as its database

## Benefits of Supabase

- **Real-time capabilities**: Built-in real-time subscriptions
- **Authentication**: Built-in auth system (though we're using custom auth)
- **Storage**: File storage capabilities for future features
- **Dashboard**: Easy-to-use database management interface
- **Scaling**: Automatic scaling based on usage
- **Backup**: Automatic backups and point-in-time recovery

## Troubleshooting

If you encounter any issues:

1. **Connection errors**: Double-check your DATABASE_URL format and password
2. **SSL errors**: Ensure the connection string includes SSL settings
3. **Migration errors**: Check that the database is accessible and the schema is valid

## Next Steps

Once your database is migrated to Supabase:
1. Test the authentication system
2. Verify voice profile creation and management
3. Test conversation and message functionality
4. Confirm all features are working as expected

Your AI Voice Assistant is now powered by Supabase!