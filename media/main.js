// @ts-ignore

// This script will be run within the webview itself
// It cannot import modules, but it can use the acquireVsCodeApi() method to
// get a vscode API object that allows it to communicate with the extension.
(function () {
    const vscode = acquireVsCodeApi();

    const chatContainer = document.getElementById('chat-container');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'addResponse':
                addResponse(message.value);
                break;
        }
    });

    function addResponse(response) {
        const p = document.createElement('p');
        p.textContent = response;
        chatContainer.appendChild(p);
    }

    if (sendButton && promptInput) {
        sendButton.addEventListener('click', () => {
            const prompt = promptInput.value;
            if (prompt) {
                // Add user's prompt to chat
                const p = document.createElement('p');
                p.textContent = "You: " + prompt;
                chatContainer.appendChild(p);

                // Send prompt to extension
                vscode.postMessage({
                    type: 'newPrompt',
                    value: prompt
                });
                promptInput.value = '';
            }
        });
    }
}());
