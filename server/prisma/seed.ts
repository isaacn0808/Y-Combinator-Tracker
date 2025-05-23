import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  // Export all data from your database
  const companies = await prisma.company.findMany();
  const metrics = await prisma.metric.findMany();
  const evaluations = await prisma.evaluation.findMany();
  const interactions = await prisma.interaction.findMany();
  const processedEmails = await prisma.processedEmail.findMany();
  const updateLogs = await prisma.updateLog.findMany();

  // Create a data object with all your data
  const data = {
    companies,
    metrics,
    evaluations,
    interactions,
    processedEmails,
    updateLogs,
  };

  // Write the data to a JSON file
  fs.writeFileSync(
    path.join(__dirname, 'seed-data.json'),
    JSON.stringify(data, null, 2)
  );

  console.log('Data exported successfully to seed-data.json');
}

async function importData() {
  try {
    // Check if the seed data file exists
    const seedFilePath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(seedFilePath)) {
      console.error('Seed data file not found. Run export first.');
      return;
    }

    // Read the seed data
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

    // Import companies first
    console.log(`Importing ${seedData.companies.length} companies...`);
    for (const company of seedData.companies) {
      await prisma.company.upsert({
        where: { id: company.id },
        update: company,
        create: company,
      });
    }

    // Import metrics
    console.log(`Importing ${seedData.metrics.length} metrics...`);
    for (const metric of seedData.metrics) {
      await prisma.metric.upsert({
        where: { id: metric.id },
        update: metric,
        create: metric,
      });
    }

    // Import evaluations
    console.log(`Importing ${seedData.evaluations.length} evaluations...`);
    for (const evaluation of seedData.evaluations) {
      await prisma.evaluation.upsert({
        where: { id: evaluation.id },
        update: evaluation,
        create: evaluation,
      });
    }

    // Import interactions
    console.log(`Importing ${seedData.interactions.length} interactions...`);
    for (const interaction of seedData.interactions) {
      await prisma.interaction.upsert({
        where: { id: interaction.id },
        update: interaction,
        create: interaction,
      });
    }

    // Import processed emails
    console.log(`Importing ${seedData.processedEmails.length} processed emails...`);
    for (const email of seedData.processedEmails) {
      await prisma.processedEmail.upsert({
        where: { id: email.id },
        update: email,
        create: email,
      });
    }

    // Import update logs
    console.log(`Importing ${seedData.updateLogs.length} update logs...`);
    for (const log of seedData.updateLogs) {
      await prisma.updateLog.upsert({
        where: { id: log.id },
        update: log,
        create: log,
      });
    }

    console.log('Data imported successfully');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

// Check command line arguments to determine whether to export or import
const args = process.argv.slice(2);
if (args.includes('--export')) {
  exportData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
} else if (args.includes('--import')) {
  importData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
} else {
  console.log('Please specify --export or --import');
  process.exit(1);
}
