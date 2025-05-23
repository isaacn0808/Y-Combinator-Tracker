import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router({ mergeParams: true }); // To access :companyId

// --- Evaluation Routes ---

// POST /api/companies/:companyId/evaluations - Create a new evaluation
router.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  const { 
    evaluationDate, evaluator, overallNotes, 
    problemScore, solutionScore, teamScore, marketScore, 
    businessModelScore, tractionScore, competitionScore, 
    differentiationScore, investmentPotentialScore,
    problemNotes, solutionNotes, teamNotes, marketNotes,
    businessModelNotes, tractionNotes, competitionNotes,
    differentiationNotes, investmentPotentialNotes
  } = req.body;

  if (!evaluationDate) {
    return res.status(400).json({ error: 'Evaluation date is required' });
  }

  // Basic validation for scores (e.g., ensure they are numbers if provided)
  const scoresToValidate = {
    problemScore, solutionScore, teamScore, marketScore,
    businessModelScore, tractionScore, competitionScore,
    differentiationScore, investmentPotentialScore
  };
  let validationError = false;
  (Object.keys(scoresToValidate) as Array<keyof typeof scoresToValidate>).forEach(key => {
    const value = scoresToValidate[key];
    if (value !== undefined && value !== null && (typeof value !== 'number' || value < 1 || value > 10)) {
      res.status(400).json({ error: `Score for ${key} must be a number between 1 and 10.` });
      validationError = true;
    }
  });
  if (validationError) return;

  try {
    const newEvaluation = await prisma.evaluation.create({
      data: {
        companyId,
        evaluationDate: new Date(evaluationDate),
        evaluator,
        overallNotes,
        problemScore,
        solutionScore,
        teamScore,
        marketScore,
        businessModelScore,
        tractionScore,
        competitionScore,
        differentiationScore,
        investmentPotentialScore,
        problemNotes,
        solutionNotes,
        teamNotes,
        marketNotes,
        businessModelNotes,
        tractionNotes,
        competitionNotes,
        differentiationNotes,
        investmentPotentialNotes,
      },
    });
    res.status(201).json(newEvaluation);
  } catch (error) {
    console.error(`Error creating evaluation for company ${companyId}:`, error);
    if ((error as any).code === 'P2003') { // Foreign key constraint failed
        return res.status(404).json({ error: `Company with ID ${companyId} not found.` });
    }
    res.status(500).json({ error: 'Failed to create evaluation' });
  }
}) as RequestHandler);

// GET /api/companies/:companyId/evaluations - Get all evaluations for a company
router.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { companyId },
      orderBy: {
        evaluationDate: 'desc',
      },
    });
    res.json(evaluations);
  } catch (error) {
    console.error(`Error fetching evaluations for company ${companyId}:`, error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
}) as RequestHandler);

// GET /api/evaluations/:evaluationId - Get a single evaluation by ID
router.get('/:evaluationId', (async (req: Request, res: Response, next: NextFunction) => {
  const { evaluationId } = req.params;
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
    });
    if (evaluation) {
      res.json(evaluation);
    } else {
      res.status(404).json({ error: 'Evaluation not found' });
    }
  } catch (error) {
    console.error(`Error fetching evaluation ${evaluationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
}) as RequestHandler);

// PUT /api/evaluations/:evaluationId - Update an existing evaluation
router.put('/:evaluationId', (async (req: Request, res: Response, next: NextFunction) => {
  const { evaluationId } = req.params;
  const { 
    evaluationDate, evaluator, overallNotes, 
    problemScore, solutionScore, teamScore, marketScore, 
    businessModelScore, tractionScore, competitionScore, 
    differentiationScore, investmentPotentialScore,
    problemNotes, solutionNotes, teamNotes, marketNotes,
    businessModelNotes, tractionNotes, competitionNotes,
    differentiationNotes, investmentPotentialNotes
  } = req.body;

  // Basic validation for scores
  const scoresToValidate = {
    problemScore, solutionScore, teamScore, marketScore,
    businessModelScore, tractionScore, competitionScore,
    differentiationScore, investmentPotentialScore
  };
  let validationError = false;
  (Object.keys(scoresToValidate) as Array<keyof typeof scoresToValidate>).forEach(key => {
    const value = scoresToValidate[key];
    // Only validate if the score is provided (not undefined)
    if (value !== undefined && value !== null && (typeof value !== 'number' || value < 1 || value > 10)) {
      res.status(400).json({ error: `Score for ${key} must be a number between 1 and 10 if provided.` });
      validationError = true;
    }
  });
  if (validationError) return;
  
  try {
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        evaluationDate: evaluationDate ? new Date(evaluationDate) : undefined,
        evaluator,
        overallNotes,
        problemScore,
        solutionScore,
        teamScore,
        marketScore,
        businessModelScore,
        tractionScore,
        competitionScore,
        differentiationScore,
        investmentPotentialScore,
        problemNotes,
        solutionNotes,
        teamNotes,
        marketNotes,
        businessModelNotes,
        tractionNotes,
        competitionNotes,
        differentiationNotes,
        investmentPotentialNotes,
      },
    });
    res.json(updatedEvaluation);
  } catch (error) {
    console.error(`Error updating evaluation ${evaluationId}:`, error);
    if ((error as any).code === 'P2025') { // Record to update not found
        return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.status(500).json({ error: 'Failed to update evaluation' });
  }
}) as RequestHandler);

// DELETE /api/evaluations/:evaluationId - Delete an evaluation
router.delete('/:evaluationId', (async (req: Request, res: Response, next: NextFunction) => {
  const { evaluationId } = req.params;
  try {
    await prisma.evaluation.delete({
      where: { id: evaluationId },
    });
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting evaluation ${evaluationId}:`, error);
    if ((error as any).code === 'P2025') { // Record to delete not found
        return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
}) as RequestHandler);

export default router;
