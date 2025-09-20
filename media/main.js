// @ts-ignore
const vscode = acquireVsCodeApi();

const messageHistory = document.getElementById("message-history");
const questionInput = document.getElementById("question-input");
const askButton = document.getElementById("ask-button");
const promptSuggestions = document.getElementById("prompt-suggestions");

function askQuestion(questionText) {
	const question = (questionText || questionInput.value).trim();
	if (question) {
		vscode.postMessage({
			type: "addQuestion",
			value: question,
		});

		addMessage(question, "user");
		questionInput.value = "";
	}
}

askButton.addEventListener("click", () => askQuestion());
questionInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		askQuestion();
	}
});

if (promptSuggestions) {
	promptSuggestions.addEventListener("click", (event) => {
		const target = event.target;
		if (target.classList.contains("suggestion-button")) {
			askQuestion(target.textContent);
		}
	});
}

window.addEventListener('message', event => {
    const message = event.data; 

    switch (message.type) {
        case 'clearChat': {
            messageHistory.innerHTML = '';
            if (promptSuggestions) {
                promptSuggestions.style.display = 'flex';
            }
            break;
        }
        case 'updateStatus': {
            messageHistory.innerHTML = '';
            addMessage(message.text, 'assistant', false, !message.isConnected);
            const isConnected = message.isConnected;
            questionInput.disabled = !isConnected;
            askButton.disabled = !isConnected;
            if (isConnected) {
                questionInput.placeholder = 'Ask about ARCAD products...';
            } else {
                questionInput.placeholder = 'AI Assistant not ready. Check settings.';
            }
            break;
        }
        case 'answerStart':
            if (promptSuggestions) {
                promptSuggestions.style.display = 'none';
            }
            addMessage('...', 'assistant', true);
            break;
        case 'addAnswer': {
            let lastMessage = messageHistory.lastElementChild;
            const thinking = document.querySelector('.assistant-message.thinking');
            if (thinking) {
                lastMessage = thinking;
                lastMessage.classList.remove('thinking');
                lastMessage.textContent = ''; // Clear "..."
            }
            if (!lastMessage || !lastMessage.classList.contains('assistant-message') || lastMessage.classList.contains('error-message')) {
                addMessage('', 'assistant');
                lastMessage = messageHistory.lastElementChild;
            }
            if (!lastMessage.dataset.rawText) {
                lastMessage.dataset.rawText = '';
            }
            lastMessage.dataset.rawText += message.value;
            lastMessage.innerHTML = lastMessage.dataset.rawText
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/\n/g, '<br>');
            messageHistory.scrollTop = messageHistory.scrollHeight;
            break;
        }
        case 'addError':
            const thinking = document.querySelector('.assistant-message.thinking');
            if (thinking) {
                thinking.remove();
            }
            addMessage(message.value, 'assistant', false, true); // isError = true
            break;
    }
});

function addMessage(text, type, isThinking = false, isError = false) {
    const messageElement = document.createElement('div');
    if (promptSuggestions && messageHistory.children.length > 0) {
		promptSuggestions.style.display = "none";
	}
    messageElement.className = `message ${type}-message`;
    if (isThinking) {
        messageElement.classList.add('thinking');
    }
    if (isError) {
        messageElement.classList.add('error-message');
    }
    messageElement.textContent = text;
    messageHistory.appendChild(messageElement);
    messageHistory.scrollTop = messageHistory.scrollHeight;
}