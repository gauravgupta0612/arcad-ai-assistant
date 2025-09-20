export type ProductCategory = 'DevOps' | 'Modernization' | 'Testing' | 'Security' | 'Integration';

export interface TechnicalDetails {
    requirements?: string[];
    platforms?: string[];
    integrations?: string[];
}

export interface ProductInfo {
    url: string;
    description: string;
    category: ProductCategory;
    keyFeatures: string[];
    relatedProducts?: string[];
    technicalDetails?: TechnicalDetails;
    name?: string; // Optional name field for internal use
}