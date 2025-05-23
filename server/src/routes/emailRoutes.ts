import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  fetchUnreadEmails, 
  analyzeEmailContent, 
  processAnalyzedEmail,
  processAllUnprocessedEmails
} from '../services/emailService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all processed emails
router.get('/', async (req: Request, res: Response) => {
  try {
    // Use raw query to get emails with company information
    const emails = await prisma.$queryRaw`
      SELECT e.*, c.name as "companyName"
      FROM "ProcessedEmail" e
      LEFT JOIN "Company" c ON e."companyId" = c.id
      ORDER BY e."receivedAt" DESC
    `;
    
    res.json(emails);
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});


const getEmailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Use raw query to get email with company information
    // This avoids the Prisma Client type issue with processedEmail
    const emails = await prisma.$queryRaw`
      SELECT e.*, c.name as "companyName"
      FROM "ProcessedEmail" e
      LEFT JOIN "Company" c ON e."companyId" = c.id
      WHERE e.id = ${id}
    `;
    
    const email = Array.isArray(emails) && emails.length > 0 ? emails[0] : null;
    
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    
    // Parse the analysis result if it exists and is a string
    if (email.analysisResult && typeof email.analysisResult === 'string') {
      try {
        email.analysisResult = JSON.parse(email.analysisResult);
      } catch (parseError) {
        console.error('Error parsing analysis result JSON:', parseError);
        // Keep the original string if parsing fails
      }
    }
    
    res.json(email);
  } catch (error: any) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
};

// Register the route handler
router.get('/:id', getEmailById);

// Manually trigger email fetching
router.post('/fetch', async (req: Request, res: Response) => {
  try {
    const newEmails = await fetchUnreadEmails();
    res.json({ message: `Fetched ${newEmails.length} new emails` });
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Analyze a specific email
/**
 * Analyze a specific email by ID
 */
const analyzeEmailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get the email from the database using raw query
    const emails = await prisma.$queryRaw`
      SELECT * FROM "ProcessedEmail" WHERE id = ${id}
    `;
    
    const email = Array.isArray(emails) && emails.length > 0 ? emails[0] : null;
    
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    
    // Analyze the email content
    const analysisResult = await analyzeEmailContent(email);

    // Check if analysis was successful
    if (!analysisResult) {
      res.status(422).json({ 
        error: 'Failed to analyze email content',
        message: 'The email analysis service could not extract meaningful information from this email.'
      });
      return;
    }

    // Process the analyzed email only if we have a valid analysis result
    await processAnalyzedEmail(id, analysisResult);
    
    // Make sure we're returning a properly structured analysis result
    // If it's already an object, use it directly; if it's a string, parse it
    let structuredResult = analysisResult.extractedData;
    
    res.json({ 
      message: 'Email analyzed successfully',
      analysisResult: structuredResult
    });
  } catch (error: any) {
    console.error('Error analyzing email:', error);
    res.status(500).json({ error: 'Failed to analyze email' });
  }
};

// Register the route handler
router.post('/:id/analyze', analyzeEmailById);

// Process all unprocessed emails
router.post('/process-all', async (req: Request, res: Response) => {
  try {
    await processAllUnprocessedEmails();
    res.json({ message: 'Processing all unprocessed emails' });
  } catch (error: any) {
    console.error('Error processing emails:', error);
    res.status(500).json({ error: 'Failed to process emails' });
  }
});

/**
 * Associate an email with a company
 */
const associateEmailWithCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, companyId } = req.params;
    
    // Check if the email exists using raw query
    const emails = await prisma.$queryRaw`
      SELECT * FROM "ProcessedEmail" WHERE id = ${id}
    `;
    
    const email = Array.isArray(emails) && emails.length > 0 ? emails[0] : null;
    
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    
    // Check if the company exists
    const companies = await prisma.$queryRaw`
      SELECT * FROM "Company" WHERE id = ${companyId}
    `;
    
    const company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;
    
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    
    // Update the email with the company ID
    await prisma.$executeRaw`
      UPDATE "ProcessedEmail"
      SET "companyId" = ${companyId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    
    // Get the updated email with company information
    const updatedEmails = await prisma.$queryRaw`
      SELECT e.*, c.name as "companyName"
      FROM "ProcessedEmail" e
      LEFT JOIN "Company" c ON e."companyId" = c.id
      WHERE e.id = ${id}
    `;
    
    const updatedEmail = Array.isArray(updatedEmails) && updatedEmails.length > 0 ? updatedEmails[0] : null;
    
    res.json({
      message: 'Email associated with company successfully',
      email: updatedEmail
    });
  } catch (error: any) {
    console.error('Error associating email with company:', error);
    res.status(500).json({ error: 'Failed to associate email with company' });
  }
};

// Register the route handler
router.put('/:id/company/:companyId', associateEmailWithCompany);

/**
 * Delete an email by ID
 */
const deleteEmailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if the email exists using raw query
    const emails = await prisma.$queryRaw`
      SELECT * FROM "ProcessedEmail" WHERE id = ${id}
    `;
    
    const email = Array.isArray(emails) && emails.length > 0 ? emails[0] : null;
    
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    
    // Delete the email using raw query
    await prisma.$executeRaw`
      DELETE FROM "ProcessedEmail" WHERE id = ${id}
    `;
    
    res.json({ message: 'Email deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
};

// Register the route handler
router.delete('/:id', deleteEmailById);

export default router;
