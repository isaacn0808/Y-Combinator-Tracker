export interface Founder {
  id: string;
  name: string;
  title: string | null;
  linkedin: string | null;
  bio: string | null;
  companyId: string;
}
export interface CompanyMetrics {
  userCount?: string | null;
  growthRate?: string | null;
  burnRate?: string | null;
  revenue?: string | null;
}
export interface FundingInfo {
  stage: string | null;
  raised?: string | null;
  valuation?: string | null;
  runway?: string | null;
}
export interface EvaluationScores {
  problem: number;
  solution: number;
  team: number;
  market: number;
  businessModel: number;
  traction: number;
  competition: number;
  differentiation: number;
  investmentPotential: number;
}
export interface EvaluationNotes {
  problem?: string;
  solution?: string;
  team?: string;
  market?: string;
  businessModel?: string;
  traction?: string;
  competition?: string;
  differentiation?: string;
  investmentPotential?: string;
  general?: string;
}
export interface Interaction {
  type: 'email' | 'meeting' | 'call' | 'demo' | 'other';
  date: string;
  notes?: string;
}
export interface MetricUpdate {
  id: string;
  date: string;
  type: 'metrics' | 'funding';
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  notes?: string;
}
export interface Company {
  id: string;
  name: string;
  batch: string;
  sectors: string[]; // Changed from sector (string) to sectors (string[]) to support multiple sectors
  website: string;
  oneLiner: string;
  description: string;
  foundingDate: string;
  founders: Founder[];
  metrics?: CompanyMetrics;
  funding?: FundingInfo;
  // Snapshot fields for metrics directly on company
  metrics_userCount?: string | null | undefined;
  metrics_growthRate?: string | null | undefined;
  metrics_burnRate?: string | null | undefined;
  metrics_revenue?: string | null | undefined;
  // Snapshot fields for funding directly on company
  funding_stage?: string | null | undefined;
  funding_raised?: string | null | undefined;
  funding_valuation?: string | null | undefined;
  funding_runway?: string | null | undefined;
  productStatus: 'pre-launch' | 'beta' | 'live';
  businessModel: string;
  developmentStage: 'idea' | 'mvp' | 'pmf' | 'growth' | 'scale';
  logo?: string;
  evaluationScores?: Partial<EvaluationScores>;
  evaluationNotes?: EvaluationNotes;
  interactions?: Interaction[];
  updates?: MetricUpdate[];
  status: 'watching' | 'engaged' | 'invested' | 'passed' | 'new';
  metWith: boolean;
  lastMeetingDate?: string;
}
export type SortField = 
  | 'name' 
  | 'problem' 
  | 'solution' 
  | 'team' 
  | 'market' 
  | 'businessModel' 
  | 'traction' 
  | 'competition' 
  | 'differentiation' 
  | 'investmentPotential'
  | 'overall';
export type SortDirection = 'asc' | 'desc';
export interface Filters {
  search: string;
  sectors: string[];
  stages: string[];
  status: string[];
  metWith: boolean | null;
}
