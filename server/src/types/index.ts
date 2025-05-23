// Type definitions for the application

// Email processing types
export interface EmailData {
  messageId: string;
  subject: string;
  sender: string;
  receivedAt: Date;
  content: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface EmailAnalysisResult {
  companyId?: string;
  companyName?: string;
  analysisResult: string;
  extractedData?: {
    metrics?: {
      name?: string
      value: number;
      valueString?: string;
      dateRecorded?: Date;
      description?: string; // Used for the human-readable description of the metric
    }[];
    interaction?: {
      type: string;
      date?: Date;
      summary: string;
      notes?: string;
      participants?: string[];
      followUpNeeded?: boolean;
    };
    evaluationNotes?: {
      category: string;
      notes: string;
      score?: number;
    }[];
  };
}

// Gmail API authentication types
export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
}
