# Email Processing Pipeline Setup Guide

This guide explains how to set up the email processing pipeline for the Y Combinator Tracker application. The pipeline allows you to send emails to a dedicated Gmail account (`investmenttracker840@gmail.com`) and automatically process them using an LLM to extract relevant information about companies.

## Prerequisites

1. A Gmail account (`investmenttracker840@gmail.com`)
2. Google Cloud Platform account
3. OpenAI API key

## Step 1: Set Up Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API for your project:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

## Step 2: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Set the application type to "Web application"
4. Add `http://localhost:8088/auth/gmail/callback` as an authorized redirect URI
5. Click "Create" and note down the Client ID and Client Secret

## Step 3: Get a Refresh Token

You'll need a refresh token to allow the application to access the Gmail account without user interaction. Here's how to get one:

1. Use the OAuth 2.0 Playground:
   - Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click the gear icon in the top right and check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Select "Gmail API v1" > "https://mail.google.com/" from the list of APIs
   - Click "Authorize APIs" and follow the prompts to authorize with your Gmail account
   - Click "Exchange authorization code for tokens"
   - Note down the refresh token

## Step 4: Update Environment Variables

Add the following variables to your `.env` file:

```
# Gmail API credentials
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REDIRECT_URI="http://localhost:8088/auth/gmail/callback"
GMAIL_REFRESH_TOKEN="your-refresh-token"

# OpenAI API Key (for LLM processing)
OPENAI_API_KEY="your-openai-api-key"

# Email account to monitor
EMAIL_ADDRESS="investmenttracker840@gmail.com"
```

## Step 5: Run the Database Migration

After updating the Prisma schema with the new `ProcessedEmail` model, run the migration:

```bash
npx prisma migrate dev --name add-processed-email-model
```

## Step 6: Start the Server

Start the server to begin processing emails:

```bash
npm run dev
```

## How It Works

1. The server checks for new emails every 5 minutes
2. New emails are downloaded and stored in the database
3. Unprocessed emails are analyzed using OpenAI's GPT-4
4. The LLM extracts relevant information like:
   - Company name
   - Financial metrics
   - Business updates
   - Meeting notes
   - Evaluation points
5. The extracted data is stored in the appropriate database tables
6. Emails are marked as processed

## API Endpoints

The following API endpoints are available for managing emails:

- `GET /api/emails` - Get all processed emails
- `GET /api/emails/:id` - Get a specific email by ID
- `POST /api/emails/fetch` - Manually trigger fetching new emails
- `POST /api/emails/:id/analyze` - Manually analyze a specific email
- `POST /api/emails/process-all` - Process all unprocessed emails
- `PUT /api/emails/:id/company/:companyId` - Associate an email with a company
- `DELETE /api/emails/:id` - Delete an email

## Troubleshooting

- **Authentication Errors**: Make sure your refresh token is valid and hasn't expired
- **Rate Limiting**: The Gmail API has usage limits; consider implementing backoff strategies if you hit them
- **LLM Processing Errors**: Check that your OpenAI API key is valid and has sufficient quota

## Security Considerations

- Keep your `.env` file secure and never commit it to version control
- Consider using a dedicated Gmail account for this purpose
- Regularly rotate your OAuth credentials and refresh tokens
- Monitor your Google Cloud Console for any unusual activity
