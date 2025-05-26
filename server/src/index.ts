import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import companyRoutes from './routes/companyRoutes';
import metricRoutes from './routes/metricRoutes';
import interactionRoutes from './routes/interactionRoutes';
import evaluationRoutes from './routes/evaluationRoutes';
import updateLogRoutes from './routes/updateLogRoutes';
import emailRoutes from './routes/emailRoutes';
import { initializeEmailService } from './services/emailService';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8088;


app.use(express.json());
app.use(cors());


app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/health', (req, res) => {res.status(200).json({ status: 'healthy' })});


app.use('/api/companies', companyRoutes);
// Mount metricRoutes, typically nested under companies, e.g., /api/companies/:companyId/metrics
// Also provide direct access to metrics by ID, e.g., /api/metrics/:metricId
app.use('/api/companies/:companyId/metrics', metricRoutes); // For company-specific metric operations
app.use('/api/metrics', metricRoutes); // For general metric operations by metricId (GET, PUT, DELETE specific metric)

// Mount interactionRoutes
app.use('/api/companies/:companyId/interactions', interactionRoutes); // For company-specific interaction operations
app.use('/api/interactions', interactionRoutes); // For general interaction operations by interactionId

// Mount evaluationRoutes
app.use('/api/companies/:companyId/evaluations', evaluationRoutes); // For company-specific evaluation operations
app.use('/api/evaluations', evaluationRoutes); // For general evaluation operations by evaluationId

// Mount updateLogRoutes
app.use('/api/companies/:companyId/updatelogs', updateLogRoutes);

// Mount emailRoutes
app.use('/api/emails', emailRoutes);


app.listen(PORT, () => {
  console.log(`Express server is running on http://localhost:${PORT}`);
  
  // Initialize email service
  initializeEmailService();
  console.log('Email service initialized');
});


process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

