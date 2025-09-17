import * as vscode from 'vscode';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GeminiConnector } from './GeminiConnector';

const ARCAD_PRODUCTS_URL = 'https://www.arcadsoftware.com/arcad/products/';
const GITHUB_FALLBACK_URL = 'https://github.com/ARCAD-Software';
const MIN_CONTENT_LENGTH = 200; // The minimum number of characters to consider the content sufficient.

const ARCAD_PRODUCT_MAP: { [key: string]: string } = {
  "ARCAD-Skipper": "https://www.arcadsoftware.com/products/arcad-skipper/",  
  "ARCAD-Verifier": "https://www.arcadsoftware.com/products/arcad-verifier/",  
  "ARCAD-Transformer": "https://www.arcadsoftware.com/products/arcad-transformer/",  
  "ARCAD-Listener": "https://www.arcadsoftware.com/products/arcad-listener/",  
  "ARCAD-Observer": "https://www.arcadsoftware.com/products/arcad-observer/",  
  "DROPS": "https://www.arcadsoftware.com/products/drops-devops/",  
  "ARCAD-CodeChecker": "https://www.arcadsoftware.com/products/arcad-codechecker/",  
  "ARCAD-API": "https://www.arcadsoftware.com/products/arcad-api/",  
  "ARCAD-Builder": "https://www.arcadsoftware.com/products/arcad-builder/",  
  "ARCAD-Deliver": "https://www.arcadsoftware.com/products/arcad-deliver/",  
  "ARCAD-Jira": "https://www.arcadsoftware.com/products/arcad-jira/",  
  "ARCAD-Testing": "https://www.arcadsoftware.com/products/arcad-testing/",

  // Additional / newer products & tools
  "ARCAD Discover": "https://www.arcadsoftware.com/arcad/products/arcad-discover/",  
  "ARCAD Audit": "https://www.arcadsoftware.com/arcad/products/arcad-audit/",
  "ARCAD Dashboards": "https://www.arcadsoftware.com/arcad/products/arcad-dashboards/",  
  "ARCAD iUnit": "https://www.arcadsoftware.com/arcad/products/arcad-iunit-ibm-i-unit-testing/",  
  "ARCAD Transformer DB": "https://www.arcadsoftware.com/arcad/products/arcad-transformer-db-database-modernization/",  
  "ARCAD Transformer RPG": "https://www.arcadsoftware.com/arcad/products/arcad-transformer-rpg-free-format-rpg-conversion/",  
  "ARCAD Transformer Microservices": "https://www.arcadsoftware.com/arcad/products/arcad-transformer-microservices-rpg-refactoring-and-web-service-creation/",  
  "ARCAD Transformer Field": "https://www.arcadsoftware.com/arcad/products/arcad-transformer-field-change-field-sizes-and-types/",  
  "ARCAD Transformer Synon": "https://www.arcadsoftware.com/arcad/products/arcad-transformer-synon-conversion/",  
  "DOT Anonymizer": "https://www.arcadsoftware.com/dot/data-masking/dot-anonymizer/",  
  "ARCAD Migration Kit": "https://www.arcadsoftware.com/arcad/products/arcad-migration-kit-migrate-to-a-modern-devops-environment/",  

  // Optional / non-product special tools or pages
  "Careers": "https://www.arcadsoftware.com/about/job-offers/",
  "DOT": "https://www.arcadsoftware.com/dot/data-masking/dot-anonymizer/"
};

export class ChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'arcad-ai-assistant.chatView';

	private _view?: vscode.WebviewView;
	private _geminiConnector?: GeminiConnector;
	private _disposables: vscode.Disposable[] = [];
	private _abortController: AbortController | null = null;
	private _isProcessing: boolean = false;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) {
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
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
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
				text = "Hello! I'm the ARCAD AI Assistant. How can I help you today?";
				isConnected = true;
			}
			this._view.webview.postMessage({
				type: 'updateStatus',
				isConnected: isConnected,
				text: text
			});
		}
	}

	public sendAnswerStart() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'answerStart' });
		}
	}

	/**
	 * Handles an incoming question from the user.
	 * It decides whether to ask for product clarification or answer directly.
	 * @param question The user's question.
	 */
	private async handleQuestion(question: string): Promise<void> {
		if (this._isProcessing) {
			this.sendError("Please wait, your previous question is still being processed.");
			return;
		}

		this._isProcessing = true;
		this._abortController = new AbortController();
		try {
			const productKeys = Object.keys(ARCAD_PRODUCT_MAP);
			const mentionedProduct = productKeys.find(key => question.toLowerCase().includes(key.toLowerCase()));

			if (mentionedProduct) {
				const productUrl = ARCAD_PRODUCT_MAP[mentionedProduct];
				await this.getAnswerForUrl(question, productUrl, this._abortController.signal);
				return;
			}
			const genericTerms = ['product', 'products', 'list', 'all', 'what do you offer'];
			const isGeneric = genericTerms.some(term => question.toLowerCase().includes(term));

			if (isGeneric) {
				const selectedProduct = await vscode.window.showQuickPick(productKeys, {
					placeHolder: "Which ARCAD product are you interested in?",
					title: "Select a Product"
				});

				if (selectedProduct) {
					const productUrl = ARCAD_PRODUCT_MAP[selectedProduct];
					const specificQuestion = `Please provide a detailed summary of the ARCAD product: ${selectedProduct}.`;
					await this.getAnswerForUrl(specificQuestion, productUrl, this._abortController.signal);
				}
			} else {
				const productConfig = vscode.workspace.getConfiguration('arcad-ai-assistant.product');
				const defaultUrl = productConfig.get<string>('contextUrl') ?? ARCAD_PRODUCTS_URL;
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
		if (contextText.length < MIN_CONTENT_LENGTH) {
			this.sendAnswer(`*Primary source had limited information. Fetching from ARCAD's GitHub for more context...*\n\n`);
			const fallbackText = await this._fetchAndParseUrl(GITHUB_FALLBACK_URL, signal, '#org-repositories');
			return { contextText: fallbackText, finalContextUrl: GITHUB_FALLBACK_URL };
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
			this.sendError("Request cancelled.");
		} else if (axios.isAxiosError(error)) {
			if (error.code === 'ECONNABORTED') {
				this.sendError('Sorry, the request to fetch web content timed out. The website may be slow or unavailable.');
			} else {
				this.sendError(`Sorry, an error occurred while fetching web content: ${error.message}`);
			}
		} else {
			let errorMessage = `Sorry, an error occurred with the Gemini API: ${error.message}`;
			// Provide more user-friendly messages for common errors
			if (error.message && typeof error.message === 'string') {
				if (error.message.includes('API key not valid')) {
					errorMessage = 'Your Gemini API key is not valid. Please check it in the VS Code settings (`arcad-ai-assistant.gemini.apiKey`) and ensure it is correct.';
				} else if (error.message.includes('429')) { // Too many requests
					errorMessage = 'You have sent too many requests to the Gemini API recently. Please wait a moment and try again.';
				} else if (error.message.includes('503') || error.message.toLowerCase().includes('model is overloaded')) {
					errorMessage = 'The AI model is currently overloaded and could not process your request. Please try again in a few moments.';
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
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>ARCAD AI Assistant</title>
			</head>
			<body>
				<div class="chat-container">
					<div id="message-history" class="message-history">
						<!-- Messages will be populated by JavaScript -->
					</div>
					<div class="chat-input-container">
						<textarea id="question-input" class="chat-input" placeholder="Ask about ARCAD products..."></textarea>
						<button id="ask-button">Ask</button>
						<!-- 
							To add a cancel button, you could add the following HTML.
							The main.js script would need to be updated to show/hide it and send the 'cancelRequest' message.
							<button id="cancel-button" style="display: none;">Cancel</button>
						-->
					</div>
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}