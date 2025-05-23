export interface ProcessedEmail {
  id: string;
  messageId: string;
  subject: string;
  sender: string;
  receivedAt: string;
  content: string;
  processed: boolean;
  analysisResult?: EmailAnalysisResult;
  analysisDate?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAnalysisResult {
  companyName?: string;
  metrics?: {
    name: string;
    value: number;
    valueString?: string;
    dateRecorded: string;
  }[];
  // Single interaction object (matches OpenAI output format)
  interaction?: {
    type: string;
    date: string;
    summary: string;
    notes?: string;
    participants?: string[];
    followUpNeeded?: boolean;
  };
  // Legacy format - keeping for backward compatibility
  interactions?: {
    type: string;
    date: string;
    summary: string;
    notes?: string;
    participants?: string[];
    followUpNeeded?: boolean;
  }[];
  // Evaluation notes (matches OpenAI output format)
  evaluationNotes?: {
    category: string;
    score?: number;
    notes?: string;
  }[];
  // Legacy format - keeping for backward compatibility
  evaluations?: {
    category: string;
    score?: number;
    notes?: string;
  }[];
  businessUpdates?: {
    type: string;
    content: string;
    date?: string;
  }[];
  // Raw analysis result string (for debugging)
  rawResult?: string;
  // For nested structures
  extractedData?: Record<string, unknown>;
}
