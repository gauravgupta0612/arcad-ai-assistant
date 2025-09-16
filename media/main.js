// @ts-ignore
const vscode = acquireVsCodeApi();

const messageHistory = document.getElementById('message-history');
const questionInput = document.getElementById('question-input');
const askButton = document.getElementById('ask-button');

askButton.addEventListener('click', handleSendQuestion);
questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendQuestion();
    }
});

function handleSendQuestion() {
    const question = questionInput.value.trim();
    if (question) {
        vscode.postMessage({
            type: 'addQuestion',
            value: question
        });

        addMessage(question, 'user');
        questionInput.value = '';
        
        // Show a "thinking" message
        addMessage('...', 'assistant', true);
    }
}

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent

    switch (message.type) {
        case 'addAnswer': {
            const thinking = document.querySelector('.assistant-message.thinking');
            if (thinking) {
                // First chunk, replace the "thinking" text
                thinking.textContent = message.value;
                thinking.classList.remove('thinking');
            } else {
                // Subsequent chunks, append to the last assistant message
                const messages = document.querySelectorAll('.assistant-message');
                const lastMessage = messages[messages.length - 1];
                lastMessage.textContent += message.value;
            }
            break;
        }
        case 'addError':
            const thinkingError = document.querySelector('.thinking');
            if (thinkingError) {
                thinkingError.remove();
            }
            addMessage(message.value, 'assistant');
            break;
    }
});

function addMessage(text, type, isThinking = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;
    if (isThinking) {
        messageElement.classList.add('thinking');
    }
    messageElement.textContent = text;
    messageHistory.appendChild(messageElement);
    messageHistory.scrollTop = messageHistory.scrollHeight;
}