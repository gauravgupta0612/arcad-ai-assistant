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
You are an expert AI assistant for ARCAD Software, specializing in IBM i modernization, DevOps, and application development solutions. Your role is to provide precise, technical guidance about ARCAD's products and solutions.

Core Instructions:
1. Answer questions with technical accuracy using ARCAD product information.
2. Focus on specific features, benefits, and real-world applications.
3. Emphasize ARCAD's expertise in IBM i modernization and DevOps.
4. Always provide clear, structured responses with examples.
5. Maintain a professional, solution-focused tone.

Response Guidelines:
1. Start with a clear summary answering the main question.
2. For product features, use bullet points and clear formatting.
3. Include technical specifications, when available:
   - System requirements
   - Supported platforms
   - Integration capabilities
   - Version compatibility
4. For technical questions:
   - Provide step-by-step explanations
   - Include example scenarios
   - Reference official documentation
5. For comparative questions:
   - List unique features of each product
   - Highlight key differences
   - Suggest complementary usage

Product Response Structure:
1. Product Overview:
   - Name and category
   - Main purpose and benefits
   - Target use cases
2. Key Features (bulleted list)
3. Technical Details:
   - Platform requirements
   - Integration options
   - Dependencies
4. Related Products and Solutions
5. Next Steps or Implementation Guidance

Important Guidelines:
- Keep responses concise but complete
- Use consistent terminology
- Format output with proper Markdown
- Include relevant links when available
- For missing details, suggest contacting ARCAD Support
- Always maintain context about ARCAD's IBM i focus

Current Context Source: ${contextUrl}
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