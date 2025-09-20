export type WebviewMessageType = 'addAnswer' | 'addError' | 'answerStart' | 'answerStop' | 'clearChat' | 'updateStatus' | 'addQuestion' | 'cancelRequest';

export interface WebviewMessage {
    type: WebviewMessageType;
    value?: string;
    isConnected?: boolean;
    text?: string;
}