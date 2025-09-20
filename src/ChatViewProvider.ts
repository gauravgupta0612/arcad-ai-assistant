import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { GeminiConnector } from './GeminiConnector';
import { CancellationToken, Uri, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from 'vscode';
import { WebviewMessage, WebviewMessageType } from './interfaces/WebviewMessage';
import { QuestionCategory } from './interfaces/Question';
import { ContextResult, ConversationalResult } from './interfaces/Result';
import { conversationTemplates } from './templates/conversationTemplates';
import { ARCAD_PRODUCTS, ARCAD_PRODUCT_MAP } from './data/products';
import { ProductCategory, ProductInfo } from './interfaces/Product';
import { ChatUI } from './ui/components/ChatUI';

// Constants
export class Constants {
    static readonly URLS = {
        PRODUCTS: 'https://www.arcadsoftware.com/arcad/products/',
        GITHUB: 'https://github.com/ARCAD-Software',
        GITHUB_FALLBACK: 'https://github.com/ARCAD-Software'
    };

    static readonly CONTENT = {
        MIN_LENGTH: 200,
        MAX_RETRIES: 3,
        INITIAL_BACKOFF_MS: 1000,
        TIMEOUT_MS: 10000
    };

    static readonly ARCAD_PRODUCTS_URL = 'https://www.arcadsoftware.com/arcad/products/';
}




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

export class ChatViewProvider implements WebviewViewProvider {
    public static readonly viewType = 'arcad-ai-assistant.chatView';

    private _view?: WebviewView;
    private _geminiConnector?: GeminiConnector;
    private _disposables: vscode.Disposable[] = [];
    private _abortController: AbortController | null = null;
    private _isProcessing: boolean = false;

    private _chatUI: ChatUI;
    private responseTemplates = conversationTemplates;

    constructor(private readonly _extensionUri: Uri) {
      this._chatUI = new ChatUI(_extensionUri);
      this._initializeGeminiClient();

      // Listen for configuration changes
      vscode.workspace.onDidChangeConfiguration(e => {
        if (
          e.affectsConfiguration('arcad-ai-assistant.gemini.apiKey') ||
          e.affectsConfiguration('arcad-ai-assistant.gemini.modelName')
        ) {
          this._initializeGeminiClient();
          this.sendStatus();
        }
      }, null, this._disposables);
    }

    private getRandomResponse(responses: string[]): string {
      const index = Math.floor(Math.random() * responses.length);
      return responses[index];
    }

	private _initializeGeminiClient() {
		const config = vscode.workspace.getConfiguration('arcad-ai-assistant.gemini');
		const apiKey = config.get('apiKey') as string;
		const modelName = config.get('modelName') as string;

		if (!apiKey || !modelName) {
			this._geminiConnector = undefined;
			return;
		}

		try {
			this._geminiConnector = new GeminiConnector(apiKey, modelName);
		} catch (error: any) {
			this._geminiConnector = undefined;
			console.error("Failed to initialize Gemini Connector:", error);
			this.sendError(`Failed to initialize AI Assistant: ${error.message}`);
		}
	}

	public resolveWebviewView(
		webviewView: WebviewView,
		context: WebviewViewResolveContext,
		_token: CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		this.sendStatus();

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case 'addQuestion':
					// This is a "fire-and-forget" call. We don't need to wait for it to finish
					// because the method handles sending updates and errors to the webview itself.
					// Adding a .catch() here is a good practice for any unexpected errors.
					this.handleQuestion(data.value).catch(err => {
						console.error("An unexpected error occurred in the message handler:", err);
						this.sendError("A critical, unexpected error occurred. Please check the extension's developer logs for more details.");
					});
					break;
				case 'cancelRequest':
					if (this._isProcessing && this._abortController) {
						this._abortController.abort();
					}
					break;
			}
		});
	}

	public sendStatus() {
		if (this._view) {
			const config = vscode.workspace.getConfiguration('arcad-ai-assistant.gemini');
			const apiKey = config.get('apiKey');
			const modelName = config.get('modelName');
			let text: string;
			let isConnected = false;

			if (!apiKey) {
				text = "Gemini API key not set. Please set it in the VS Code settings (`arcad-ai-assistant.gemini.apiKey`).";
			} else if (!modelName) {
				text = "Gemini model name not set. Please set it in the VS Code settings (`arcad-ai-assistant.gemini.modelName`).";
			} else if (!this._geminiConnector) {
				text = "Failed to initialize AI Assistant. Check API key and model name in settings.";
			} else {
				text = "👋 Hello! I'm your ARCAD AI Assistant, specialized in IBM i modernization and DevOps solutions. I can help you with:\n\n" +
					"• Understanding ARCAD Software products and features\n" +
					"• Technical information about modernization and DevOps\n" +
					"• Best practices and implementation guidance\n" +
					"• Integration scenarios and solutions\n\n" +
					"How can I assist you today?";
				isConnected = true;
			}
			this._view.webview.postMessage({
				type: 'updateStatus',
				isConnected: isConnected,
				text: text
			});
		}
	}

	public clearChat() {
		if (this._view) {
			if (this._isProcessing && this._abortController) {
				this._abortController.abort();
			}

			this._view.webview.postMessage({ type: 'clearChat' });

			this.sendStatus();
		}
	}


	public sendAnswerStart() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'answerStart' });
		}
	}

  /**
   * Categorizes the question to determine the best way to handle it
   * @param question The user's question
   * @returns The category of the question
   */
  private categorizeQuestion(question: string): {
    type: 'product-specific' | 'technical' | 'integration' | 'general' | 'language';
    product?: string;
    language?: string;
  } {
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
    
    // Check for technical questions
    const technicalTerms = [
      'how to', 'implement', 'configure', 'setup', 'install', 'deploy',
      'documentation', 'guide', 'tutorial', 'example', 'requirement'
    ];
    if (technicalTerms.some(term => lowerQuestion.includes(term))) {
      return { type: 'technical' };
    }
    
    // Check for integration questions
    const integrationTerms = [
      'integrate', 'connection', 'workflow', 'pipeline', 'devops',
      'jenkins', 'github', 'gitlab', 'ci/cd', 'automation'
    ];
    if (integrationTerms.some(term => lowerQuestion.includes(term))) {
      return { type: 'integration' };
    }
    
    return { type: 'general' };
  }

  private isConversationalQuery(question: string): { isConversational: boolean; response?: string } {
    // Convert to lowercase and remove extra spaces
    const normalizedQuestion = question.toLowerCase().trim()
      .replace(/[.,!?]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ');   // Normalize whitespace

    // Enhanced greeting patterns with context awareness
    const simpleGreetings = ['hi', 'hey', 'hello', 'yo', 'hola', 'greetings', 'howdy', 'hai'];
    const isSimpleGreeting = simpleGreetings.some(greeting => 
      normalizedQuestion === greeting || 
      normalizedQuestion.startsWith(`${greeting} `) || 
      normalizedQuestion.endsWith(` ${greeting}`)
    );
    
    if (isSimpleGreeting) {
      // Use time-aware greeting for more natural responses
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      return {
        isConversational: true,
        response: `${this.getRandomResponse(this.responseTemplates.timeSpecific[timeOfDay])} I'm an ARCAD AI Assistant specialized in IBM i modernization and DevOps solutions. How can I help you today?`
      };
    }

    // Time-based greetings with context
    const timeBasedGreetings: Record<keyof typeof this.responseTemplates.timeSpecific, string[]> = {
      morning: ['morning', 'good morning'],
      afternoon: ['afternoon', 'good afternoon'],
      evening: ['evening', 'good evening', 'night', 'good night']
    };

    for (const [timeOfDay, patterns] of Object.entries(timeBasedGreetings)) {
      if (patterns.some(pattern => normalizedQuestion.includes(pattern))) {
        const tod = timeOfDay as keyof typeof this.responseTemplates.timeSpecific;
        return {
          isConversational: true,
          response: `${this.getRandomResponse(this.responseTemplates.timeSpecific[tod])} I'm here to help with any questions about ARCAD Software's solutions.`
        };
      }
    }

    // Well-being queries with product context
    const wellbeingPatterns = [
      'how are you', 'how r u', 'how you doing',
      'how do you do', 'how are things', 'how is it going'
    ];
    if (wellbeingPatterns.some(pattern => normalizedQuestion.includes(pattern))) {
      return {
        isConversational: true,
        response: `${this.getRandomResponse(this.responseTemplates.howAreYou)} I'm ready to assist you with any questions about ARCAD's products, IBM i modernization, or DevOps solutions.`
      };
    }

    // Enhanced capability queries with specific product mentions
    const capabilityPatterns = [
      'what can you do', 'what do you do', 'help me',
      'how can you help', 'what are your capabilities'
    ];
    if (capabilityPatterns.some(pattern => normalizedQuestion.includes(pattern))) {
      return {
        isConversational: true,
        response: "I'm an AI assistant specialized in ARCAD Software's solutions. I can help you with:\n\n" +
          "• Detailed information about ARCAD products and features\n" +
          "• Technical guidance on IBM i modernization\n" +
          "• DevOps implementation strategies\n" +
          "• Best practices for application modernization\n" +
          "• Integration scenarios and solutions\n\n" +
          "What specific area would you like to know more about?"
      };
    }

    // Gratitude expressions with follow-up
    if (normalizedQuestion.includes('thank') || normalizedQuestion.includes('thanks')) {
      return {
        isConversational: true,
        response: `${this.getRandomResponse(this.responseTemplates.gratitude)} Is there anything else you'd like to know about ARCAD's solutions?`
      };
    }

    // Compound greetings with product context
    const compoundGreetings = [
      'hi there', 'hello there', 'hey there',
      'nice to meet you', 'pleasure to meet you'
    ];
    if (compoundGreetings.some(pattern => normalizedQuestion.includes(pattern))) {
      return {
        isConversational: true,
        response: "Hello! I'm your ARCAD AI Assistant. I specialize in providing information about:\n\n" +
          "• ARCAD Software's product suite\n" +
          "• IBM i modernization solutions\n" +
          "• DevOps and CI/CD implementation\n" +
          "• Technical specifications and features\n\n" +
          "How can I assist you today?"
      };
    }

    // No conversational pattern matched
    return { isConversational: false };
  }

  private async handleQuestion(question: string): Promise<void> {
    if (this._isProcessing) {
      this.sendError("Please wait, your previous question is still being processed.");
      return;
    }

    this._isProcessing = true;
    this._abortController = new AbortController();
    try {
      // Always check for conversational queries first
      const conversationalCheck = this.isConversationalQuery(question);
      if (conversationalCheck.isConversational && conversationalCheck.response) {
        this.sendAnswer(conversationalCheck.response);
        this._isProcessing = false;
        return;
      }

      const questionCategory = this.categorizeQuestion(question);
      const lowerCaseQuestion = question.toLowerCase();			// 1. Check for language/localization-related keywords first, as this is a common general question.
			const languageKeywords = ['language', 'translate', 'international', 'install', ...Object.keys(ARCAD_LANGUAGE_MAP)];
			const mentionedLanguageTerm = languageKeywords.find(term => lowerCaseQuestion.includes(term));

			if (mentionedLanguageTerm && !lowerCaseQuestion.includes('product')) {
				const langInfo = ARCAD_LANGUAGE_MAP[mentionedLanguageTerm];
				// Use a specific language page if available, otherwise the main products page.
				const contextUrl = langInfo ? langInfo.url : Constants.ARCAD_PRODUCTS_URL;
				// Rephrase the question to be more specific for the AI, helping it focus on the user's intent.
				const specificQuestion = `A user is asking about installing ARCAD software in different countries like India and France and expects the user interface to be in the local language (e.g., French in France). Based on the context from the ARCAD website, explain ARCAD's international presence, language support, and how localization is handled in their products.`;

				await this.getAnswerForUrl(specificQuestion, contextUrl, this._abortController.signal);
				return;
			}

			// 2. Check if the question explicitly mentions a known product.
			const productKeys = Object.keys(ARCAD_PRODUCT_MAP);
			const mentionedProduct = productKeys.find(key => lowerCaseQuestion.includes(key.toLowerCase()));

			// Handle any product-related queries
			const isProductQuery = lowerCaseQuestion.includes('product') || 
				lowerCaseQuestion.includes('what is') || 
				lowerCaseQuestion.includes('tell me about') ||
				lowerCaseQuestion.includes('how many') ||
				lowerCaseQuestion.includes('list') ||
				lowerCaseQuestion.includes('show me');

			if (isProductQuery) {
				// First check if specific products are mentioned
				const products = Object.keys(ARCAD_PRODUCTS);
				const mentionedProducts = products.filter(prod => {
					const normalizedProd = prod.toLowerCase().replace(/[-\s]/g, ''); // Remove hyphens and spaces
					const normalizedQuestion = lowerCaseQuestion.replace(/[-\s]/g, ''); // Remove hyphens and spaces
					return normalizedQuestion.includes(normalizedProd);
				});

				if (mentionedProducts.length > 0) {
					// Found specific product(s) mentioned in the question
					for (const mentionedProduct of mentionedProducts) {
						const productInfo = ARCAD_PRODUCTS[mentionedProduct];
						if (productInfo) {
							let response = `**${mentionedProduct}**\n\n`;
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

							if (productInfo.relatedProducts && productInfo.relatedProducts.length > 0) {
								response += "**Related Products:**\n";
								productInfo.relatedProducts.forEach(related => {
									response += `- ${related}\n`;
								});
								response += "\n";
							}

							response += `For more details, visit: ${productInfo.url}\n\n`;
							this.sendAnswer(response);
						}
					}
					return;
				} else {
					// No specific product mentioned, show available products
					let response = "Here are ARCAD's products by category:\n\n";
					
					// Group products by category
					const productsByCategory = new Map<ProductCategory, ProductInfo[]>();
					Object.entries(ARCAD_PRODUCTS).forEach(([name, info]) => {
						if (!productsByCategory.has(info.category)) {
							productsByCategory.set(info.category, []);
						}
						productsByCategory.get(info.category)!.push({...info, name});
					});

					// List products with descriptions
					productsByCategory.forEach((products, category) => {
						response += `**${category}**\n`;
						products.forEach(product => {
							response += `• **${product.name}**: ${product.description}\n`;
						});
						response += "\n";
					});

					response += "To learn more about a specific product, just ask:\n";
					response += "- 'Tell me about [Product Name]'\n";
					response += "- 'What is [Product Name]?'\n";
					response += "- 'What are the features of [Product Name]?'\n";

					this.sendAnswer(response);
					return;
				}
			}

			// 3. Handle product-related queries more intelligently
			// Check for product listing requests
			const explicitListRequest = ['list products', 'show products', 'what products', 'which products'].some(
				phrase => lowerCaseQuestion.includes(phrase)
			);
			
			const isProductCount = lowerCaseQuestion.includes('how many products') || 
				(lowerCaseQuestion.includes('number of') && lowerCaseQuestion.includes('product'));

			if (isProductCount || explicitListRequest) {
				// Group products by category
				const productsByCategory = new Map<ProductCategory, ProductInfo[]>();
				
				Object.entries(ARCAD_PRODUCTS).forEach(([name, info]) => {
					if (!productsByCategory.has(info.category)) {
						productsByCategory.set(info.category, []);
					}
					productsByCategory.get(info.category)!.push({...info, name});
				});

				const totalProducts = Object.keys(ARCAD_PRODUCTS).length;
				let response = `ARCAD Software offers ${totalProducts} powerful products for IBM i modernization and DevOps solutions.\n\n`;
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

				this.sendAnswer(response);
				return;
			}

			const isProductComparison = lowerCaseQuestion.includes('compare') || 
				(lowerCaseQuestion.includes('difference') && lowerCaseQuestion.includes('between')) ||
				(lowerCaseQuestion.includes('vs') || lowerCaseQuestion.includes('versus'));

			// Handle product comparisons directly in chat
			if (isProductComparison) {
				// Extract product names if they are mentioned in the question
				const productMentions = productKeys.filter(key => {
					const normalizedKey = key.toLowerCase().replace(/[-\s]/g, '');
					const normalizedQuestion = lowerCaseQuestion.replace(/[-\s]/g, '');
					return normalizedQuestion.includes(normalizedKey);
				});

				if (productMentions.length >= 2) {
					// Get the first two mentioned products for comparison
					const product1 = productMentions[0];
					const product2 = productMentions[1];
					
					const product1Info = ARCAD_PRODUCTS[product1];
					const product2Info = ARCAD_PRODUCTS[product2];

					let response = `Let me compare **${product1}** and **${product2}** for you:\n\n`;
					
					// Compare categories
					response += "**Categories:**\n";
					response += `- ${product1}: ${product1Info.category}\n`;
					response += `- ${product2}: ${product2Info.category}\n\n`;

					// Compare descriptions
					response += "**Purpose:**\n";
					response += `- ${product1}: ${product1Info.description}\n`;
					response += `- ${product2}: ${product2Info.description}\n\n`;

					// Compare key features
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

					// Add links for more information
					response += "For more detailed information:\n";
					response += `- ${product1}: ${product1Info.url}\n`;
					response += `- ${product2}: ${product2Info.url}\n`;

					this.sendAnswer(response);
				} else {
					// No specific products mentioned, show comparison guide
					let response = "I can help you compare ARCAD products. Here's how to ask for comparisons:\n\n";
					response += "1. Compare specific products:\n";
					response += "   - 'Compare ARCAD-Skipper vs ARCAD-Observer'\n";
					response += "   - 'What's the difference between ARCAD-Transformer and ARCAD-CodeChecker'\n\n";
					
					response += "Available products by category:\n\n";
					
					// Group products by category for better organization
					const productsByCategory = new Map<ProductCategory, string[]>();
					Object.entries(ARCAD_PRODUCTS).forEach(([name, info]) => {
						if (!productsByCategory.has(info.category)) {
							productsByCategory.set(info.category, []);
						}
						productsByCategory.get(info.category)!.push(name);
					});

					// List products by category
					productsByCategory.forEach((products, category) => {
						response += `**${category}**:\n`;
						products.forEach(product => {
							response += `• ${product}\n`;
						});
						response += "\n";
					});

					response += "To compare products, you can:\n";
					response += "1. Type 'Compare [Product1] and [Product2]'\n";
					response += "2. Ask 'What's the difference between [Product1] and [Product2]'\n\n";
					response += "For example:\n";
					response += "- 'Compare ARCAD-Skipper and ARCAD-Observer'\n";
					response += "- 'What's the difference between ARCAD-Transformer and ARCAD-CodeChecker'\n";

					this.sendAnswer(response);
				}
			} else {
				// 4. For all other questions, use the default configured URL as a fallback.
				const productConfig = vscode.workspace.getConfiguration('arcad-ai-assistant.product');
				const defaultUrl = productConfig.get<string>('contextUrl') ?? Constants.ARCAD_PRODUCTS_URL;
				await this.getAnswerForUrl(question, defaultUrl, this._abortController.signal);
			}
		} finally {
			// Ensure the controller is cleaned up once processing is complete.
			this._abortController = null;
			this._isProcessing = false;
		}
	}

	/**
	 * Wraps the Gemini API call with retry logic for transient errors like model overload.
	 */
	private async getAnswerForUrl(question: string, contextUrl: string, signal: AbortSignal): Promise<void> {
		if (!this._geminiConnector) {
			this.sendError("AI Assistant is not configured. Please check your API key and model name in the settings.");
			this.sendAnswerStop();
			return;
		}
	
		this.sendAnswerStart();
	
		const MAX_RETRIES = 3;
		const INITIAL_BACKOFF_MS = 1000;
	
		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				// 1. Fetch content from the primary URL. Pass the signal to allow cancellation.
				let { contextText, finalContextUrl } = await this._getContext(contextUrl, this._abortController!.signal);
	
				// 2. Get and stream the answer from the AI.
				const result = await this._geminiConnector.getStreamingAnswer(question, contextText, finalContextUrl);
				let text = '';
				for await (const chunk of result.stream) {
					if (this._abortController?.signal.aborted) {
						// Stop streaming if a cancellation is requested.
						break;
					}
					const chunkText = chunk.text();
					this.sendAnswer(chunkText);
					text += chunkText;
				}
	
				// 3. Check the final response reason.
				const fullResponse = await result.response;
				const finishReason = fullResponse.candidates?.[0]?.finishReason;
				if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
					this.sendError(`The AI stopped responding for the following reason: ${finishReason}. This could be due to safety settings or other limitations.`);
				}
	
				// Success, so stop retrying and exit.
				return;
			} catch (error: any) {
				console.error(`Attempt ${attempt} failed:`, error);
				const isOverloaded = error.message && (error.message.includes('503') || error.message.toLowerCase().includes('model is overloaded'));
	
				if (isOverloaded && attempt < MAX_RETRIES) {
					const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
					this.sendError(`The AI model is overloaded. Retrying in ${backoffTime / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
					await new Promise(resolve => setTimeout(resolve, backoffTime));
				} else {
					this._handleError(error);
					return; // Exit after handling the error.
				}
			} finally {
				this.sendAnswerStop(); // This will now correctly run after the final attempt or success.
			}
		}
	}

	/**
	 * Fetches and parses content from a URL, with a fallback to GitHub if the initial content is insufficient.
	 */
	private async _getContext(initialUrl: string, signal: AbortSignal): Promise<{ contextText: string, finalContextUrl: string }> {
		// 1. Try to fetch from the primary URL
		let contextText = await this._fetchAndParseUrl(initialUrl, signal, 'main');

		// 2. If content is insufficient, try the GitHub fallback URL
		if (contextText.length < Constants.CONTENT.MIN_LENGTH) {
			this.sendAnswer(`*Primary source had limited information. Fetching from ARCAD's GitHub for more context...*\n\n`);
			const fallbackText = await this._fetchAndParseUrl(Constants.URLS.GITHUB_FALLBACK, signal, '#org-repositories');
			return { contextText: fallbackText, finalContextUrl: Constants.URLS.GITHUB_FALLBACK };
		}

		return { contextText, finalContextUrl: initialUrl };
	}

	/**
	 * Fetches content from a URL and parses the text from a given selector.
	 */
	private async _fetchAndParseUrl(url: string, signal: AbortSignal, selector: string): Promise<string> {
		const { data } = await axios.get(url, { timeout: 10000, signal });
		const $ = cheerio.load(data);
		return $(selector).text().replace(/\s\s+/g, ' ').trim();
	}

	/**
	 * Centralized error handler to send messages to the webview.
	 */
	private _handleError(error: any) {
		if (axios.isCancel(error)) {
			this.sendError("I've paused our conversation as requested. Feel free to ask a new question!");
		} else if (axios.isAxiosError(error)) {
			if (error.code === 'ECONNABORTED') {
				this.sendError('I apologize, but I\'m having trouble accessing the latest product information. Please try your question again, or you can visit www.arcadsoftware.com directly.');
			} else {
				this.sendError(`I encountered a small hiccup while gathering information. Could you please rephrase your question or try again in a moment? Error details: ${error.message}`);
			}
		} else {
			let errorMessage = `I'm having some technical difficulties right now. Let me try to help you understand why: ${error.message}`;
			// Provide more user-friendly messages for common errors
			if (error.message && typeof error.message === 'string') {
				if (error.message.includes('API key not valid')) {
					errorMessage = 'I need a quick check of my settings. Could you please verify the Gemini API key in VS Code settings (`arcad-ai-assistant.gemini.apiKey`)? This helps me provide better assistance.';
				} else if (error.message.includes('429')) { // Too many requests
					errorMessage = 'I\'m processing quite a few requests at the moment. Could you give me a quick moment to catch up? I\'ll be ready to help you shortly!';
				} else if (error.message.includes('503') || error.message.toLowerCase().includes('model is overloaded')) {
					errorMessage = 'I\'m experiencing high demand right now. Please try your question again in a few moments, and I\'ll be happy to help you!';
				}
			}
			this.sendError(errorMessage);
		}
	}

	public sendAnswer(answer: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: 'addAnswer', value: answer });
		}
	}

	public sendAnswerStop() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'answerStop' });
		}
	}

	public sendError(error: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: 'addError', value: error });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return this._chatUI.getWebviewContent(webview);
	}
}