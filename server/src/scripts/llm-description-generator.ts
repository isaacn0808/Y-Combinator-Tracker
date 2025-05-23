import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Get the API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize OpenAI client with explicit API key
const openai = new OpenAI({
  apiKey: apiKey || '', // Provide empty string as fallback to avoid undefined
});

interface DescriptionGeneratorConfig {
  companyId?: string;
  batchName?: string;
  limit?: number;
  delayMs?: number;
  model?: string;
  dryRun?: boolean;
  overwriteExisting?: boolean;
  startAfterCompanyId?: string; // For resuming after an error
  mockLLM?: boolean; // For testing without using API credits
}

/**
 * Collects all evaluation notes and other relevant information for a company
 */
async function collectCompanyEvaluationNotes(companyId: string): Promise<string> {
  try {
    // Get all evaluations for the company
    const evaluations = await prisma.evaluation.findMany({
      where: { companyId },
      orderBy: { evaluationDate: 'desc' },
    });

    // Get other relevant company data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        founders: true,
        metrics: {
          orderBy: { dateRecorded: 'desc' },
          take: 5
        },
        interactions: {
          orderBy: { date: 'desc' },
          take: 3
        },
        updateLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    if (!company) {
      return "Company not found.";
    }

    let allNotes = "";

    // If evaluations exist, compile all notes from evaluations
    if (evaluations.length > 0) {
      allNotes += "### Evaluation Notes\n\n";
      
      for (const evaluation of evaluations) {
        allNotes += `Evaluation Date: ${evaluation.evaluationDate.toISOString().split('T')[0]}\n`;
        allNotes += `Evaluator: ${evaluation.evaluator || 'Unknown'}\n\n`;
        
        // Add category-specific notes if they exist
        if (evaluation.problemNotes) allNotes += `Problem: ${evaluation.problemNotes}\n`;
        if (evaluation.solutionNotes) allNotes += `Solution: ${evaluation.solutionNotes}\n`;
        if (evaluation.teamNotes) allNotes += `Team: ${evaluation.teamNotes}\n`;
        if (evaluation.marketNotes) allNotes += `Market: ${evaluation.marketNotes}\n`;
        if (evaluation.businessModelNotes) allNotes += `Business Model: ${evaluation.businessModelNotes}\n`;
        if (evaluation.tractionNotes) allNotes += `Traction: ${evaluation.tractionNotes}\n`;
        if (evaluation.competitionNotes) allNotes += `Competition: ${evaluation.competitionNotes}\n`;
        if (evaluation.differentiationNotes) allNotes += `Differentiation: ${evaluation.differentiationNotes}\n`;
        if (evaluation.investmentPotentialNotes) allNotes += `Investment Potential: ${evaluation.investmentPotentialNotes}\n`;
        
        // Add overall notes if they exist
        if (evaluation.overallNotes) allNotes += `\nOverall Notes: ${evaluation.overallNotes}\n`;
        
        allNotes += "\n---\n\n";
      }
    } else {
      allNotes += "### No Evaluation Notes Available\n\n";
    }

    // Add founder information if available
    if (company.founders && company.founders.length > 0) {
      allNotes += "### Founder Information\n\n";
      for (const founder of company.founders) {
        allNotes += `${founder.name}${founder.title ? ` (${founder.title})` : ''}\n`;
        if (founder.linkedin) allNotes += `LinkedIn: ${founder.linkedin}\n`;
        if (founder.bio) allNotes += `Background: ${founder.bio}\n`;
        allNotes += "\n";
      }
      allNotes += "---\n\n";
    }

    // Add recent metrics if available
    if (company.metrics && company.metrics.length > 0) {
      allNotes += "### Recent Metrics\n\n";
      for (const metric of company.metrics) {
        const date = metric.dateRecorded.toISOString().split('T')[0];
        const valueStr = metric.valueString || `${metric.value}`;
        allNotes += `${date} - ${metric.name}: ${valueStr}\n`;
      }
      allNotes += "\n---\n\n";
    }

    // Add recent interactions if available
    if (company.interactions && company.interactions.length > 0) {
      allNotes += "### Recent Interactions\n\n";
      for (const interaction of company.interactions) {
        const date = interaction.date.toISOString().split('T')[0];
        allNotes += `${date} - ${interaction.type}: ${interaction.summary}\n`;
        if (interaction.notes) allNotes += `Notes: ${interaction.notes}\n`;
        allNotes += "\n";
      }
      allNotes += "---\n\n";
    }

    // Add recent update logs if available
    if (company.updateLogs && company.updateLogs.length > 0) {
      allNotes += "### Recent Updates\n\n";
      for (const log of company.updateLogs) {
        const date = log.timestamp.toISOString().split('T')[0];
        allNotes += `${date} - Field '${log.fieldName}' updated`;
        if (log.source) allNotes += ` (Source: ${log.source})`;
        allNotes += "\n";
      }
      allNotes += "\n---\n\n";
    }

    // If we have no information at all, return a specific message
    if (allNotes.trim() === "") {
      return "No detailed information found for this company.";
    }

    return allNotes;
  } catch (error) {
    console.error(`Error collecting information for company ${companyId}:`, error);
    return `Error collecting company information: ${error}`;
  }
}

/**
 * Generate a comprehensive description for a company using LLM
 */
async function generateCompanyDescription(
  company: any, 
  evaluationNotes: string, 
  model: string = 'gpt-4o',
  mockLLM: boolean = false
): Promise<string> {
  try {
    console.log(`Generating description for ${company.name}...`);

    // If mockLLM is true, return a mock description without calling the API
    if (mockLLM) {
      console.log(`[MOCK MODE] Generating mock description for ${company.name}`);
      return generateMockDescription(company);
    }

    // Check if we have evaluation notes
    const hasEvaluations = evaluationNotes && evaluationNotes !== "No evaluations found for this company.";
    
    // Create the prompt for the LLM
    let prompt = `
You are an expert startup analyst with deep knowledge of the tech industry, venture capital, and startup ecosystems.

I need you to generate a comprehensive, professional description for the company "${company.name}" based on the following information:

Company Information:
- Name: ${company.name}
- One-liner: ${company.oneLiner}
- Business Model: ${company.businessModel || 'Not specified'}
- Founded: ${company.foundedDate ? new Date(company.foundedDate).toISOString().split('T')[0] : 'Unknown'}
- Sectors: ${company.sectors.join(', ')}
- Y Combinator Batch: ${company.ycBatch}
- Website: ${company.website || 'Not available'}
`;

    // Add evaluation notes if available
    if (hasEvaluations) {
      prompt += `
Evaluation Notes:
${evaluationNotes}
`;
    } else {
      // If no evaluations, provide additional instructions to extrapolate from limited data
      prompt += `
Note: This company does not have detailed evaluation notes available. Please extrapolate from the company information, sector trends, and your knowledge of similar Y Combinator companies to create a plausible description.
`;
      
      // Add sector-specific context if possible
      if (company.sectors && company.sectors.length > 0) {
        prompt += `
Please consider typical business models, challenges, and opportunities in the ${company.sectors.join(', ')} sector(s) when crafting this description.
`;
      }
      
      // Add one-liner context
      if (company.oneLiner) {
        prompt += `
Based on their one-liner: "${company.oneLiner}", please infer their likely value proposition and target market.
`;
      }
    }

    // Common instructions for all descriptions
    prompt += `
Based on all available information, write a comprehensive, professional description of the company that:
1. Clearly explains what the company does
2. Highlights their unique value proposition
3. Describes their target market and business model
4. Mentions any notable traction, team strengths, or competitive advantages
5. Is written in a professional, third-person style
6. Is between 150-300 words in length

The description should be factual, balanced, and suitable for a professional investment tracking platform.
`;

    try {
      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a professional business analyst who writes clear, concise, and informative company descriptions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
      });

      // Extract and return the generated description
      const description = response.choices[0]?.message?.content?.trim() || '';
      return description;
    } catch (apiError: any) {
      // Check for quota errors specifically
      if (apiError.error?.type === 'insufficient_quota' || 
          apiError.message?.includes('quota') || 
          apiError.message?.includes('rate limit')) {
        console.error('⚠️ OpenAI API QUOTA EXCEEDED! Please check your billing status.');
        throw new Error('QUOTA_EXCEEDED');
      }
      
      // Re-throw other API errors
      throw apiError;
    }
  } catch (error: any) {
    // If it's a quota error, rethrow it so the main function can handle it
    if (error.message === 'QUOTA_EXCEEDED') {
      throw error;
    }
    
    console.error(`Error generating description for ${company.name}:`, error);
    return `Error generating description: ${error.message || error}`;
  }
}

/**
 * Generate a mock description for testing without using the API
 */
function generateMockDescription(company: any): string {
  const sectors = company.sectors.join(', ');
  return `${company.name} is a ${sectors} company from the ${company.ycBatch} batch of Y Combinator. ${company.oneLiner}. ` +
    `Founded in ${company.foundedDate ? new Date(company.foundedDate).getFullYear() : 'recent years'}, ` +
    `the company operates with a ${company.businessModel || 'innovative'} business model. ` +
    `This is a mock description generated for testing purposes without using the OpenAI API.`;
}

/**
 * Update a company's description in the database
 */
async function updateCompanyDescription(companyId: string, description: string, dryRun: boolean = false): Promise<void> {
  try {
    if (dryRun) {
      console.log(`[DRY RUN] Would update description for company ${companyId}`);
      console.log(`New description: ${description}`);
      return;
    }

    // Update the company record
    await prisma.company.update({
      where: { id: companyId },
      data: { description }
    });

    // Create an update log entry
    await prisma.updateLog.create({
      data: {
        companyId,
        fieldName: 'description',
        newValue: description,
        source: 'LLM Description Generator'
      }
    });

    console.log(`✅ Updated description for company ${companyId}`);
  } catch (error) {
    console.error(`Error updating description for company ${companyId}:`, error);
  }
}

/**
 * Process all companies and generate descriptions
 */
async function generateAllCompanyDescriptions(config: DescriptionGeneratorConfig = {}): Promise<void> {
  try {
    console.log('Starting company description generation process...');
    
    // Build the query based on configuration
    const where: any = {};
    
    if (config.companyId) {
      where.id = config.companyId;
    }
    
    if (config.batchName) {
      where.ycBatch = config.batchName;
    }
    
    // Only process companies without descriptions if not overwriting
    if (!config.overwriteExisting) {
      where.description = null;
    }
    
    // Setup for resume functionality
    let skipCount = 0;
    let resumeMode = false;
    
    if (config.startAfterCompanyId) {
      console.log(`Resuming after company ID: ${config.startAfterCompanyId}`);
      resumeMode = true;
    }
    
    // Get companies from the database
    const companies = await prisma.company.findMany({
      where,
      include: {
        evaluations: {
          select: { id: true }
        }
      },
      orderBy: {
        name: 'asc'
      },
      take: config.limit
    });
    
    console.log(`Found ${companies.length} companies to process.`);
    
    if (companies.length === 0) {
      console.log('No companies found matching the criteria. Check if:');
      console.log('1. You have companies in your database');
      console.log('2. Your filter criteria (if any) match existing companies');
      console.log('3. If not using --overwrite, all companies might already have descriptions');
      return;
    }
    
    // Save the last processed company ID to a file for potential resume
    const saveProgressToFile = (lastProcessedId: string) => {
      try {
        const progressData = {
          lastProcessedId,
          timestamp: new Date().toISOString(),
          config
        };
        fs.writeFileSync(
          path.join(__dirname, '../../../description-generator-progress.json'), 
          JSON.stringify(progressData, null, 2)
        );
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    };
    
    // Process each company
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const [index, company] of companies.entries()) {
      // Skip companies until we reach the one after startAfterCompanyId
      if (resumeMode && config.startAfterCompanyId) {
        if (company.id !== config.startAfterCompanyId) {
          skipCount++;
          continue;
        } else {
          console.log(`Found resume point after ${skipCount} companies. Continuing with next company...`);
          resumeMode = false;
          continue; // Skip the last processed company
        }
      }
      
      console.log(`\n[${index + 1 - skipCount}/${companies.length - skipCount}] Processing ${company.name}...`);
      
      // Skip companies that already have descriptions (unless overwriting)
      if (company.description && !config.overwriteExisting) {
        console.log(`⚠️ Skipping ${company.name}: Already has a description.`);
        skippedCount++;
        continue;
      }
      
      try {
        // Collect all evaluation notes (if any)
        const evaluationNotes = await collectCompanyEvaluationNotes(company.id);
        
        // Generate a description
        const description = await generateCompanyDescription(
          company, 
          evaluationNotes, 
          config.model || 'gpt-4o',
          config.mockLLM || false
        );
        
        // Update the company record
        await updateCompanyDescription(company.id, description, config.dryRun);
        processedCount++;
        
        // Save progress after each successful update
        saveProgressToFile(company.id);
        
        // Add delay between API calls to avoid rate limiting
        if (index < companies.length - 1) {
          const delayMs = config.delayMs || 2000;
          console.log(`Waiting ${delayMs}ms before next company...`);
          await setTimeout(delayMs);
        }
      } catch (error: any) {
        errorCount++;
        
        // Handle quota exceeded error specially
        if (error.message === 'QUOTA_EXCEEDED') {
          console.error('\n❌ API QUOTA EXCEEDED - STOPPING PROCESS');
          console.log(`\nTo resume later, run with: --start-after-company-id ${company.id}`);
          console.log('Progress has been saved to description-generator-progress.json');
          break;
        }
        
        console.error(`Error processing ${company.name}:`, error);
        console.log(`Continuing with next company...`);
      }
    }
    
    console.log('\n✅ Company description generation process completed!');
    console.log(`Summary: Processed ${processedCount}, Skipped ${skippedCount}, Errors ${errorCount}`);
  } catch (error) {
    console.error('Error in description generation process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Process command line arguments
const args = process.argv.slice(2);
const options: DescriptionGeneratorConfig = {
  delayMs: 2000,           // Default delay between API calls
  model: 'gpt-4o',         // Default model
  dryRun: false,           // Default to actually updating the database
  overwriteExisting: false, // Default to not overwriting existing descriptions
  mockLLM: false           // Default to using the real LLM API
};

// Check if there's a saved progress file to resume from
const progressFilePath = path.join(__dirname, '../../../description-generator-progress.json');
if (fs.existsSync(progressFilePath) && !args.includes('--ignore-saved-progress')) {
  try {
    const savedProgress = JSON.parse(fs.readFileSync(progressFilePath, 'utf8'));
    console.log(`Found saved progress from ${savedProgress.timestamp}`);
    console.log(`Last processed company ID: ${savedProgress.lastProcessedId}`);
    console.log('To resume from this point, add --start-after-company-id', savedProgress.lastProcessedId);
    console.log('To ignore this saved progress, add --ignore-saved-progress');
    console.log('');
  } catch (err) {
    console.error('Error reading saved progress file:', err);
  }
}

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--company-id' && i + 1 < args.length) {
    options.companyId = args[++i];
  } else if (arg === '--batch' && i + 1 < args.length) {
    options.batchName = args[++i];
  } else if (arg === '--limit' && i + 1 < args.length) {
    options.limit = parseInt(args[++i], 10);
  } else if (arg === '--delay' && i + 1 < args.length) {
    options.delayMs = parseInt(args[++i], 10);
  } else if (arg === '--model' && i + 1 < args.length) {
    options.model = args[++i];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--overwrite') {
    options.overwriteExisting = true;
  } else if (arg === '--start-after-company-id' && i + 1 < args.length) {
    options.startAfterCompanyId = args[++i];
  } else if (arg === '--mock-llm') {
    options.mockLLM = true;
  } else if (arg === '--help') {
    console.log(`
LLM Description Generator
-------------------------
Generates comprehensive descriptions for companies based on their evaluation notes.

Options:
  --company-id <id>            Process only the company with the specified ID
  --batch <name>               Process only companies from the specified YC batch
  --limit <number>             Limit the number of companies to process
  --delay <ms>                 Delay between API calls in milliseconds (default: 2000)
  --model <name>               OpenAI model to use (default: gpt-4o)
  --dry-run                    Run without updating the database
  --overwrite                  Overwrite existing descriptions
  --start-after-company-id <id> Resume processing after the specified company ID
  --mock-llm                   Use mock descriptions instead of calling the OpenAI API
  --ignore-saved-progress      Ignore any saved progress file
  --help                       Show this help message
    `);
    process.exit(0);
  }
}

// Run the script
console.log('LLM Description Generator');
console.log('-------------------------');
console.log('Configuration:', options);

generateAllCompanyDescriptions(options)
  .then(() => console.log('Script completed.'))
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  });
