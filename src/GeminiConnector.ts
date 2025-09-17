import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel, GenerateContentStreamResult, SafetySetting, Content } from '@google/generative-ai';

/**
 * A connector class to handle all interactions with the Google Gemini API.
 */
export class GeminiConnector {
    private static readonly CONTEXT_MAX_LENGTH = 8000;
    private static readonly SAFETY_SETTINGS: SafetySetting[] = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    private _model: GenerativeModel;

    constructor(apiKey: string, modelName: string) {
        if (!apiKey || !modelName) {
            throw new Error("API Key and Model Name are required for GeminiConnector.");
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        this._model = genAI.getGenerativeModel({
            model: modelName,
            safetySettings: GeminiConnector.SAFETY_SETTINGS
        });
    }

    /**
     * Builds the prompt string for the Gemini API.
     * @param question The user's question.
     * @param contextText The text content scraped from the webpage.
     * @param contextUrl The URL the context was scraped from.
     * @returns The formatted prompt string.
     */
    private _buildPrompt(question: string, contextText: string, contextUrl: string): string {
        const truncatedContext = contextText.substring(0, GeminiConnector.CONTEXT_MAX_LENGTH);
        return `
You are an expert assistant for ARCAD Software products. Your main goal is to answer the user's question based on the provided context.

Here are your instructions:
1.  Carefully read the user's question and the context below. The context is from ${contextUrl}.
2.  Provide a clear, concise, and helpful answer to the question using only the information from the context.
3.  If the context does not contain an answer, state that you couldn't find the information in the provided source. Do not make up information.
4.  After your main answer, check if the context contains any GitHub URLs.
5.  If you find one or more GitHub URLs, add a "## Further Reading" section at the end and list them in markdown format (e.g., "Link Text"). If no GitHub links are present, do not add this section.

Context:
---
${truncatedContext}
---

Question: "${question}"
`;
    }

    /**
     * Generates a streaming answer from the Gemini API based on a question and context.
     * @param question The user's question.
     * @param contextText The text content scraped from the webpage.
     * @param contextUrl The URL the context was scraped from.
     * @returns A promise that resolves to a GenerateContentStreamResult.
     */
    public async getStreamingAnswer(question: string, contextText: string, contextUrl: string): Promise<GenerateContentStreamResult> {
        const prompt = this._buildPrompt(question, contextText, contextUrl);

        const contents: Content[] = [
            {
                role: "user",
                parts: [{ text: prompt }]
            },
            { role: "model", parts: [{ text: "Answer:" }] }
        ];

        return this._model.generateContentStream({ contents });
    }
}