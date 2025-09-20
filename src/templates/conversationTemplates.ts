export interface ConversationTemplates {
    greeting: string[];
    timeSpecific: {
        morning: string[];
        afternoon: string[];
        evening: string[];
    };
    howAreYou: string[];
    whatCanYouDo: string[];
    gratitude: string[];
}

export const conversationTemplates: ConversationTemplates = {
    greeting: [
        '👋 Hello! I\'m your ARCAD AI Assistant. I specialize in IBM i modernization and DevOps solutions. How can I help you today?',
        'Hi there! I\'m the ARCAD AI Assistant, ready to help you explore our software solutions. What would you like to know?',
        'Hello! 👋 I\'m here to assist you with ARCAD Software solutions. What can I tell you about our IBM i modernization tools?'
    ],
    timeSpecific: {
        morning: [
            'Good morning! ☀️ I\'m your ARCAD AI Assistant, ready to help you discover our IBM i modernization solutions.',
            'Good morning! Hope your day is going well. I\'m here to assist you with any questions about ARCAD Software.',
            'Good morning! ☀️ Let me help you explore our DevOps and modernization tools for IBM i.'
        ],
        afternoon: [
            'Good afternoon! 🌤️ I\'m your ARCAD AI Assistant, here to help with any questions about our solutions.',
            'Good afternoon! Ready to assist you with ARCAD\'s IBM i modernization and DevOps tools.',
            'Good afternoon! 🌤️ Let\'s explore how ARCAD Software can help with your modernization needs.'
        ],
        evening: [
            'Good evening! 🌙 I\'m your ARCAD AI Assistant, ready to help you discover our solutions.',
            'Good evening! Let me assist you with any questions about ARCAD\'s modernization tools.',
            'Good evening! 🌙 How can I help you with your IBM i modernization journey today?'
        ]
    },
    howAreYou: [
        'I\'m doing great, thank you! 😊 I\'m ready to help you learn about ARCAD\'s solutions for IBM i modernization and DevOps. What would you like to know?',
        'I\'m excellent and fully prepared to assist you! Would you like to explore our software solutions or learn about specific products?',
        'I\'m working perfectly and excited to help you! Shall we discuss how ARCAD\'s tools can support your modernization needs?'
    ],
    whatCanYouDo: [
        'I\'m specialized in helping you with ARCAD Software solutions! I can:\n• Explain our IBM i modernization tools\n• Provide product details and comparisons\n• Share technical information and best practices\n• Guide you through our DevOps solutions\n\nWhat would you like to explore?',
        'I\'m your guide to ARCAD Software! I can help you:\n• Understand our product features\n• Compare different solutions\n• Learn about implementation approaches\n• Discover modernization strategies\n\nWhat interests you most?'
    ],
    gratitude: [
        'You\'re welcome! 😊 Don\'t hesitate to ask if you need any more information about ARCAD\'s solutions.',
        'My pleasure! I\'m always here to help you learn more about our IBM i modernization and DevOps tools.',
        'Glad I could help! Feel free to ask any other questions about ARCAD Software products.'
    ]
};