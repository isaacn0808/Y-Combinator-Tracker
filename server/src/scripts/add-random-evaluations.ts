import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to generate a random integer between min and max (inclusive)
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate random evaluation scores (1-10) for each category
function generateRandomScores() {
  return {
    problemScore: getRandomInt(3, 10),
    solutionScore: getRandomInt(3, 10),
    teamScore: getRandomInt(3, 10),
    marketScore: getRandomInt(3, 10),
    businessModelScore: getRandomInt(3, 10),
    tractionScore: getRandomInt(3, 10),
    competitionScore: getRandomInt(3, 10),
    differentiationScore: getRandomInt(3, 10),
    investmentPotentialScore: getRandomInt(3, 10),
  };
}

// Function to generate random notes for each category
function generateRandomNotes(companyName: string, score: number, category: string): string {
  const positiveAdjectives = ['strong', 'impressive', 'compelling', 'excellent', 'solid', 'promising'];
  const neutralAdjectives = ['adequate', 'reasonable', 'fair', 'moderate', 'average'];
  const negativeAdjectives = ['weak', 'concerning', 'limited', 'questionable', 'underdeveloped'];
  
  let adjective;
  if (score >= 8) {
    adjective = positiveAdjectives[getRandomInt(0, positiveAdjectives.length - 1)];
  } else if (score >= 5) {
    adjective = neutralAdjectives[getRandomInt(0, neutralAdjectives.length - 1)];
  } else {
    adjective = negativeAdjectives[getRandomInt(0, negativeAdjectives.length - 1)];
  }
  
  return `${companyName} demonstrates ${adjective} ${category.toLowerCase()} with a score of ${score}/10.`;
}

// Main function to add random evaluations for all companies
async function addRandomEvaluations() {
  try {
    // Get all companies from the database
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies. Adding random evaluations...`);
    
    // Create a random evaluation for each company
    for (const company of companies) {
      const scores = generateRandomScores();
      
      // Generate evaluation date (between 1-30 days ago)
      const daysAgo = getRandomInt(1, 30);
      const evaluationDate = new Date();
      evaluationDate.setDate(evaluationDate.getDate() - daysAgo);
      
      // Generate notes based on scores
      const problemNotes = generateRandomNotes(company.name, scores.problemScore, 'Problem Definition');
      const solutionNotes = generateRandomNotes(company.name, scores.solutionScore, 'Solution Approach');
      const teamNotes = generateRandomNotes(company.name, scores.teamScore, 'Team Composition');
      const marketNotes = generateRandomNotes(company.name, scores.marketScore, 'Market Opportunity');
      const businessModelNotes = generateRandomNotes(company.name, scores.businessModelScore, 'Business Model');
      const tractionNotes = generateRandomNotes(company.name, scores.tractionScore, 'Traction');
      const competitionNotes = generateRandomNotes(company.name, scores.competitionScore, 'Competitive Landscape');
      const differentiationNotes = generateRandomNotes(company.name, scores.differentiationScore, 'Differentiation');
      const investmentPotentialNotes = generateRandomNotes(company.name, scores.investmentPotentialScore, 'Investment Potential');
      
      // Create a summary of overall notes
      const overallScore = Math.round(
        (scores.problemScore + scores.solutionScore + scores.teamScore + 
         scores.marketScore + scores.businessModelScore + scores.tractionScore + 
         scores.competitionScore + scores.differentiationScore + scores.investmentPotentialScore) / 9
      );
      
      const overallNotes = `${company.name} received an overall evaluation score of ${overallScore}/10. This evaluation was generated automatically for testing purposes.`;
      
      // Check if the company already has an evaluation
      const existingEvaluation = await prisma.evaluation.findFirst({
        where: { companyId: company.id }
      });
      
      if (existingEvaluation) {
        // Update existing evaluation
        await prisma.evaluation.update({
          where: { id: existingEvaluation.id },
          data: {
            evaluationDate,
            evaluator: 'Auto-Generator',
            overallNotes,
            ...scores,
            problemNotes,
            solutionNotes,
            teamNotes,
            marketNotes,
            businessModelNotes,
            tractionNotes,
            competitionNotes,
            differentiationNotes,
            investmentPotentialNotes,
          }
        });
        console.log(`Updated evaluation for ${company.name}`);
      } else {
        // Create new evaluation
        await prisma.evaluation.create({
          data: {
            companyId: company.id,
            evaluationDate,
            evaluator: 'Auto-Generator',
            overallNotes,
            ...scores,
            problemNotes,
            solutionNotes,
            teamNotes,
            marketNotes,
            businessModelNotes,
            tractionNotes,
            competitionNotes,
            differentiationNotes,
            investmentPotentialNotes,
          }
        });
        console.log(`Created evaluation for ${company.name}`);
      }
    }
    
    console.log('All evaluations have been added successfully!');
  } catch (error) {
    console.error('Error adding evaluations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
addRandomEvaluations()
  .then(() => console.log('Script completed.'))
  .catch((e) => console.error('Script failed:', e));
