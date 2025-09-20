export interface QuestionCategory {
    type: 'product-specific' | 'technical' | 'integration' | 'general' | 'language';
    product?: string;
    language?: string;
}