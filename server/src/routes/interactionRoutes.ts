import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, InteractionType } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router({ mergeParams: true }); // mergeParams allows access to :companyId from parent router

// --- Interaction Routes ---

// POST /api/companies/:companyId/interactions - Create a new interaction
router.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  const { type, date, summary, notes, participants, followUpNeeded } = req.body;

  if (!type || !date || !summary) {
    return res.status(400).json({ error: 'Interaction type, date, and summary are required' });
  }

  try {
    const newInteraction = await prisma.interaction.create({
      data: {
        companyId,
        type: type as InteractionType,
        date: new Date(date),
        summary,
        notes,
        participants: participants || [], // Default to empty array if not provided
        followUpNeeded: followUpNeeded !== undefined ? Boolean(followUpNeeded) : false, // Default to false
      },
    });
    res.status(201).json(newInteraction);
  } catch (error) {
    console.error(`Error creating interaction for company ${companyId}:`, error);
    if ((error as any).code === 'P2003') { // Foreign key constraint failed (e.g., companyId not found)
        return res.status(404).json({ error: `Company with ID ${companyId} not found or invalid interaction type.` });
    }
    res.status(500).json({ error: 'Failed to create interaction' });
  }
}) as RequestHandler);

// GET /api/companies/:companyId/interactions - Get all interactions for a company
router.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  try {
    const interactions = await prisma.interaction.findMany({
      where: { companyId },
      orderBy: {
        date: 'desc', // Show most recent interactions first
      },
    });
    res.json(interactions);
  } catch (error) {
    console.error(`Error fetching interactions for company ${companyId}:`, error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
}) as RequestHandler);

// GET /api/interactions/:interactionId - Get a single interaction by ID
router.get('/:interactionId', (async (req: Request, res: Response, next: NextFunction) => {
  const { interactionId } = req.params;
  // Note: If this route is mounted under /api/companies/:companyId/interactions/:interactionId,
  // companyId will also be in req.params. Here we assume it's mounted under /api/interactions/:interactionId for direct access.
  try {
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId },
    });
    if (interaction) {
      res.json(interaction);
    } else {
      res.status(404).json({ error: 'Interaction not found' });
    }
  } catch (error) {
    console.error(`Error fetching interaction ${interactionId}:`, error);
    res.status(500).json({ error: 'Failed to fetch interaction' });
  }
}) as RequestHandler);

// PUT /api/interactions/:interactionId - Update an existing interaction
router.put('/:interactionId', (async (req: Request, res: Response, next: NextFunction) => {
  const { interactionId } = req.params;
  const { type, date, summary, notes, participants, followUpNeeded } = req.body;

  try {
    const updatedInteraction = await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        type: type as InteractionType,
        date: date ? new Date(date) : undefined,
        summary,
        notes,
        participants,
        followUpNeeded: followUpNeeded !== undefined ? Boolean(followUpNeeded) : undefined,
      },
    });
    res.json(updatedInteraction);
  } catch (error) {
    console.error(`Error updating interaction ${interactionId}:`, error);
    if ((error as any).code === 'P2025') { // Record to update not found
        return res.status(404).json({ error: 'Interaction not found' });
    }
    res.status(500).json({ error: 'Failed to update interaction' });
  }
}) as RequestHandler);

// DELETE /api/interactions/:interactionId - Delete an interaction
router.delete('/:interactionId', (async (req: Request, res: Response, next: NextFunction) => {
  const { interactionId } = req.params;
  try {
    await prisma.interaction.delete({
      where: { id: interactionId },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error deleting interaction ${interactionId}:`, error);
    if ((error as any).code === 'P2025') { // Record to delete not found
        return res.status(404).json({ error: 'Interaction not found' });
    }
    res.status(500).json({ error: 'Failed to delete interaction' });
  }
}) as RequestHandler);

export default router;
