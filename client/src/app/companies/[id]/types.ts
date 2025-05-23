export interface Evaluation {
  evaluationDate: string;
  evaluator?: string;
  overallNotes?: string;
  
  // Category scores (1-10)
  problemScore?: number;
  solutionScore?: number;
  teamScore?: number;
  marketScore?: number;
  businessModelScore?: number;
  tractionScore?: number;
  competitionScore?: number;
  differentiationScore?: number;
  investmentPotentialScore?: number;
  
  // Category notes
  problemNotes?: string;
  solutionNotes?: string;
  teamNotes?: string;
  marketNotes?: string;
  businessModelNotes?: string;
  tractionNotes?: string;
  competitionNotes?: string;
  differentiationNotes?: string;
  investmentPotentialNotes?: string;
}
