import * as vscode from 'vscode';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GeminiConnector } from './GeminiConnector';

const CONTEXT_MAX_LENGTH = 8000;
const ARCAD_PRODUCTS_URL = 'https://www.arcadsoftware.com/arcad/products/';

// A map of ARCAD products and their specific URLs
const ARCAD_PRODUCT_MAP: { [key: string]: string } = {
	"ARCAD-Skipper": "https://www.arcadsoftware.com/products/arcad-skipper/",
	"ARCAD-Verifier": "https://www.arcadsoftware.com/products/arcad-verifier/",
	"ARCAD-Transformer": "https://www.arcadsoftware.com/products/arcad-transformer/",
	"ARCAD-Listener": "https://www.arcadsoftware.com/products/arcad-listener/",
	"ARCAD-Observer": "https://www.arcadsoftware.com/products/arcad-observer/",
	"DROPS": "https://www.arcadsoftware.com/products/drops-devops/",
};

export class ChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'arcad-ai-assistant.chatView';

	private _view?: vscode.WebviewView;
	private _geminiConnector?: GeminiConnector;
	private _disposables: vscode.Disposable[] = [];

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
		// 1. Check if the question explicitly mentions a known product.
		const productKeys = Object.keys(ARCAD_PRODUCT_MAP);
		const mentionedProduct = productKeys.find(key => question.toLowerCase().includes(key.toLowerCase()));

		if (mentionedProduct) {
			const productUrl = ARCAD_PRODUCT_MAP[mentionedProduct];
			await this.getAnswerForUrl(question, productUrl);
			return;
		}

		// 2. If no specific product is mentioned, check for generic terms to trigger the Quick Pick.
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
				await this.getAnswerForUrl(specificQuestion, productUrl);
			}
		} else {
			// 3. For all other questions, use the default configured URL as a fallback.
			const productConfig = vscode.workspace.getConfiguration('arcad-ai-assistant.product');
			const defaultUrl = productConfig.get<string>('contextUrl') || ARCAD_PRODUCTS_URL;
			await this.getAnswerForUrl(question, defaultUrl);
		}
	}

	private async getAnswerForUrl(question: string, contextUrl: string): Promise<void> {
		if (!this._geminiConnector) {
			this.sendError("AI Assistant is not configured. Please check your API key and model name in the settings.");
			return;
		}

		this.sendAnswerStart();

		try {
			const { data } = await axios.get(contextUrl, { timeout: 10000 });
			const $ = cheerio.load(data);
			const contextText = $('main').text().replace(/\s\s+/g, ' ').trim();

			const result = await this._geminiConnector.getStreamingAnswer(question, contextText, contextUrl);
			let text = '';
			for await (const chunk of result.stream) {
				const chunkText = chunk.text();
				this.sendAnswer(chunkText);
				text += chunkText;
			}

			const fullResponse = await result.response;
			const finishReason = fullResponse.candidates?.[0]?.finishReason;
			if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
				this.sendError(`The AI stopped responding for the following reason: ${finishReason}. This could be due to safety settings or other limitations.`);
			}

		} catch (error: any) {
			console.error(error);
			if (axios.isAxiosError(error)) {
				if (error.code === 'ECONNABORTED') {
					this.sendError('Sorry, the request to fetch web content timed out after 10 seconds. The website may be slow or unavailable. Please try again later.');
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
					}
				}
				this.sendError(errorMessage);
			}
		}
	}

	public sendAnswer(answer: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: 'addAnswer', value: answer });
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