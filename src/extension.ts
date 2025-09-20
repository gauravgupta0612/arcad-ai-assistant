import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {

	const provider = new ChatViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('arcad-ai-assistant.newChat', () => {
			provider.clearChat();
		})
	);
}

export function deactivate() {}
