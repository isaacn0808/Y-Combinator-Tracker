import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

// Path to OAuth credentials file
const credentialsPath = process.env.OAUTH_CREDENTIALS_PATH || 
  path.join(__dirname, '../../credentials/oauth-credentials.json');

// Path to token storage
const tokenPath = process.env.OAUTH_TOKEN_PATH || 
  path.join(__dirname, '../../credentials/oauth-token.json');

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

/**
 * Create an OAuth2 client with the given credentials
 */
async function authorize() {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(credentialsPath)) {
      console.error(`Credentials file not found at: ${credentialsPath}`);
      console.error('Please download OAuth credentials from Google Cloud Console:');
      console.error('1. Go to https://console.cloud.google.com/');
      console.error('2. Create or select a project');
      console.error('3. Enable the Gmail API');
      console.error('4. Create OAuth credentials (Desktop app)');
      console.error('5. Download the credentials JSON file');
      console.error(`6. Save it to: ${credentialsPath}`);
      process.exit(1);
    }

    // Load client secrets from file
    const content = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(content);
    
    // Extract client ID, client secret, and redirect URIs
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    // Create OAuth client
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have a previously stored token
    if (fs.existsSync(tokenPath)) {
      console.log(`Token already exists at: ${tokenPath}`);
      console.log('To generate a new token, delete the existing token file first.');
      return;
    }

    // Get new token
    await getNewToken(oAuth2Client);
  } catch (error) {
    console.error('Error during authorization:', error);
  }
}

/**
 * Get and store new token after prompting for user authorization
 */
async function getNewToken(oAuth2Client: any) {
  // Generate authentication URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this URL:');
  console.log(authUrl);
  console.log('\n');

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Prompt user for the authorization code
  rl.question('Enter the code from that page here: ', async (code) => {
    rl.close();
    
    try {
      // Exchange authorization code for access token
      const { tokens } = await oAuth2Client.getToken(code);
      
      // Store token to disk for later program executions
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      console.log(`Token stored to: ${tokenPath}`);
    } catch (error) {
      console.error('Error retrieving access token:', error);
    }
  });
}

// Run the authorization process
authorize().catch(console.error);
