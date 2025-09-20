interface TimeSpecificResponses {
    morning: string[];
    afternoon: string[];
    evening: string[];
}

export interface ResponseTemplates {
    greeting: string[];
    timeSpecific: TimeSpecificResponses;
    howAreYou: string[];
    whatCanYouDo: string[];
    gratitude: string[];
}

export const responseTemplates: ResponseTemplates = {
    greeting: [
        '👋 Hello! I\'m your ARCAD AI Assistant. I specialize in IBM i modernization and DevOps solutions. How can I help you today?',
        'Hi there! I\'m here to help you with ARCAD Software solutions. What would you like to know?',
        'Hello! 👋 I\'m ready to assist you with any questions about our IBM i modernization tools.'
    ],
    timeSpecific: {
        morning: [
            'Good morning! ☀️ I\'m your ARCAD AI Assistant, ready to help you discover our solutions.',
            'Good morning! Hope your day is going well. I\'m here to assist you with any questions.',
            'Good morning! ☀️ Let me help you explore our IBM i modernization tools.'
        ],
        afternoon: [
            'Good afternoon! 🌤️ I\'m your ARCAD AI Assistant, here to help with any questions.',
            'Good afternoon! Ready to assist you with ARCAD\'s solutions.',
            'Good afternoon! 🌤️ Let\'s explore how ARCAD Software can help you.'
        ],
        evening: [
            'Good evening! 🌙 I\'m your ARCAD AI Assistant, ready to help you.',
            'Good evening! Let me assist you with ARCAD\'s solutions.',
            'Good evening! 🌙 How can I help you today?'
        ]
    },
    howAreYou: [
        'I\'m doing great, thank you! 😊 How can I help you today?',
        'I\'m excellent and ready to assist you! What would you like to know?',
        'I\'m working perfectly! How can I help you with ARCAD\'s solutions?'
    ],
    whatCanYouDo: [
        'I can help you understand ARCAD Software\'s solutions for IBM i modernization and DevOps. What specific area interests you?',
        'I\'m knowledgeable about all ARCAD products and can help you find the right solution for your needs. What would you like to know?',
        'I can assist with questions about our IBM i modernization tools, DevOps solutions, and more. What are you looking to learn about?'
    ],
    gratitude: [
        'You\'re welcome! 😊 Let me know if you have any other questions.',
        'Happy to help! Is there anything else you\'d like to know?',
        'My pleasure! Feel free to ask if you need more information.'
    ]
};