import * as vscode from 'vscode';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

export class ChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'arcad-ai-assistant.chatView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

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

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case 'addQuestion':
					this.getWebpageAndAnswer(data.value);
					break;
			}
		});
	}

	private async getWebpageAndAnswer(question: string) {
		const apiKey = vscode.workspace.getConfiguration('arcad-ai-assistant.openai').get('apiKey') as string;
		if (!apiKey) {
			this.sendError("OpenAI API key not set. Please set it in the VS Code settings (`arcad-ai-assistant.openai.apiKey`).");
			return;
		}

		const openai = new OpenAI({ apiKey });

		try {
			// 1. Fetch web content
			const url = 'https://www.arcadsoftware.com/arcad/products/';
			const { data } = await axios.get(url);
			const $ = cheerio.load(data);
			// Extract text from the main content area to provide context
			const contextText = $('main').text().replace(/\s\s+/g, ' ').trim();

			// 2. Construct the prompt for the AI
			const prompt = `
				Based on the following context about ARCAD Software's products, please answer the user's question.
				The context is from ${url}.

				Context:
				---
				${contextText.substring(0, 8000)}
				---

				Question: "${question}"

				Answer:
			`;

			// 3. Call the OpenAI API
			const stream = await openai.chat.completions.create({
				messages: [{ role: 'user', content: prompt }],
				model: 'gpt-3.5-turbo',
				stream: true,
			});

			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || '';
				// Stream the content to the webview
				this.sendAnswer(content);
			}
		} catch (error: any) {
			console.error(error);
			this.sendError(`Sorry, an error occurred: ${error.message}`);
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
						<div class="message assistant-message">
							Hello! I'm the ARCAD AI Assistant. How can I help you today?
						</div>
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