import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import axios from 'axios';

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

// Evaluation categories with descriptions
const evaluationCategories = [
  { name: 'Problem', description: 'How significant is the problem being solved?' },
  { name: 'Solution', description: 'How effective is the proposed solution?' },
  { name: 'Team', description: 'How strong is the founding team?' },
  { name: 'Market', description: 'How large and attractive is the target market?' },
  { name: 'BusinessModel', description: 'How viable and scalable is the business model?' },
  { name: 'Traction', description: 'What progress has the company made so far?' },
  { name: 'Competition', description: 'How strong is the competitive landscape?' },
  { name: 'Differentiation', description: 'How well does the company differentiate from competitors?' },
  { name: 'InvestmentPotential', description: 'How attractive is this as an investment opportunity?' },
];

// Interface for evaluation results
interface EvaluationResult {
  score: number;
  notes: string;
}

interface CompanyEvaluation {
  problemScore: number;
  solutionScore: number;
  teamScore: number;
  marketScore: number;
  businessModelScore: number;
  tractionScore: number;
  competitionScore: number;
  differentiationScore: number;
  investmentPotentialScore: number;
  problemNotes: string;
  solutionNotes: string;
  teamNotes: string;
  marketNotes: string;
  businessModelNotes: string;
  tractionNotes: string;
  competitionNotes: string;
  differentiationNotes: string;
  investmentPotentialNotes: string;
  overallNotes: string;
}

/**
 * Gather information about a company using the OpenAI API and company website
 */
async function gatherCompanyInfo(company: any, model: string = 'gpt-4o'): Promise<string> {
  try {
    console.log(`Gathering information for ${company.name}...`);
    
    // Get founder LinkedIn profiles if available
    let founderInfo = '';
    if (company.founders && company.founders.length > 0) {
      founderInfo = company.founders
        .filter((founder: any) => founder.linkedIn)
        .map((founder: any) => `${founder.name} (${founder.role}): ${founder.linkedIn}`)
        .join('\n');
    }
    
    // Create search queries based on company information
    const searchQueries = [
      `${company.name} startup ${company.sectors.join(' ')}`,
      `${company.name} funding rounds investors`,
      `${company.name} ${company.oneLiner}`,
      `${company.name} competitors market analysis`,
      `${company.name} traction metrics growth`,
    ];
    
    let companyInfo = '';
    
    // Add founder LinkedIn information if available
    if (founderInfo) {
      companyInfo += `### Founder LinkedIn Profiles\n${founderInfo}\n\n`;
    }
    
    // Add company website as a research source if available
    if (company.website) {
      try {
        console.log(`Researching company website: ${company.website}`);
        
        // Use OpenAI to analyze the company website
        const websiteResponse = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a research analyst specializing in startups and venture capital. Extract key information from company websites."
            },
            {
              role: "user",
              content: `Please analyze the website ${company.website} for the company ${company.name}. \n\nExtract key information about their product, business model, team, market, and any metrics or traction they mention. If you can't access the specific content of the website, make that clear but provide your best analysis based on the URL structure and company name.`
            }
          ],
          temperature: 0.3,
        });
        
        const websiteContent = websiteResponse.choices[0]?.message?.content || '';
        companyInfo += `### Company Website Analysis (${company.website})\n${websiteContent}\n\n`;
        
        // Add delay between API calls to avoid rate limiting
        await setTimeout(2000);
      } catch (error) {
        console.error(`Error analyzing website for ${company.name}:`, error);
        companyInfo += `### Company Website Analysis (${company.website})\nError analyzing website: ${error}\n\n`;
      }
    }
    
    // Use OpenAI to gather information about the company
    for (const query of searchQueries) {
      console.log(`Researching: ${query}`);
      
      // Use a standard completion to gather information based on the query
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a research analyst specializing in startups and venture capital. Provide detailed, factual information about companies based on your knowledge."
          },
          {
            role: "user",
            content: `Please provide detailed information about: ${query}. \nInclude facts about funding, team, market, competitors, and business model if available.\nFocus on objective information rather than opinions.`
          }
        ],
        temperature: 0.3,
      });
      
      // Extract the research information
      const content = response.choices[0]?.message?.content || '';
      companyInfo += `### Research on: ${query}\n${content}\n\n`;
      
      // Add delay between API calls to avoid rate limiting
      await setTimeout(2000);
    }
    
    return companyInfo;
  } catch (error) {
    console.error(`Error gathering information for ${company.name}:`, error);
    return `Error gathering information: ${error}`;
  }
}

/**
 * Generate a prompt for the LLM to evaluate a company in a specific category
 */
function generateEvaluationPrompt(company: any, category: { name: string; description: string }, additionalInfo: string): string {
  return `
You are an expert startup evaluator with deep knowledge of the tech industry, venture capital, and startup ecosystems.

I need you to evaluate the company "${company.name}" (${company.website || 'no website'}) in the category of "${category.name}" (${category.description}).

Company Information from Database:
- Name: ${company.name}
- One-liner: ${company.oneLiner}
- Description: ${company.description || 'No detailed description available'}
- Business Model: ${company.businessModel || 'Not specified'}
- Founded: ${company.foundedDate ? new Date(company.foundedDate).getFullYear() : 'Unknown'}
- Sectors: ${company.sectors.join(', ')}
- Y Combinator Batch: ${company.ycBatch}

Additional Research Information:
${additionalInfo}

Based on all available information, provide:
1. A score from 1-10 for the ${category.name} category (where 1 is extremely poor and 10 is exceptional)
2. A concise explanation (ONE paragraph only) justifying your score

Your evaluation should be data-driven, objective, and consider both the company's strengths and weaknesses. Keep your explanation focused and to the point in a single paragraph.

Format your response exactly as follows:
SCORE: [Your numerical score from 1-10]
NOTES: [Your one-paragraph explanation]
`;
}

/**
 * Use OpenAI to evaluate a company in a specific category
 */
async function evaluateCompanyCategory(
  company: any,
  category: { name: string; description: string },
  additionalInfo: string,
  config: EvaluatorConfig
): Promise<EvaluationResult> {
  try {
    console.log(`Evaluating ${company.name} for ${category.name}...`);
    
    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert startup evaluator. Provide honest, data-driven assessments based on both provided information and your knowledge."
        },
        {
          role: "user",
          content: generateEvaluationPrompt(company, category, additionalInfo)
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract score and notes from the response
    const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
    const notesMatch = content.match(/NOTES:\s*([\s\S]+)/i);
    
    if (!scoreMatch || !notesMatch) {
      console.error(`Failed to parse evaluation for ${company.name} - ${category.name}`);
      return { score: 5, notes: "Error parsing evaluation response." };
    }
    
    const score = parseInt(scoreMatch[1], 10);
    const notes = notesMatch[1].trim();
    
    // Validate score is between 1-10
    const validatedScore = Math.min(Math.max(score, 1), 10);
    
    return { score: validatedScore, notes };
  } catch (error) {
    console.error(`Error evaluating ${company.name} for ${category.name}:`, error);
    return { score: 5, notes: `Evaluation failed: ${error}` };
  }
}

/**
 * Summarize existing evaluation notes to a single paragraph
 */
async function summarizeExistingEvaluation(existingEvaluation: any, category: { name: string; description: string }, model: string = 'gpt-4o'): Promise<EvaluationResult> {
  // Get the field name for the notes based on the category
  const notesField = `${category.name.charAt(0).toLowerCase() + category.name.slice(1)}Notes` as keyof typeof existingEvaluation;
  const scoreField = `${category.name.charAt(0).toLowerCase() + category.name.slice(1)}Score` as keyof typeof existingEvaluation;
  
  // Get the existing notes and score
  const existingNotes = existingEvaluation[notesField] as string | null;
  const existingScore = existingEvaluation[scoreField] as number | null;
  
  // If there are no existing notes or score, return default values
  if (!existingNotes || !existingScore) {
    return { score: existingScore || 5, notes: existingNotes || 'No existing evaluation notes found.' };
  }
  
  try {
    console.log(`Summarizing existing ${category.name} evaluation for company...`);
    
    // Use OpenAI to summarize the existing notes to a single paragraph
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert at summarizing and condensing text while preserving key information."
        },
        {
          role: "user",
          content: `Please summarize the following evaluation notes into a single, concise paragraph. Maintain the key points and insights but make it more focused and to the point:\n\n${existingNotes}`
        }
      ],
      temperature: 0.3,
    });
    
    // Extract the summarized notes
    const summarizedNotes = response.choices[0]?.message?.content?.trim() || existingNotes;
    
    return { score: existingScore, notes: summarizedNotes };
  } catch (error) {
    console.error(`Error summarizing evaluation for ${category.name}:`, error);
    return { score: existingScore, notes: existingNotes }; // Return original notes if summarization fails
  }
}

/**
 * Generate a comprehensive evaluation for a company across all categories
 */
async function generateCompanyEvaluation(company: any, config: EvaluatorConfig): Promise<CompanyEvaluation> {
  const evaluation: Partial<CompanyEvaluation> = {};
  const allNotes: string[] = [];
  let totalScore = 0;
  
  // Use existing evaluation from config if provided, otherwise fetch it
  const existingEvaluation = config.existingEvaluation || await prisma.evaluation.findFirst({
    where: { companyId: company.id }
  });
  
  // Determine if we should do research or summarize existing notes
  let companyInfo = '';
  const hasExistingEvaluation = !!existingEvaluation;
  const shouldSummarize = hasExistingEvaluation && config.shouldSummarizeNotes;
  
  if (shouldSummarize) {
    console.log(`Company ${company.name} already has evaluation notes. Will summarize existing notes instead of conducting new research.`);
  } else if (!config.skipResearch) {
    console.log(`\nGathering detailed information for ${company.name}...`);
    companyInfo = await gatherCompanyInfo(company, config.model || 'gpt-4o');
    console.log(`Completed research for ${company.name}. Proceeding with evaluation...`);
  } else {
    console.log(`Skipping research for ${company.name} as requested.`);
    companyInfo = 'Additional research was skipped. Using only provided company information.';
  }
  
  // Evaluate each category
  for (const category of evaluationCategories) {
    // Add delay to avoid rate limiting
    await setTimeout(config.delayMs || 2000);
    
    let result: EvaluationResult;
    
    if (shouldSummarize) {
      // Summarize existing evaluation notes for this category
      result = await summarizeExistingEvaluation(existingEvaluation, category, config.model || 'gpt-4o');
      console.log(`Summarized existing ${category.name} evaluation for ${company.name}.`);
    } else {
      // Generate new evaluation for this category
      result = await evaluateCompanyCategory(company, category, companyInfo, config);
    }
    
    // Map category to the corresponding field names in the database
    const scoreField = `${category.name.charAt(0).toLowerCase() + category.name.slice(1)}Score` as keyof CompanyEvaluation;
    const notesField = `${category.name.charAt(0).toLowerCase() + category.name.slice(1)}Notes` as keyof CompanyEvaluation;
    
    // @ts-ignore - Dynamic property assignment
    evaluation[scoreField] = result.score;
    // @ts-ignore - Dynamic property assignment
    evaluation[notesField] = result.notes;
    
    totalScore += result.score;
    allNotes.push(`${category.name} (${result.score}/10): ${result.notes.substring(0, 100)}...`);
    
    console.log(`✓ Completed ${category.name} evaluation for ${company.name} with score: ${result.score}/10`);
  }
  
  // Calculate average score and create overall notes
  const averageScore = Math.round(totalScore / evaluationCategories.length);
  
  // Create a concise overall summary
  const overallNotes = `
${company.name} received an overall evaluation score of ${averageScore}/10.

This evaluation was ${shouldSummarize ? 'summarized from existing notes' : 'newly generated'} on ${new Date().toISOString().split('T')[0]} using AI analysis.

Evaluation summary (scores out of 10):
- Problem: ${evaluation.problemScore}/10
- Solution: ${evaluation.solutionScore}/10
- Team: ${evaluation.teamScore}/10
- Market: ${evaluation.marketScore}/10
- Business Model: ${evaluation.businessModelScore}/10
- Traction: ${evaluation.tractionScore}/10
- Competition: ${evaluation.competitionScore}/10
- Differentiation: ${evaluation.differentiationScore}/10
- Investment Potential: ${evaluation.investmentPotentialScore}/10
`;

  return {
    ...evaluation as CompanyEvaluation,
    overallNotes,
  };
}

/**
 * Main function to evaluate all companies and update the database
 */
async function evaluateAllCompanies(config: EvaluatorConfig = {}) {
  try {
    let companies;
    
    // Determine which companies to evaluate based on config
    const where: any = {};
    
    if (config.companyId) {
      // Evaluate a specific company by ID
      where.id = config.companyId;
    }
    
    if (config.batchName) {
      // Filter by YC batch
      where.ycBatch = {
        contains: config.batchName,
        mode: 'insensitive' // Case-insensitive search
      };
    }
    
    // Build the query
    const query: any = { where };
    
    if (config.limit) {
      query.take = config.limit;
    }
    
    // Get companies based on filters
    companies = await prisma.company.findMany(query);
    
    if (companies.length === 0) {
      if (config.companyId) {
        throw new Error(`Company with ID ${config.companyId} not found`);
      } else if (config.batchName) {
        throw new Error(`No companies found in batch ${config.batchName}`);
      } else {
        throw new Error('No companies found in the database');
      }
    }
    
    console.log(`Found ${companies.length} companies. Starting LLM evaluations...`);
    console.log(`Using OpenAI model: ${config.model}${config.skipResearch ? ' without' : ' with'} additional company research`);
    
    if (config.dryRun) {
      console.log('⚠️ DRY RUN MODE: No database changes will be made');
    }
    
    // Track statistics
    const stats = {
      total: companies.length,
      completed: 0,
      updated: 0,
      created: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
    };
    
    // Process each company
    for (const company of companies) {
      console.log(`\n========================================`);
      console.log(`Evaluating company ${stats.completed + 1}/${stats.total}: ${company.name}`);
      console.log(`========================================`);
      
      try {
        // Check if the company already has an evaluation
        const existingEvaluation = await prisma.evaluation.findFirst({
          where: { companyId: company.id }
        });
        
        // For the first 10 companies, skip completely if they have existing evaluations
        if (stats.completed < 10 && existingEvaluation) {
          console.log(`Skipping company ${company.name} (${stats.completed + 1}/10) to preserve existing evaluation notes.`);
          stats.completed++;
          stats.skipped++;
          
          // Wait before processing the next company
          if (stats.completed < stats.total) {
            console.log(`Waiting ${Math.floor(config.delayMs! / 1000)} seconds before processing next company...`);
            await setTimeout(config.delayMs || 2000);
          }
          
          continue; // Skip to the next company
        }
        
        // For all other companies, generate new evaluations regardless of existing notes
        const evaluationConfig = {
          ...config,
          shouldSummarizeNotes: false, // Never summarize, always generate new evaluations
          existingEvaluation
        };
        
        // Generate evaluation
        const evaluation = await generateCompanyEvaluation(company, evaluationConfig);
        
        const evaluationDate = new Date();
        
        if (!config.dryRun) {
          if (existingEvaluation) {
            // Update existing evaluation
            await prisma.evaluation.update({
              where: { id: existingEvaluation.id },
              data: {
                evaluationDate,
                evaluator: 'LLM-Evaluator',
                ...evaluation
              }
            });
            console.log(`✓ Updated evaluation for ${company.name}`);
            stats.updated++;
          } else {
            // Create new evaluation
            await prisma.evaluation.create({
              data: {
                companyId: company.id,
                evaluationDate,
                evaluator: 'LLM-Evaluator',
                ...evaluation
              }
            });
            console.log(`✓ Created evaluation for ${company.name}`);
            stats.created++;
          }
          
          // Create update log entry
          await prisma.updateLog.create({
            data: {
              companyId: company.id,
              fieldName: 'evaluation',
              newValue: `LLM Evaluation completed with overall scores`,
              source: 'LLM-Evaluator',
            }
          });
        } else {
          // In dry run mode, just log what would happen
          if (existingEvaluation) {
            console.log(`[DRY RUN] Would update evaluation for ${company.name}`);
            stats.updated++;
          } else {
            console.log(`[DRY RUN] Would create evaluation for ${company.name}`);
            stats.created++;
          }
          console.log(`[DRY RUN] Would create update log entry`);
        }
        
        stats.completed++;
      } catch (error) {
        console.error(`Error evaluating ${company.name}:`, error);
        stats.failed++;
      }
      
      // Add a delay between companies to avoid rate limiting
      if (stats.completed < stats.total) {
        const betweenCompanyDelay = config.delayMs ? config.delayMs * 5 : 10000;
        console.log(`Waiting ${betweenCompanyDelay/1000} seconds before processing next company...`);
        await setTimeout(betweenCompanyDelay);
      }
    }
    
    // Display final statistics
    const endTime = new Date();
    const duration = (endTime.getTime() - stats.startTime.getTime()) / 1000;
    
    console.log(`\n========================================`);
    console.log(`Evaluation completed in ${Math.floor(duration / 60)} minutes and ${Math.floor(duration % 60)} seconds`);
    console.log(`Total companies processed: ${stats.completed}/${stats.total}`);
    console.log(`Evaluations created: ${stats.created}`);
    console.log(`Evaluations updated: ${stats.updated}`);
    console.log(`Companies skipped: ${stats.skipped}`);
    console.log(`Failed evaluations: ${stats.failed}`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error('Error in evaluation process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Configuration interface
interface EvaluatorConfig {
  limit?: number;           // Limit number of companies to evaluate
  companyId?: string;       // Evaluate a specific company by ID
  batchName?: string;       // Filter companies by YC batch name
  skipResearch?: boolean;   // Skip additional research (faster but less accurate)
  delayMs?: number;         // Delay between API calls in milliseconds
  model?: string;           // OpenAI model to use
  dryRun?: boolean;         // Don't save to database, just show what would happen
  shouldSummarizeNotes?: boolean; // Whether to summarize existing notes or run new research
  existingEvaluation?: any;       // Existing evaluation data if available
}

// Process command line arguments
const args = process.argv.slice(2);
const options: EvaluatorConfig = {
  delayMs: 2000,           // Default delay between API calls
  model: "gpt-4o",         // Default model
  skipResearch: false,     // Default to using additional research
  dryRun: false            // Default to saving results
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && i + 1 < args.length) {
    options.limit = parseInt(args[i + 1], 10);
    i++; // Skip the next argument
  } else if (args[i] === '--company-id' && i + 1 < args.length) {
    options.companyId = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === '--batch' && i + 1 < args.length) {
    options.batchName = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === '--skip-research') {
    options.skipResearch = true;
  } else if (args[i] === '--delay' && i + 1 < args.length) {
    options.delayMs = parseInt(args[i + 1], 10);
    i++; // Skip the next argument
  } else if (args[i] === '--model' && i + 1 < args.length) {
    options.model = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--help') {
    console.log(`
YC Company LLM Evaluator - Help
`);
    console.log(`Available options:`);
    console.log(`  --limit <number>       Limit the number of companies to evaluate`);
    console.log(`  --company-id <id>      Evaluate a specific company by ID`);
    console.log(`  --batch <name>         Filter companies by YC batch name`);
    console.log(`  --skip-research        Skip additional research (faster but less accurate)`);
    console.log(`  --delay <ms>           Set delay between API calls in milliseconds (default: 2000)`);
    console.log(`  --model <model>        OpenAI model to use (default: gpt-4o)`);
    console.log(`  --dry-run              Don't save to database, just show what would happen`);
    console.log(`  --help                 Show this help message`);
    console.log(`
Examples:`);
    console.log(`  npx ts-node src/scripts/llm-company-evaluator.ts --limit 3`);
    console.log(`  npx ts-node src/scripts/llm-company-evaluator.ts --batch "W22"`);
    console.log(`  npx ts-node src/scripts/llm-company-evaluator.ts --skip-research --dry-run`);
    process.exit(0);
  }
}

// Check if OpenAI API key is configured
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY is not set in the environment variables');
  console.error('Please add OPENAI_API_KEY to your .env file');
  process.exit(1);
}

// Display startup information
console.log('========================================');
console.log('YC Company LLM Evaluator');
console.log('========================================');
console.log(`This script uses OpenAI's ${options.model} model to evaluate companies${options.skipResearch ? ' without' : ' with'} additional research`);
console.log('to generate comprehensive evaluations for YC companies.');
console.log('\nConfiguration:');
if (options.limit) {
  console.log(`- Processing limited to ${options.limit} companies`);
} 
if (options.companyId) {
  console.log(`- Processing only company with ID: ${options.companyId}`);
} 
if (options.batchName) {
  console.log(`- Filtering companies by batch: ${options.batchName}`);
}
if (!options.companyId && !options.limit && !options.batchName) {
  console.log('- Processing all companies in the database');
}
console.log(`- Delay between API calls: ${options.delayMs}ms`);
console.log(`- Using model: ${options.model}`);
if (options.dryRun) {
  console.log('- DRY RUN MODE: No database changes will be made');
}
console.log('========================================\n');

// Run the evaluation process
evaluateAllCompanies(options)
  .then(() => console.log('Script completed successfully.'))
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  });
