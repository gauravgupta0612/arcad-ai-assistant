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
    }
}

window.addEventListener('message', event => {
    const message = event.data; 

    switch (message.type) {
        case 'updateStatus': {
            messageHistory.innerHTML = '';
            addMessage(message.text, 'assistant');
            const isConnected = message.isConnected;
            questionInput.disabled = !isConnected;
            askButton.disabled = !isConnected;
            if (isConnected) {
                questionInput.placeholder = 'Ask about ARCAD products...';
            } else {
                questionInput.placeholder = 'Please set your Gemini API key in settings.';
            }
            break;
        }
        case 'answerStart':
            addMessage('...', 'assistant', true);
            break;
        case 'addAnswer': {
            const thinking = document.querySelector('.assistant-message.thinking');
            if (thinking) {
                // First chunk, replace the "thinking" text
                thinking.textContent = message.value;
                thinking.classList.remove('thinking');
            } else {
                // Subsequent chunks, or a new message.
                const messages = document.querySelectorAll('.assistant-message');
                const lastMessage = messageHistory.lastElementChild;

                // If the last message was from the user, or if there are no messages, create a new assistant message.
                if (!lastMessage || lastMessage.classList.contains('user-message')) {
                    addMessage(message.value, 'assistant');
                } else {
                    // Otherwise, append to the last message (for streaming).
                    lastMessage.textContent += message.value;
                }
            }
            break;
        }
        case 'addError':
            const thinking = document.querySelector('.assistant-message.thinking');
            if (thinking) {
                thinking.remove();
            }
            addMessage(message.value, 'assistant', false, true);
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