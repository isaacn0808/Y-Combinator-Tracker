import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, MetricName } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router({ mergeParams: true }); // mergeParams allows access to :companyId

// --- Metric Routes ---

// POST /api/companies/:companyId/metrics - Create a new metric for a company
router.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  const { name, value, valueString, dateRecorded, source } = req.body;

  if (!name || value === undefined || !dateRecorded) {
    return res.status(400).json({ error: 'Metric name, value, and dateRecorded are required' });
  }

  try {
    const newMetric = await prisma.metric.create({
      data: {
        companyId,
        name: name as MetricName,
        value: parseFloat(value),
        valueString,
        dateRecorded: new Date(dateRecorded),
        source,
      },
    });
    res.status(201).json(newMetric);
  } catch (error) {
    console.error(`Error creating metric for company ${companyId}:`, error);
    // Add more specific error handling if needed (e.g., company not found)
    if ((error as any).code === 'P2003') { // Foreign key constraint failed
        return res.status(404).json({ error: `Company with ID ${companyId} not found or invalid metric name.` });
    }
    res.status(500).json({ error: 'Failed to create metric' });
  }
}) as RequestHandler);

// GET /api/companies/:companyId/metrics - Get all metrics for a specific company
router.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  try {
    const metrics = await prisma.metric.findMany({
      where: { companyId },
      orderBy: {
        dateRecorded: 'desc', // Show most recent metrics first
      },
    });
    // Check if company exists before returning metrics, or let it return empty array if no metrics
    // For simplicity, we assume if no metrics, company might still exist.
    // A separate check for company existence could be done if strictness is required.
    res.json(metrics);
  } catch (error) {
    console.error(`Error fetching metrics for company ${companyId}:`, error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}) as RequestHandler);

// GET /api/metrics/:metricId - Get a single metric by ID
router.get('/:metricId', (async (req: Request, res: Response, next: NextFunction) => {
  const { metricId } = req.params;
  try {
    const metric = await prisma.metric.findUnique({
      where: { id: metricId },
    });
    if (metric) {
      res.json(metric);
    } else {
      res.status(404).json({ error: 'Metric not found' });
    }
  } catch (error) {
    console.error(`Error fetching metric ${metricId}:`, error);
    res.status(500).json({ error: 'Failed to fetch metric' });
  }
}) as RequestHandler);

// PUT /api/metrics/:metricId - Update an existing metric
router.put('/:metricId', (async (req: Request, res: Response, next: NextFunction) => {
  const { metricId } = req.params;
  const { name, value, valueString, dateRecorded, source } = req.body;

  try {
    const updatedMetric = await prisma.metric.update({
      where: { id: metricId },
      data: {
        name: name as MetricName,
        value: value !== undefined ? parseFloat(value) : undefined,
        valueString: valueString !== undefined ? valueString : undefined,
        dateRecorded: dateRecorded ? new Date(dateRecorded) : undefined,
        source: source !== undefined ? source : undefined,
      },
    });
    res.json(updatedMetric);
  } catch (error) {
    console.error(`Error updating metric ${metricId}:`, error);
    if ((error as any).code === 'P2025') { // Record to update not found
        return res.status(404).json({ error: 'Metric not found' });
    }
    res.status(500).json({ error: 'Failed to update metric' });
  }
}) as RequestHandler);

// DELETE /api/metrics/:metricId - Delete a metric
router.delete('/:metricId', (async (req: Request, res: Response, next: NextFunction) => {
  const { metricId } = req.params;
  try {
    await prisma.metric.delete({
      where: { id: metricId },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error deleting metric ${metricId}:`, error);
    if ((error as any).code === 'P2025') { // Record to delete not found
        return res.status(404).json({ error: 'Metric not found' });
    }
    res.status(500).json({ error: 'Failed to delete metric' });
  }
}) as RequestHandler);

export default router;
