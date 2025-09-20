import * as vscode from 'vscode';
import { getNonce } from '../utils/getNonce';

export class ChatUI {
    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Generates the HTML for the chat interface
     */
    public getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'));
        const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

        const nonce = getNonce();

        const chatConfig = vscode.workspace.getConfiguration('arcad-ai-assistant.chat');
        const suggestions = chatConfig.get<string[]>('promptSuggestions') ?? [
            "How can ARCAD-Skipper help analyze my IBM i applications?",
            "What are ARCAD's DevOps solutions for IBM i?",
            "Compare ARCAD-Transformer RPG vs DB features",
            "How to integrate ARCAD products with Jenkins pipeline?",
            "Show me ARCAD's database modernization solutions",
            "What are the system requirements for ARCAD-Deliver?"
        ];

        const suggestionIcons = ['codicon-lightbulb', 'codicon-list-unordered', 'codicon-wand', 'codicon-question'];

        const suggestionButtonsHtml = suggestions.map((suggestion, index) => {
            // Cycle through the icons for visual variety
            const icon = suggestionIcons[index % suggestionIcons.length];
            // Basic HTML escaping to prevent issues with special characters in suggestions
            const escapedSuggestion = suggestion.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<button class="suggestion-button"><span class="codicon ${icon}"></span>${escapedSuggestion}</button>`;
        }).join('');

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <link href="${styleUri}" rel="stylesheet">
                <link href="${codiconUri}" rel="stylesheet">
                <title>ARCAD AI Assistant</title>

                <style nonce="${nonce}">
                    .prompt-suggestions {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 8px;
                        padding: 20px 16px;
                        border-bottom: 1px solid var(--vscode-editorWidget-border);
                    }

                    .suggestion-button {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: 1px solid var(--vscode-button-secondaryBorder, transparent);
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        text-align: left;
                        font-size: var(--vscode-font-size);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .suggestion-button .codicon {
                        font-size: 1.2em;
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    <div id="prompt-suggestions" class="prompt-suggestions">${suggestionButtonsHtml}</div>
                    <div id="message-history" class="message-history">
                        <!-- Messages will be populated by JavaScript -->
                    </div>
                    <div class="chat-input-container">
                        <textarea id="question-input" class="chat-input" placeholder="Ask about ARCAD products..."></textarea>
                        <button id="ask-button">Ask</button>
                        <button id="cancel-button" style="display: none;">Cancel</button>
                    </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}