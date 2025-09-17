import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel, GenerateContentResult, GenerateContentStreamResult } from '@google/generative-ai';

const CONTEXT_MAX_LENGTH = 8000;

/**
 * A connector class to handle all interactions with the Google Gemini API.
 */
export class GeminiConnector {
    private _model: GenerativeModel;

    constructor(apiKey: string, modelName: string) {
        if (!apiKey || !modelName) {
            throw new Error("API Key and Model Name are required for GeminiConnector.");
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        this._model = genAI.getGenerativeModel({
            model: modelName,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });
    }

    /**
     * Generates a streaming answer from the Gemini API based on a question and context.
     * @param question The user's question.
     * @param contextText The text content scraped from the webpage.
     * @param contextUrl The URL the context was scraped from.
     * @returns A promise that resolves to a GenerateContentStreamResult.
     */
    public async getStreamingAnswer(question: string, contextText: string, contextUrl: string): Promise<GenerateContentStreamResult> {
        const chatHistory = [
            {
                role: "user",
                parts: [{ text: `Based on the following context about ARCAD Software's products, please answer my question. The context is from ${contextUrl}.\n\nContext:\n---\n${contextText.substring(0, CONTEXT_MAX_LENGTH)}\n---\n\nQuestion: "${question}"` }]
            },
            { role: "model", parts: [{ text: "Answer:" }] }
        ];

        return this._model.generateContentStream({ contents: chatHistory });
    }
}