export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface LanguageInfo {
  name: string;
  url: string;
}

export interface QuestionCategory {
  type: 'product-specific' | 'technical' | 'integration' | 'general' | 'language';
  product?: string;
  language?: string;
}

export interface ConversationalResponse {
  isConversational: boolean;
  response?: string;
}

export interface ContextResponse {
  contextText: string;
  finalContextUrl: string;
}

export interface WebviewState {
  isConnected: boolean;
  text: string;
}