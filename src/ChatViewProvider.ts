import * as vscode from 'vscode';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const CONTEXT_MAX_LENGTH = 8000;
const ARCAD_PRODUCTS_URL = 'https://www.arcadsoftware.com/arcad/products/';

export class ChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'arcad-ai-assistant.chatView';

	private _view?: vscode.WebviewView;
	private _generativeAI?: GoogleGenerativeAI;
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

		if (!apiKey) {
			this._generativeAI = undefined;
			return;
		}

		this._generativeAI = new GoogleGenerativeAI(apiKey);
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
					this.getWebpageAndAnswer(data.value);
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

	private async getWebpageAndAnswer(question: string): Promise<void> {
		const config = vscode.workspace.getConfiguration('arcad-ai-assistant.gemini');
		const modelName = config.get('modelName') as string;

		if (!this._generativeAI) {
			this.sendError("Gemini API key not set. Please set it in the VS Code settings (`arcad-ai-assistant.gemini.apiKey`).");
			return;
		}
		if (!modelName) {
			this.sendError("Gemini model name is not set in VS Code settings (`arcad-ai-assistant.gemini.modelName`).");
			return;
		}

		this.sendAnswerStart();

		try {
			const { data } = await axios.get(ARCAD_PRODUCTS_URL, { timeout: 5000 });
			const $ = cheerio.load(data);
			// Extract text from the main content area to provide context
			const contextText = $('main').text().replace(/\s\s+/g, ' ').trim();

			// 2. Construct the prompt for the AI
			const prompt = `
				Based on the following context about ARCAD Software's products, please answer the user's question.
				The context is from ${ARCAD_PRODUCTS_URL}.

				Context:
				---
				${contextText.substring(0, CONTEXT_MAX_LENGTH)}
				---

				Question: "${question}"

				Answer:
			`;

			// 3. Call the Gemini API
			const model = this._generativeAI.getGenerativeModel({
				model: modelName,
				safetySettings: [
					{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
				]
			 });

			const result = await model.generateContentStream(prompt);
			let text = '';
			for await (const chunk of result.stream) {
				const chunkText = chunk.text();
				this.sendAnswer(chunkText);
				text += chunkText;
			}

		} catch (error: any) {
			console.error(error);
			if (axios.isAxiosError(error)) {
				this.sendError(`Sorry, an error occurred while fetching web content: ${error.message}`);
			} else {
				this.sendError(`Sorry, an error occurred with the Gemini API: ${error.message}`);
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
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
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