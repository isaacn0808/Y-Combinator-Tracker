import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient

// Import the generated types from Prisma
type CompanyStatus = 'WATCHING' | 'ENGAGED' | 'INVESTED' | 'PASSED' | 'NEW' | 'ACTIVE' | 'ACQUIRED' | 'INACTIVE' | 'CLOSED' | 'STEALTH' | 'UNKNOWN';
type PrismaEvaluation = {
  id: string;
  companyId: string;
  evaluationDate: Date;
  evaluator?: string | null;
  overallNotes?: string | null;
  problemNotes?: string | null;
  solutionNotes?: string | null;
  teamNotes?: string | null;
  marketNotes?: string | null;
  businessModelNotes?: string | null;
  tractionNotes?: string | null;
  competitionNotes?: string | null;
  differentiationNotes?: string | null;
  investmentPotentialNotes?: string | null;
  problemScore?: number | null;
  solutionScore?: number | null;
  teamScore?: number | null;
  marketScore?: number | null;
  businessModelScore?: number | null;
  tractionScore?: number | null;
  competitionScore?: number | null;
  differentiationScore?: number | null;
  investmentPotentialScore?: number | null;
};

// Define the structure expected by the frontend for evaluation scores
interface FrontendEvaluationScores {
  problem?: number;
  solution?: number;
  team?: number;
  market?: number;
  businessModel?: number;
  traction?: number;
  competition?: number;
  differentiation?: number;
  investmentPotential?: number;
}

// Define the structure expected by the frontend for evaluation notes
interface FrontendEvaluationNotes {
  problem?: string;
  solution?: string;
  team?: string;
  market?: string;
  businessModel?: string;
  traction?: string;
  competition?: string;
  differentiation?: string;
  investmentPotential?: string;
  general?: string; // For overall notes
}

// Helper function to transform a single Prisma Evaluation model to frontend EvaluationScores
const transformEvaluationToScores = (evaluation?: PrismaEvaluation): Partial<FrontendEvaluationScores> | undefined => {
  if (!evaluation) {
    return undefined;
  }
  // Ensure that we only include scores that are not null
  const scores: Partial<FrontendEvaluationScores> = {};
  if (evaluation.problemScore !== null && evaluation.problemScore !== undefined) scores.problem = evaluation.problemScore;
  if (evaluation.solutionScore !== null && evaluation.solutionScore !== undefined) scores.solution = evaluation.solutionScore;
  if (evaluation.teamScore !== null && evaluation.teamScore !== undefined) scores.team = evaluation.teamScore;
  if (evaluation.marketScore !== null && evaluation.marketScore !== undefined) scores.market = evaluation.marketScore;
  if (evaluation.businessModelScore !== null && evaluation.businessModelScore !== undefined) scores.businessModel = evaluation.businessModelScore;
  if (evaluation.tractionScore !== null && evaluation.tractionScore !== undefined) scores.traction = evaluation.tractionScore;
  if (evaluation.competitionScore !== null && evaluation.competitionScore !== undefined) scores.competition = evaluation.competitionScore;
  if (evaluation.differentiationScore !== null && evaluation.differentiationScore !== undefined) scores.differentiation = evaluation.differentiationScore;
  if (evaluation.investmentPotentialScore !== null && evaluation.investmentPotentialScore !== undefined) scores.investmentPotential = evaluation.investmentPotentialScore;
  
  return Object.keys(scores).length > 0 ? scores : undefined;
};

// Helper function to transform a single Prisma Evaluation model to frontend EvaluationNotes
const transformEvaluationToNotes = (evaluation?: PrismaEvaluation): Partial<FrontendEvaluationNotes> | undefined => {
  if (!evaluation) {
    return undefined;
  }
  // Ensure that we only include notes that are not null
  const notes: Partial<FrontendEvaluationNotes> = {};
  if (evaluation.problemNotes) notes.problem = evaluation.problemNotes;
  if (evaluation.solutionNotes) notes.solution = evaluation.solutionNotes;
  if (evaluation.teamNotes) notes.team = evaluation.teamNotes;
  if (evaluation.marketNotes) notes.market = evaluation.marketNotes;
  if (evaluation.businessModelNotes) notes.businessModel = evaluation.businessModelNotes;
  if (evaluation.tractionNotes) notes.traction = evaluation.tractionNotes;
  if (evaluation.competitionNotes) notes.competition = evaluation.competitionNotes;
  if (evaluation.differentiationNotes) notes.differentiation = evaluation.differentiationNotes;
  if (evaluation.investmentPotentialNotes) notes.investmentPotential = evaluation.investmentPotentialNotes;
  if (evaluation.overallNotes) notes.general = evaluation.overallNotes;
  
  return Object.keys(notes).length > 0 ? notes : undefined;
};

const prisma = new PrismaClient();
const router = Router();

// --- Company Routes ---

// GET /api/companies - Get all companies
router.get('/', async (req: Request, res: Response) => {
  // Include founder data in the query
  try {
    const companiesFromDb = await prisma.company.findMany({
      include: {
        founders: true, // Include founder data
        evaluations: {
          orderBy: {
            evaluationDate: 'desc',
          },
          take: 1, // Only take the most recent evaluation
        },
        metrics: {
          orderBy: {
            dateRecorded: 'desc'
          },
          take: 5 // Get the most recent metrics
        }
      },
      orderBy: {
        name: 'asc', // Order by name alphabetically
      },
    });

    const companiesWithScores = companiesFromDb.map((company: any) => {
      const latestEvaluation = company.evaluations?.[0];
      const evaluationScores = transformEvaluationToScores(latestEvaluation);
      const evaluationNotes = transformEvaluationToNotes(latestEvaluation);
      
      // Extract metrics data
      const metrics = company.metrics || [];
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { evaluations, ...companyData } = company; 
      
      // Create a complete company object with all snapshot fields
      // Even if they're null/undefined, we want to include them in the response
      return {
        ...companyData,
        evaluationScores,
        evaluationNotes,
        // Ensure snapshot fields are explicitly included
        metrics_userCount: companyData.metrics_userCount,
        metrics_growthRate: companyData.metrics_growthRate,
        metrics_burnRate: companyData.metrics_burnRate,
        metrics_revenue: companyData.metrics_revenue,
        funding_stage: companyData.funding_stage,
        funding_raised: companyData.funding_raised,
        funding_valuation: companyData.funding_valuation,
        funding_runway: companyData.funding_runway,
        // Include the most recent metrics as well
        recentMetrics: metrics
      };
    });

    res.json(companiesWithScores);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id - Get a single company by ID
router.get('/:id', async (req: Request, res: Response) => {
  // Include founder data in the query
  const { id } = req.params;
  try {
    const companyFromDb = await prisma.company.findUnique({
      where: { id },
      include: { 
        founders: true, // Include founder data
        metrics: {
          orderBy: {
            dateRecorded: 'desc'
          },
          take: 10 // Get the most recent metrics
        },
        interactions: {
          orderBy: {
            date: 'desc'
          }
        },
        evaluations: {
          orderBy: {
            evaluationDate: 'desc',
          },
          take: 1, // Only take the most recent evaluation
        },
        updateLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 20 // Get the most recent update logs
        },
      },
    });

    if (companyFromDb) {
      const latestEvaluation = companyFromDb.evaluations?.[0];
      const evaluationScores = transformEvaluationToScores(latestEvaluation);
      const evaluationNotes = transformEvaluationToNotes(latestEvaluation);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { evaluations, ...companyData } = companyFromDb;
      
      // Create a complete company object with all snapshot fields explicitly included
      const companyResult = {
        ...companyData,
        evaluationScores,
        evaluationNotes,
        // Ensure snapshot fields are explicitly included
        metrics_userCount: companyData.metrics_userCount,
        metrics_growthRate: companyData.metrics_growthRate,
        metrics_burnRate: companyData.metrics_burnRate,
        metrics_revenue: companyData.metrics_revenue,
        funding_stage: companyData.funding_stage,
        funding_raised: companyData.funding_raised,
        funding_valuation: companyData.funding_valuation,
        funding_runway: companyData.funding_runway,
      };
      res.json(companyResult);
    } else {
      res.status(404).json({ error: 'Company not found' });
    }
  } catch (error) {
    console.error(`Error fetching company ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// POST /api/companies - Create a new company
router.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const {
    name, website, ycBatch, description, sectors, oneLiner, businessModel,
    status, foundedDate, notes, logo, productStatus, developmentStage,
    metWith, lastMeetingDate
  } = req.body;
  
  // Basic validation (you can add more robust validation later)
  if (!name || !website || !ycBatch || !description || !sectors || !Array.isArray(sectors) || sectors.length === 0 || !oneLiner || !businessModel || !foundedDate) {
    return res.status(400).json({ error: 'Missing required company fields: name, website, ycBatch, description, sectors (array), oneLiner, businessModel, foundedDate are all required.' });
  }

  if (foundedDate && isNaN(new Date(foundedDate).getTime())) {
    return res.status(400).json({ error: 'Invalid foundedDate format.' });
  }

  try {
    const newCompany = await prisma.company.create({
      data: {
        name,
        website,
        ycBatch,
        description,
        sectors, // Updated from sector to sectors (string array)
        oneLiner,
        businessModel,
        logo,
        productStatus,
        developmentStage,
        metWith,
        lastMeetingDate: lastMeetingDate ? new Date(lastMeetingDate) : undefined, // Optional
        status: status as CompanyStatus, // Ensure status matches the enum
        foundedDate: new Date(foundedDate), // Now required, assumes foundedDate is a valid date string from req.body
        notes,
      },
    });
    res.status(201).json(newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    // Check for unique constraint violation (e.g., if company name already exists)
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('name')) {
      res.status(409).json({ error: 'A company with this name already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
}) as RequestHandler);

// PUT /api/companies/:id - Update an existing company
router.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    name, website, ycBatch, description, sectors, oneLiner, businessModel,
    status, foundedDate, notes, logo, productStatus, developmentStage,
    metWith, lastMeetingDate,
    // Key metrics fields
    metrics_userCount, metrics_growthRate, metrics_burnRate, metrics_revenue,
    // Funding information fields
    funding_stage, funding_raised, funding_valuation, funding_runway
  } = req.body;

  try {
    // Create an update log if any metrics or funding fields are updated
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      select: {
        metrics_userCount: true,
        metrics_growthRate: true,
        metrics_burnRate: true,
        metrics_revenue: true,
        funding_stage: true,
        funding_raised: true,
        funding_valuation: true,
        funding_runway: true
      }
    });

    const changes = [];
    
    // Check for metrics changes
    if (existingCompany) {
      if (metrics_userCount !== undefined && metrics_userCount !== existingCompany.metrics_userCount) {
        changes.push({
          field: 'Users',
          oldValue: existingCompany.metrics_userCount || 'Not set',
          newValue: metrics_userCount
        });
      }
      if (metrics_growthRate !== undefined && metrics_growthRate !== existingCompany.metrics_growthRate) {
        changes.push({
          field: 'Growth Rate',
          oldValue: existingCompany.metrics_growthRate || 'Not set',
          newValue: metrics_growthRate
        });
      }
      if (metrics_burnRate !== undefined && metrics_burnRate !== existingCompany.metrics_burnRate) {
        changes.push({
          field: 'Burn Rate',
          oldValue: existingCompany.metrics_burnRate || 'Not set',
          newValue: metrics_burnRate
        });
      }
      if (metrics_revenue !== undefined && metrics_revenue !== existingCompany.metrics_revenue) {
        changes.push({
          field: 'Revenue',
          oldValue: existingCompany.metrics_revenue || 'Not set',
          newValue: metrics_revenue
        });
      }
      
      // Check for funding changes
      if (funding_stage !== undefined && funding_stage !== existingCompany.funding_stage) {
        changes.push({
          field: 'Funding Stage',
          oldValue: existingCompany.funding_stage || 'Not set',
          newValue: funding_stage
        });
      }
      if (funding_raised !== undefined && funding_raised !== existingCompany.funding_raised) {
        changes.push({
          field: 'Total Raised',
          oldValue: existingCompany.funding_raised || 'Not set',
          newValue: funding_raised
        });
      }
      if (funding_valuation !== undefined && funding_valuation !== existingCompany.funding_valuation) {
        changes.push({
          field: 'Valuation',
          oldValue: existingCompany.funding_valuation || 'Not set',
          newValue: funding_valuation
        });
      }
      if (funding_runway !== undefined && funding_runway !== existingCompany.funding_runway) {
        changes.push({
          field: 'Runway',
          oldValue: existingCompany.funding_runway || 'Not set',
          newValue: funding_runway
        });
      }
    }

    // Create update log if there are changes
    if (changes.length > 0) {
      // Create individual update log entries for each change
      for (const change of changes) {
        await prisma.updateLog.create({
          data: {
            companyId: id,
            fieldName: change.field,
            oldValue: change.oldValue?.toString() || null,
            newValue: change.newValue?.toString() || null,
            source: 'Manual Edit',
            timestamp: new Date()
          }
        });
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name,
        website,
        ycBatch,
        description,
        sectors, // Updated from sector to sectors (string array)
        oneLiner,
        businessModel,
        logo,
        productStatus,
        developmentStage,
        metWith,
        lastMeetingDate: lastMeetingDate ? new Date(lastMeetingDate) : undefined,
        status: status as CompanyStatus,
        foundedDate: foundedDate ? new Date(foundedDate) : undefined, // use undefined to not update if not provided
        notes,
        // Add metrics fields
        metrics_userCount,
        metrics_growthRate,
        metrics_burnRate,
        metrics_revenue,
        // Add funding fields
        funding_stage,
        funding_raised,
        funding_valuation,
        funding_runway
      },
    });
    res.json(updatedCompany);
  } catch (error) {
    console.error(`Error updating company ${id}:`, error);
    if ((error as any).code === 'P2025') { // Record to update not found
        return res.status(404).json({ error: 'Company not found' });
    }
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('name')) {
        res.status(409).json({ error: 'Another company with this name already exists.' });
        return;
    }
    res.status(500).json({ error: 'Failed to update company' });
  }
}) as RequestHandler);

// DELETE /api/companies/:id - Delete a company
router.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await prisma.company.delete({
      where: { id },
    });
    res.status(204).send(); // No content to send back
  } catch (error) {
    console.error(`Error deleting company ${id}:`, error);
     if ((error as any).code === 'P2025') { // Record to delete not found
        return res.status(404).json({ error: 'Company not found' });
    }
    res.status(500).json({ error: 'Failed to delete company' });
  }
}) as RequestHandler);

export default router;
