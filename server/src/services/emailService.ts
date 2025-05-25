import { google } from 'googleapis';
import { simpleParser } from 'mailparser';
import { PrismaClient, Prisma } from '@prisma/client';
import { EmailData, EmailAnalysisResult } from '../types';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Normalizes a company name by removing common business suffixes and lowercasing
 */
const normalizeCompanyName = (name: string): string => {
  if (!name) return '';
  
  // Convert to lowercase
  let normalized = name.toLowerCase();
  
  // Remove common business suffixes
  const suffixes = [
    ' inc', ' inc.', ' incorporated', 
    ' llc', ' llc.', ' limited liability company',
    ' ltd', ' ltd.', ' limited',
    ' corp', ' corp.', ' corporation',
    ' co', ' co.', ' company',
    ' group', ' holdings', ' technologies', ' technology',
    ' labs', ' laboratories', ' software', ' solutions',
    ' ventures', ' capital', ' partners', ' international',
    ' global', ' worldwide', ' systems', ' network'
  ];
  
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
    }
  }
  
  // Remove special characters and extra spaces
  normalized = normalized.replace(/[^\w\s]/g, '').trim();
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
};

/**
 * Calculates similarity score between two strings (0-1)
 * Higher score means more similar
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const s1 = normalizeCompanyName(str1);
  const s2 = normalizeCompanyName(str2);
  
  // Exact match after normalization
  if (s1 === s2) return 1;
  
  // One is a substring of the other after normalization
  if (s1.includes(s2) || s2.includes(s1)) {
    // Calculate how much of the longer string is covered
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length * 0.9; // 0.9 factor since it's not an exact match
  }
  
  // Calculate Levenshtein distance
  const levDistance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  // Convert distance to similarity score (1 - normalized distance)
  return Math.max(0, 1 - levDistance / maxLength);
};

/**
 * Calculates Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill the first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
};

/**
 * Finds the best matching company in the database based on name similarity
 */
export const findCompanyByFuzzyName = async (companyName: string, similarityThreshold = 0.7): Promise<{ id: string, name: string, similarity: number } | null> => {
  if (!companyName) return null;
  
  try {
    console.log(`🔍 Finding company with fuzzy matching for: "${companyName}"`);
    
    // First try exact match (case insensitive)
    const exactMatch = await prisma.company.findFirst({
      where: {
        name: {
          equals: companyName,
          mode: 'insensitive'
        }
      }
    });
    
    if (exactMatch) {
      console.log(`✅ Found exact match: "${exactMatch.name}" (ID: ${exactMatch.id})`);
      return { id: exactMatch.id, name: exactMatch.name, similarity: 1 };
    }
    
    // Then try normalized exact match
    const normalizedInput = normalizeCompanyName(companyName);
    
    // Get all companies to compare with
    const allCompanies = await prisma.company.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    if (!allCompanies.length) {
      console.log('⚠️ No companies in database to match against');
      return null;
    }
    
    // Calculate similarity scores for each company
    const matches = allCompanies.map(company => {
      const similarity = calculateSimilarity(companyName, company.name);
      return { ...company, similarity };
    });
    
    // Sort by similarity score (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);
    
    // Get the best match if it's above the threshold
    const bestMatch = matches[0];
    
    if (bestMatch && bestMatch.similarity >= similarityThreshold) {
      console.log(`✅ Found fuzzy match: "${bestMatch.name}" (ID: ${bestMatch.id}, similarity: ${bestMatch.similarity.toFixed(2)})`);
      return bestMatch;
    }
    
    console.log(`⚠️ No company match found above threshold (${similarityThreshold}) for: "${companyName}"`);
    console.log(`📊 Best potential match: "${matches[0]?.name}" with similarity ${matches[0]?.similarity.toFixed(2)}`);
    return null;
  } catch (error) {
    console.error('❌ Error in fuzzy company name matching:', error);
    return null;
  }
};

// Email account to access
const emailAddress = process.env.EMAIL_ADDRESS || 'investmenttracker840@gmail.com';

// Path to OAuth credentials file
const credentialsPath = process.env.OAUTH_CREDENTIALS_PATH || 
  path.join(__dirname, '../../credentials/oauth-credentials.json');

// Path to token storage
const tokenPath = process.env.OAUTH_TOKEN_PATH || 
  path.join(__dirname, '../../credentials/oauth-token.json');

// Initialize Gmail API client with OAuth 2.0
const getGmailClient = async () => {
  try {
    // Read and parse the OAuth credentials file
    const credentialsFile = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsFile);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    // Create an OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have a stored token
    let token;
    if (fs.existsSync(tokenPath)) {
      const tokenFile = fs.readFileSync(tokenPath, 'utf8');
      token = JSON.parse(tokenFile);
      oAuth2Client.setCredentials(token);
    } else {
      // If no token exists, we need to get one
      // This will require user interaction, so we'll throw an error
      throw new Error('OAuth token not found. Please run the authorization script first.');
    }
    
    return google.gmail({ version: 'v1', auth: oAuth2Client });
  } catch (error) {
    console.error('Error initializing Gmail client with OAuth:', error);
    throw error;
  }
};

/**
 * Fetches unread emails from Gmail
 */
export const fetchUnreadEmails = async (): Promise<EmailData[]> => {
  try {
    console.log('📧 Fetching unread emails from Gmail...');
    const gmail = await getGmailClient();
    
    // Get list of unread messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10, // Limit to 10 emails per fetch
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('📭 No unread messages found.');
      return [];
    }
    
    console.log(`📬 Found ${response.data.messages.length} unread messages.`);

    const emails: EmailData[] = [];

    // Process each message
    for (const message of response.data.messages) {
      if (!message.id) continue;

      // Check if we've already processed this email
      // Using raw query since the schema might not be fully synchronized
      const existingEmails = await prisma.$queryRaw`
        SELECT * FROM "ProcessedEmail" WHERE "messageId" = ${message.id}
      `;
      const existingEmail = Array.isArray(existingEmails) && existingEmails.length > 0 ? existingEmails[0] : null;

      if (existingEmail) {
        console.log(`⏭️ Email ${message.id} already processed, skipping.`);
        continue; // Skip to next message instead of returning
      }
      
      console.log(`🔍 Processing email ID: ${message.id}`);

      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      if (!fullMessage.data || !fullMessage.data.payload) {
        console.log(`⚠️ Could not fetch details for message ${message.id}`);
        continue; // Skip to next message instead of returning
      }

      // Extract headers
      const headers = fullMessage.data.payload.headers || [];
      // Use type assertion to handle Gmail API types
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

      // Extract message body
      let body = '';
      
      if (fullMessage.data.payload.parts) {
        // Multi-part message
        for (const part of fullMessage.data.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            const decodedBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            body += decodedBody;
          }
        }
      } else if (fullMessage.data.payload.body?.data) {
        // Single part message
        body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
      }

      // Parse the email date
      const receivedAt = new Date(date);

      // Create email data object
      const emailData: EmailData = {
        messageId: message.id,
        subject,
        sender: from,
        receivedAt,
        content: body,
      };

      emails.push(emailData);

      // Mark as read (optional)
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      // Store in database using raw query
      await prisma.$executeRaw`
        INSERT INTO "ProcessedEmail" ("id", "messageId", "subject", "sender", "receivedAt", "content", "processed", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${message.id}, ${subject}, ${from}, ${receivedAt}, ${body}, false, NOW(), NOW())
        ON CONFLICT ("messageId") DO NOTHING
      `;
      
      console.log(`💾 Saved email to database: "${subject}" from ${from}`);
    }

    console.log(`✅ Successfully processed ${emails.length} emails.`);
    return emails;
  } catch (error) {
    console.error('❌ Error fetching emails:', error);
    return [];
  }
};

/**
 * Analyzes email content using OpenAI to extract relevant information
 */
export const analyzeEmailContent = async (emailId: string): Promise<EmailAnalysisResult | null> => {
  try {
    console.log(`🧠 Starting analysis of email ID: ${emailId}`);
    
    // Get the email from database using raw query
    const emails = await prisma.$queryRaw`
      SELECT * FROM "ProcessedEmail" WHERE "id" = ${emailId}
    `;
    const email = Array.isArray(emails) && emails.length > 0 ? emails[0] : null;

    if (!email) {
      console.error(`❌ Email with ID ${emailId} not found`);
      return null;
    }
    
    console.log(`📝 Analyzing email: "${email.subject}" from ${email.sender}`);

    // Prepare prompt for OpenAI
    const prompt = `
    Analyze the following email content related to a startup company. Your task is to extract structured information about the company mentioned in the email. Focus on these specific areas:
    
    1. Company name (if mentioned)
    
    2. Key metrics - Identify any of these specific metrics if mentioned:
       - MRR (Monthly Recurring Revenue)
       - ARR (Annual Recurring Revenue)
       - USER_COUNT (number of users)
       - CUSTOMER_COUNT (number of paying customers)
       - GROWTH_RATE_MOM (Month-over-Month growth rate)
       - GROWTH_RATE_WOW (Week-over-Week growth rate)
       - BURN_RATE (monthly cash burn)
       - RUNWAY (months of runway remaining)
       - FUNDING_TOTAL (total funding raised)
       - VALUATION (company valuation)
       For each metric, extract the numeric value and also the full text description.
    
    3. Interaction type - Classify this email/content as ONE of these interaction types:
       - EMAIL (general email communication)
       - MEETING (meeting notes or summary)
       - CALL (call notes or summary)
       - DEMO (product demonstration notes)
       - YC_APPLICATION_REVIEW (Y Combinator application review)
       - GENERAL_NOTE (general notes about the company)
       - OTHER (doesn't fit any category above)
       Include a summary and any relevant notes about the interaction. 
    
    4. Evaluation categories - For each of these categories that are discussed in the email, provide notes and assign a score from 1-10:
       - PROBLEM (the problem the company is solving)
       - SOLUTION (the company's solution to the problem)
       - TEAM (the founding team and their capabilities)
       - MARKET (market size and opportunity)
       - BUSINESS_MODEL (how the company makes/will make money)
       - TRACTION (growth and customer adoption metrics)
       - COMPETITION (competitive landscape)
       - DIFFERENTIATION (how they stand out from competitors)
       - INVESTMENT_POTENTIAL (overall investment attractiveness)
       Only include categories that are actually discussed in the email with sufficient information to make an assessment.

    Format your response as a structured JSON with these exact keys: companyName, metrics (array), interaction (object), and evaluationNotes (array). As an example, the JSON should look like this:  "companyName": "Theorem",
  "metrics": [
    {
      "name": "MRR",
      "value": 30000000
    },
    {
      "name": "ARR",
      "value": 60000000
    },
    {
      "name": "USER_COUNT",
      "value": 350      
    },
    {
      "name": "CUSTOMER_COUNT",
      "value": 200      
    },
    {
      "name": "GROWTH_RATE_MOM",
      "value": 0.75    
    },
    {
      "name": "GROWTH_RATE_WOW",
      "value": null 
    },
    {
      "name": "BURN_RATE",
      "value": null
    },
    {
      "name": "RUNWAY",
      "value": 7      
    },
    {
      "name": "FUNDING_TOTAL",
      "value": 900000     
    },
    {
      "name": "VALUATION",
      "value": 12000000
    }
  ],
  "interaction": {
    "type": "EMAIL",
    "summary": "Email describes potential considerations for Series A investment in Theorem, outlines significant market opportunity, discusses technological strengths, risks, and possible investment terms including milestones to meet for a Series A raise."
  },
  "evaluationNotes": [
    {
      "category": "PROBLEM",
      "notes": "Addressing the need for software verification in critical industries such as aviation and automotive, which have stringent regulatory standards.",    
      "score": 9
    },
    {
      "category": "SOLUTION",
      "notes": "Provides a cloud platform, ProofCloud, that autogenerates proof artifacts for verification standards, significantly automating the verification process.",
      "score": 8
    },
    {
      "category": "TEAM",
      "notes": "No specific details on the team's background or capabilities were provided.",
      "score": null
    },
    {
      "category": "MARKET",
      "notes": "The software verification services market is expected to grow to approximately $12 billion by 2033, indicating a significant market opportunity.",    
      "score": 8
    },
    {
      "category": "BUSINESS_MODEL",
      "notes": "Theorem operates on a SaaS model with anticipated high margins, enabling scalability and recurring revenue.",
      "score": 8
    },
    {
      "category": "TRACTION",
      "notes": "The company is at an early stage with pilot programs underway. Detailed user or revenue traction is not disclosed.",
      "score": null
    },
    {
      "category": "COMPETITION",
      "notes": "Faces competition from established EDA vendors like Synopsys, Siemens, and Cadence that could challenge its market penetration.",
      "score": 6
    },
    {
      "category": "DIFFERENTIATION",
      "notes": "Distinguishes itself through advanced neural theorem proving technology and compliance with stringent regulatory standards.",
      "score": 8
    },
    {
      "category": "INVESTMENT_POTENTIAL",
      "notes": "The proposed investment terms suggest a cautious yet optimistic valuation, considering technological advancements and market growth.",
      "score": 7
    }
  ]
}

Please make sure to use the exact same key values as the example above.
    
    Email Subject: ${email.subject}
    Email Content:
    ${email.content}
    `;

    // Call OpenAI API
    console.log('🤖 Sending email content to OpenAI for analysis...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an AI assistant specialized in analyzing emails about startup companies. Your task is to extract structured information about metrics, interactions, and evaluation criteria. Be precise in your categorization and scoring. Only include information that is explicitly mentioned or can be reasonably inferred from the email content. For evaluation scores, only provide scores when there is sufficient information to make a meaningful assessment on the 1-10 scale." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const analysisResult = completion.choices[0].message.content;
    
    if (!analysisResult) {
      console.error('❌ No analysis result returned from OpenAI');
      return null;
    }
    
    console.log('✅ Received analysis result from OpenAI');

    // Parse the JSON response
    const parsedResult = JSON.parse(analysisResult);
    console.log('📊 Parsed analysis result:', JSON.stringify(parsedResult, null, 2));
    
    // Try to identify the company using fuzzy matching
    let companyId: string | undefined;
    let companyName: string | undefined;
    
    if (parsedResult.companyName) {
      console.log(`🔍 Looking up company with fuzzy matching: "${parsedResult.companyName}"`);
      
      // Use the new fuzzy matching function
      const companyMatch = await findCompanyByFuzzyName(parsedResult.companyName);
      
      if (companyMatch) {
        companyId = companyMatch.id;
        companyName = companyMatch.name;
        console.log(`✅ Found matching company in database: "${companyName}" (ID: ${companyId}, similarity: ${companyMatch.similarity.toFixed(2)})`);
      } else {
        // Fallback to the original contains method with lower threshold if needed
        console.log(`⚠️ No fuzzy match found, trying fallback method for: "${parsedResult.companyName}"`);
        const company = await prisma.company.findFirst({
          where: {
            name: {
              contains: parsedResult.companyName,
              mode: 'insensitive'
            }
          }
        });
        
        if (company) {
          companyId = company.id;
          companyName = company.name;
          console.log(`✅ Found matching company with fallback method: "${companyName}" (ID: ${companyId})`);
        } else {
          console.log(`⚠️ No matching company found for: "${parsedResult.companyName}"`);
        }
      }
    } else {
      console.log('⚠️ No company name identified in the email');
    }

    // Update the email record with analysis results using raw query
    console.log('💾 Updating email record with analysis results...');
    const now = new Date();
    await prisma.$executeRaw`
      UPDATE "ProcessedEmail"
      SET "analysisResult" = ${analysisResult},
          "analysisDate" = ${now},
          "processed" = true,
          "companyId" = ${companyId},
          "updatedAt" = NOW()
      WHERE "id" = ${emailId}
    `;

    // Return the analysis result
    console.log('✅ Email analysis completed successfully');
    return {
      companyId,
      companyName,
      analysisResult,
      extractedData: parsedResult
    };
  } catch (error) {
    console.error('❌ Error analyzing email content:', error);
    return null;
  }
};

/**
 * Processes analyzed email data and updates the database
 */
export const processAnalyzedEmail = async (emailId: string, analysisResult: EmailAnalysisResult): Promise<void> => {
  try {
    console.log(`📋 Processing analyzed email data for email ID: ${emailId}`);
    
    if (!analysisResult.companyId || !analysisResult.extractedData) {
      console.log('⚠️ No company ID or extracted data available for processing');
      return;
    }

    const companyId = analysisResult.companyId;
    const extractedData = analysisResult.extractedData;
    
    // Define valid metric names for validation
    const validMetricNames = [
      'MRR', 'ARR', 'USER_COUNT', 'CUSTOMER_COUNT', 'GROWTH_RATE_MOM', 
      'GROWTH_RATE_WOW', 'BURN_RATE', 'RUNWAY', 'FUNDING_TOTAL', 'VALUATION', 'OTHER'
    ];
    
    // Track if we have any valid evaluation data
    let hasValidEvaluationData = false;

    // Process metrics if available
    if (extractedData.metrics && extractedData.metrics.length > 0) {
      console.log('📊 Processing metrics...');
      for (const metric of extractedData.metrics) {
        // Log the raw metric object to debug what fields are actually present
        console.log(`🔍 Raw metric object:`, JSON.stringify(metric, null, 2));
        
        // Try to extract metric name from various possible fields
        // The OpenAI model might be returning the metric type in different fields
        let metricName = '';
        
        // Check all possible fields where the metric name might be
        if (metric.name) {
          metricName = metric.name.toUpperCase();
        } else if (typeof metric.description === 'string' && metric.description.includes(':')) {
          // Try to extract from description if it has a format like "MRR: $10,000"
          const parts = metric.description.split(':');
          if (parts.length > 0) {
            metricName = parts[0].trim().toUpperCase();
          }
        }
        
        // Map common variations to our standard metric names
        if (metricName.includes('MRR') || metricName.includes('MONTHLY RECURRING REVENUE')) {
          metricName = 'MRR';
        } else if (metricName.includes('ARR') || metricName.includes('ANNUAL RECURRING REVENUE')) {
          metricName = 'ARR';
        } else if (metricName.includes('USER') || metricName.includes('USERS')) {
          metricName = 'USER_COUNT';
        } else if (metricName.includes('CUSTOMER') || metricName.includes('CUSTOMERS')) {
          metricName = 'CUSTOMER_COUNT';
        } else if (metricName.includes('GROWTH') && metricName.includes('MOM')) {
          metricName = 'GROWTH_RATE_MOM';
        } else if (metricName.includes('GROWTH') && metricName.includes('WOW')) {
          metricName = 'GROWTH_RATE_WOW';
        } else if (metricName.includes('BURN')) {
          metricName = 'BURN_RATE';
        } else if (metricName.includes('RUNWAY')) {
          metricName = 'RUNWAY';
        } else if (metricName.includes('FUNDING') || metricName.includes('RAISED')) {
          metricName = 'FUNDING_TOTAL';
        } else if (metricName.includes('VALUATION')) {
          metricName = 'VALUATION';
        }
        
        console.log(`📊 Extracted metric name: "${metricName}" from metric object`);
        
        if (!validMetricNames.includes(metricName)) {
          console.log(`⚠️ Invalid metric name: ${metricName}, skipping...`);
          continue;
        }
        
        try {
          // Skip creating metrics with null values
          if (metric.value === null || metric.value === undefined) {
            console.log(`⚠️ Skipping creation of metric ${metricName} due to null/undefined value`);
          } else {
            await prisma.metric.create({
              data: {
                companyId,
                name: metricName as any, // Cast to enum type
                value: metric.value,
                valueString: metric.description || `${metric.value}`,
                dateRecorded: metric.dateRecorded || new Date(),
                source: 'Email Analysis',
              }
            });
            console.log(`✅ Created metric ${metricName}: ${metric.value} for company ${companyId}`);
          }
          
          // Update the company's snapshot metrics and funding info fields if applicable
          const updateData: Record<string, any> = {};
          
          // Update company metrics snapshots
          if (['USER_COUNT', 'GROWTH_RATE_MOM', 'GROWTH_RATE_WOW', 'BURN_RATE', 'ARR', 'MRR'].includes(metricName)) {
            // Skip null values
            if (metric.value === null || metric.value === undefined) {
              console.log(`⚠️ Skipping null/undefined value for metric ${metricName}`);
            } else {
              if (metricName === 'USER_COUNT') {
                updateData.metrics_userCount = metric.valueString || `${metric.value}`;
              } else if (metricName === 'GROWTH_RATE_MOM' || metricName === 'GROWTH_RATE_WOW') {
                updateData.metrics_growthRate = metric.valueString || `${metric.value}%`;
              } else if (metricName === 'BURN_RATE') {
                updateData.metrics_burnRate = metric.valueString || `$${metric.value}`;
              } else if (metricName === 'ARR' || metricName === 'MRR') {
                updateData.metrics_revenue = metric.valueString || `$${metric.value}`;
              }
            }
          }
          
          // Update funding info snapshots
          if (['FUNDING_TOTAL', 'VALUATION', 'RUNWAY'].includes(metricName)) {
            // Skip null values
            if (metric.value === null || metric.value === undefined) {
              console.log(`⚠️ Skipping null/undefined value for metric ${metricName}`);
            } else {
              if (metricName === 'FUNDING_TOTAL') {
                updateData.funding_raised = metric.valueString || `$${metric.value}`;
              } else if (metricName === 'VALUATION') {
                updateData.funding_valuation = metric.valueString || `$${metric.value}`;
              } else if (metricName === 'RUNWAY') {
                updateData.funding_runway = metric.valueString || `${metric.value} months`;
              }
            }
          }
          
          // If we have any updates to make
          if (Object.keys(updateData).length > 0) {
            await prisma.company.update({
              where: { id: companyId },
              data: updateData
            });
            console.log(`✅ Updated company snapshot data for ${companyId}`);
          }
        } catch (error) {
          console.error(`❌ Error creating metric ${metricName}:`, error);
        }
      }
    }

    // Process interaction if available
    if (extractedData.interaction) {
      console.log('📋 Processing interaction...');
      const interaction = extractedData.interaction;
      
      // Validate the interaction type against the InteractionType enum
      const validInteractionTypes = [
        'EMAIL', 'MEETING', 'CALL', 'DEMO', 'YC_APPLICATION_REVIEW', 'GENERAL_NOTE', 'OTHER'
      ];
      
      // Default to 'OTHER' if type is missing or invalid
      let interactionType = 'OTHER';
      
      if (interaction.type) {
        interactionType = interaction.type.toUpperCase();
        if (!validInteractionTypes.includes(interactionType)) {
          console.log(`⚠️ Invalid interaction type: ${interactionType}, defaulting to OTHER`);
          interactionType = 'OTHER';
        }
      } else {
        console.log('⚠️ No interaction type specified, defaulting to OTHER');
      }
      
      try {
        // Create the interaction
        const interactionDate = interaction.date || new Date();
        
        // Prepare interaction data, omitting null/undefined values
        const interactionData: Prisma.InteractionCreateInput = {
          company: {
            connect: {
              id: companyId
            }
          },
          type: interactionType as any, // Cast to enum type
          date: interactionDate,
          summary: interaction.summary || 'Email interaction',
        };
        
        // Only include non-null fields
        if (interaction.notes !== null && interaction.notes !== undefined) {
          interactionData.notes = interaction.notes;
        }
        
        if (interaction.participants !== null && interaction.participants !== undefined) {
          interactionData.participants = interaction.participants;
        }
        
        if (interaction.followUpNeeded !== null && interaction.followUpNeeded !== undefined) {
          interactionData.followUpNeeded = interaction.followUpNeeded;
        }
        
        await prisma.interaction.create({
          data: interactionData
        });
        console.log(`✅ Created interaction of type ${interactionType} for company ${companyId}`);
        
        // If this is a meeting interaction, update the lastMeetingDate and metWith fields
        if (interactionType === 'MEETING') {
          await prisma.company.update({
            where: { id: companyId },
            data: {
              lastMeetingDate: interactionDate,
              metWith: true
            }
          });
          console.log(`✅ Updated lastMeetingDate and metWith for company ${companyId}`);
        }
      } catch (error) {
        console.error(`❌ Error creating interaction:`, error);
      }
    }

    // Process evaluation notes if available
    if (extractedData.evaluationNotes && extractedData.evaluationNotes.length > 0) {
      console.log('📋 Processing evaluation notes...');
      // Group by category
      // Use a mutable object to allow adding properties dynamically
      const evaluationData: Record<string, any> = {
        companyId,
        evaluationDate: new Date(),
        evaluator: 'Email Analysis',
      };
      
      // Helper function to add non-null properties to the evaluation data
      const addIfNotNull = (obj: Record<string, any>, key: string, value: any) => {
        if (value !== null && value !== undefined) {
          obj[key] = value;
        }
      };

      // Update our tracking variable for valid evaluation data

      for (const note of extractedData.evaluationNotes) {
        const category = note.category.toUpperCase();
        
        // Map category to the corresponding field names in the Evaluation model
        if (category === 'PROBLEM') {
          addIfNotNull(evaluationData, 'problemNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.problemScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'SOLUTION') {
          addIfNotNull(evaluationData, 'solutionNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.solutionScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'TEAM') {
          addIfNotNull(evaluationData, 'teamNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.teamScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'MARKET' || category === 'MARKET_SIZE') {
          addIfNotNull(evaluationData, 'marketNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.marketScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'BUSINESS_MODEL') {
          addIfNotNull(evaluationData, 'businessModelNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.businessModelScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'TRACTION') {
          addIfNotNull(evaluationData, 'tractionNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.tractionScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'COMPETITION') {
          addIfNotNull(evaluationData, 'competitionNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.competitionScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'DIFFERENTIATION') {
          addIfNotNull(evaluationData, 'differentiationNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.differentiationScore = note.score;
            hasValidEvaluationData = true;
          }
        } else if (category === 'INVESTMENT_POTENTIAL') {
          addIfNotNull(evaluationData, 'investmentPotentialNotes', note.notes);
          if (note.score !== null && note.score !== undefined && note.score >= 1 && note.score <= 10) {
            evaluationData.investmentPotentialScore = note.score;
            hasValidEvaluationData = true;
          }
        }
      }

      // Only update/create evaluation if we have valid scores
      if (hasValidEvaluationData) {
        try {
          // First check if there's an existing evaluation for today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const existingEvaluation = await prisma.evaluation.findFirst({
            where: {
              companyId,
              evaluationDate: {
                gte: today,
                lt: tomorrow
              }
            }
          });
          
          if (existingEvaluation) {
            // Update existing evaluation, only updating non-null fields
            console.log(`🔄 Found existing evaluation (ID: ${existingEvaluation.id}), updating with new data...`);
            
            // Log what fields we're updating
            const updateFields = Object.keys(evaluationData).filter(key => 
              key !== 'companyId' && key !== 'evaluationDate' && key !== 'evaluator'
            );
            console.log(`📝 Fields to update: ${updateFields.join(', ')}`);
            
            await prisma.evaluation.update({
              where: { id: existingEvaluation.id },
              data: evaluationData
            });
            
            console.log(`✅ Updated existing evaluation for company ${companyId} from email analysis`);
          } else {
            // Create new evaluation
            await prisma.evaluation.create({
              data: evaluationData as any
            });
            
            console.log(`✅ Created new evaluation for company ${companyId} from email analysis`);
          }
        } catch (error) {
          console.error(`❌ Error processing evaluation:`, error);
        }
      } else {
        console.log(`⚠️ No valid evaluation scores found, skipping evaluation creation`);
      }
    }

    // Create detailed update log entries for each type of change
    const updateLogs = [];
    
    // Log metrics updates
    if (extractedData.metrics && extractedData.metrics.length > 0) {
      for (const metric of extractedData.metrics) {
        // Use metric field or fall back to metric_type
        const metricName = (metric.name || '').toUpperCase();
        if (validMetricNames.includes(metricName)) {
          // Only create update logs for non-null values
          if (metric.value !== null && metric.value !== undefined) {
            updateLogs.push({
              companyId,
              fieldName: `Metric: ${metricName}`,
              newValue: metric.valueString || `${metric.value}`,
              source: 'Email Analysis',
              timestamp: new Date()
            });
          }
        }
      }
    }
    
    // Log interaction update
    if (extractedData.interaction) {
      // Safely get interaction type with fallback to 'OTHER'
      const interactionType = extractedData.interaction.type ? 
        extractedData.interaction.type.toUpperCase() : 'OTHER';
      
      updateLogs.push({
        companyId,
        fieldName: `Interaction: ${interactionType}`,
        newValue: extractedData.interaction.summary || 'Email interaction',
        source: 'Email Analysis',
        timestamp: new Date()
      });
    }
    
    // Log evaluation updates
    if (extractedData.evaluationNotes && extractedData.evaluationNotes.length > 0 && hasValidEvaluationData) {
      // Create a summary of all evaluation categories that were scored
      const scoredCategories = extractedData.evaluationNotes
        .filter(note => note.score && note.score >= 1 && note.score <= 10)
        .map(note => `${note.category.toUpperCase()}: ${note.score}/10`);
      
      if (scoredCategories.length > 0) {
        updateLogs.push({
          companyId,
          fieldName: 'Evaluation',
          newValue: `New evaluation scores: ${scoredCategories.join(', ')}`,
          source: 'Email Analysis',
          timestamp: new Date()
        });
      }
    }
    
    // Add a general log entry for the email processing if no specific updates were logged
    if (updateLogs.length === 0) {
      updateLogs.push({
        companyId,
        fieldName: 'Email Processing',
        newValue: `Processed email: ${emailId} (No actionable data found)`,
        source: 'Email Service',
        timestamp: new Date()
      });
    }
    
    // Create all update log entries
    for (const logEntry of updateLogs) {
      await prisma.updateLog.create({ data: logEntry });
    }
    
    console.log(`✅ Created ${updateLogs.length} update log entries for company ${companyId}`);

  } catch (error) {
    console.error('❌ Error processing analyzed email:', error);
  }
};

/**
 * Processes all unprocessed emails in the database
 */
export const processAllUnprocessedEmails = async (): Promise<void> => {
  try {
    // Get all unprocessed emails using raw query
    const unprocessedEmails = await prisma.$queryRaw<Array<{id: string, subject: string, content: string, processed: boolean}>>`
      SELECT * FROM "ProcessedEmail" WHERE "processed" = false
    `;

    console.log(`Found ${unprocessedEmails.length} unprocessed emails`);

    for (const email of unprocessedEmails) {
      // Analyze the email
      const analysisResult = await analyzeEmailContent(email.id);
      
      if (analysisResult && analysisResult.companyId) {
        // Process the analyzed data
        await processAnalyzedEmail(email.id, analysisResult);
      }
    }
  } catch (error) {
    console.error('Error processing unprocessed emails:', error);
  }
};

/**
 * Starts the email processing cron job
 */
export const startEmailProcessingCron = (): void => {
  // Check for new emails twice a minute (every 30 seconds)
  cron.schedule('*/30 * * * * *', async () => {
    console.log('Running email fetch cron job at', new Date().toISOString());
    
    try {
      // Fetch new emails
      const newEmails = await fetchUnreadEmails();
      console.log(`Fetched ${newEmails.length} new emails`);
      
      // Process all unprocessed emails
      await processAllUnprocessedEmails();
    } catch (error) {
      console.error('Error in email processing cron job:', error);
    }
  });

  console.log('Email processing cron job started (checking twice per minute)');
};

/**
 * Initializes the email service
 */
export const initializeEmailService = async (): Promise<void> => {
  try {
    // Check if OAuth credentials file exists
    if (!fs.existsSync(credentialsPath)) {
      console.error(`OAuth credentials file not found at: ${credentialsPath}`);
      return;
    }
    
    // Check if OAuth token file exists
    if (!fs.existsSync(tokenPath)) {
      console.error(`OAuth token file not found at: ${tokenPath}`);
      console.error('Please run the authorization script first to generate a token.');
      return;
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing. Email service will not start.');
      return;
    }
    
    // Test Gmail API connection
    try {
      const gmail = await getGmailClient();
      console.log(`Gmail API initialized successfully for ${emailAddress}`);
      
      // Start email processing cron job
      startEmailProcessingCron();
    } catch (error) {
      console.error('Failed to initialize Gmail API:', error);
    }
  } catch (error) {
    console.error('Error initializing email service:', error);
  }
}
