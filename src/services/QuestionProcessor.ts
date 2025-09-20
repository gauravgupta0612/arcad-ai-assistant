import { PRODUCT_QUERY_TERMS, PRODUCT_LIST_TERMS, PRODUCT_COMPARISON_TERMS, TECHNICAL_TERMS, INTEGRATION_TERMS } from '../config/constants';
import { QuestionCategory, ConversationalResponse } from '../interfaces/types';
import { ARCAD_PRODUCTS, ARCAD_PRODUCT_MAP } from '../data/products';
import { ProductCategory, ProductInfo } from '../interfaces/Product';



const ARCAD_LANGUAGE_MAP: Record<string, { name: string, url: string }> = {
    'french': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'français': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'frace': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' }, // Typo for French
    'spanish': { name: 'Spanish', url: 'https://www.arcadsoftware.com/es/' },
    'german': { name: 'German', url: 'https://www.arcadsoftware.com/de/' },
    'italian': { name: 'Italian', url: 'https://www.arcadsoftware.com/it/' },
    'japanese': { name: 'Japanese', url: 'https://www.arcadsoftware.com/ja/' },
    'india': { name: 'India', url: 'https://www.arcadsoftware.com/about/contact-us/' }, // No specific language, use contact page
    'idnia': { name: 'India', url: 'https://www.arcadsoftware.com/about/contact-us/' }, // Typo for India
    'france': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'english': { name: 'English', url: Constants.URLS.PRODUCTS },
    'neng': { name: 'English', url: Constants.URLS.PRODUCTS }, // Typo for English
};
import { Memoizer } from '../utils/Memoizer';
import { Constants } from '../constants';

export class QuestionProcessor {
  private productsByCategory: Map<ProductCategory, ProductInfo[]> | null = null;
  private memoizer: Memoizer<string, string> = new Memoizer();
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/[-\s]/g, '')
      .trim();
  }
  

  public categorizeQuestion(question: string): QuestionCategory {
    const lowerQuestion = question.toLowerCase();
    
    // Check for language/localization first
    const languageKeywords = Object.keys(ARCAD_LANGUAGE_MAP);
    const language = languageKeywords.find(lang => lowerQuestion.includes(lang.toLowerCase()));
    if (language) {
      return { type: 'language', language };
    }
    
    // Check for specific products
    const products = Object.keys(ARCAD_PRODUCT_MAP);
    const product = products.find(prod => lowerQuestion.includes(prod.toLowerCase()));
    if (product) {
      return { type: 'product-specific', product };
    }
    
    if (TECHNICAL_TERMS.some(term => lowerQuestion.includes(term))) {
      return { type: 'technical' };
    }
    
    if (INTEGRATION_TERMS.some(term => lowerQuestion.includes(term))) {
      return { type: 'integration' };
    }
    
    return { type: 'general' };
  }

  public isProductQuery(question: string): boolean {
    const normalizedQuestion = this.normalizeText(question);
    return PRODUCT_QUERY_TERMS.some(term => normalizedQuestion.includes(term.replace(/\s/g, '')));
  }

  public isProductListingQuery(question: string): boolean {
    const normalizedQuestion = this.normalizeText(question);
    return PRODUCT_LIST_TERMS.some(term => normalizedQuestion.includes(term.replace(/\s/g, '')));
  }

  public isProductComparisonQuery(question: string): boolean {
    const normalizedQuestion = this.normalizeText(question);
    return PRODUCT_COMPARISON_TERMS.some(term => normalizedQuestion.includes(term.replace(/\s/g, '')));
  }

  public findMentionedProducts(question: string): string[] {
    const normalizedQuestion = this.normalizeText(question);
    return Object.keys(ARCAD_PRODUCTS).filter(prod => {
      const normalizedProd = this.normalizeText(prod);
      return normalizedQuestion.includes(normalizedProd);
    });
  }

  public generateProductResponse(productName: string): string {
    const productInfo = ARCAD_PRODUCTS[productName];
    if (!productInfo) return '';

    let response = `**${productName}**\n\n`;
    response += `${productInfo.description}\n\n`;
    response += `**Category:** ${productInfo.category}\n\n`;
    
    response += "**Key Features:**\n";
    productInfo.keyFeatures.forEach(feature => {
      response += `- ${feature}\n`;
    });
    response += "\n";

    if (productInfo.technicalDetails) {
      if (productInfo.technicalDetails.platforms) {
        response += "**Supported Platforms:**\n";
        productInfo.technicalDetails.platforms.forEach(platform => {
          response += `- ${platform}\n`;
        });
        response += "\n";
      }
      if (productInfo.technicalDetails.integrations) {
        response += "**Integrations:**\n";
        productInfo.technicalDetails.integrations.forEach(integration => {
          response += `- ${integration}\n`;
        });
        response += "\n";
      }
    }

    if (productInfo.relatedProducts?.length) {
      response += "**Related Products:**\n";
      productInfo.relatedProducts.forEach(related => {
        response += `- ${related}\n`;
      });
      response += "\n";
    }

    response += `For more details, visit: ${productInfo.url}\n\n`;
    return response;
  }

  public generateProductComparison(product1: string, product2: string): string {
    const product1Info = ARCAD_PRODUCTS[product1];
    const product2Info = ARCAD_PRODUCTS[product2];
    if (!product1Info || !product2Info) return '';

    let response = `Let me compare **${product1}** and **${product2}** for you:\n\n`;
    
    response += "**Categories:**\n";
    response += `- ${product1}: ${product1Info.category}\n`;
    response += `- ${product2}: ${product2Info.category}\n\n`;

    response += "**Purpose:**\n";
    response += `- ${product1}: ${product1Info.description}\n`;
    response += `- ${product2}: ${product2Info.description}\n\n`;

    response += "**Key Features Comparison:**\n\n";
    response += `*${product1}:*\n`;
    product1Info.keyFeatures.forEach(feature => {
      response += `- ${feature}\n`;
    });
    response += `\n*${product2}:*\n`;
    product2Info.keyFeatures.forEach(feature => {
      response += `- ${feature}\n`;
    });
    response += "\n";

    response += "For more detailed information:\n";
    response += `- ${product1}: ${product1Info.url}\n`;
    response += `- ${product2}: ${product2Info.url}\n`;

    return response;
  }

  public generateProductListByCategory(): string {
    const productsByCategory = new Map<ProductCategory, ProductInfo[]>();
    
    Object.entries(ARCAD_PRODUCTS).forEach(([name, info]) => {
      if (!productsByCategory.has(info.category)) {
        productsByCategory.set(info.category, []);
      }
      productsByCategory.get(info.category)!.push({...info, name});
    });

    let response = `ARCAD Software offers ${Object.keys(ARCAD_PRODUCTS).length} powerful products for IBM i modernization and DevOps solutions.\n\n`;
    response += "Here's an overview of our products by category:\n\n";

    productsByCategory.forEach((products, category) => {
      response += `**${category}**\n`;
      products.forEach(product => {
        response += `- **${product.name}**: ${product.description}\n`;
      });
      response += "\n";
    });

    response += "Would you like to know more about any specific product? Just ask!\n";
    response += "For example:\n";
    response += "- 'Tell me more about ARCAD-Skipper'\n";
    response += "- 'What are the features of ARCAD-Observer?'\n";
    response += "- 'Compare ARCAD-Transformer with ARCAD-CodeChecker'\n";

    return response;
  }
}