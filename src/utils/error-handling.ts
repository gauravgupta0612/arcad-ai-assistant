import { AxiosError } from 'axios';

export class ArcadError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ArcadError';
  }

  static fromError(error: unknown): ArcadError {
    if (error instanceof ArcadError) {
      return error;
    }

    if (error instanceof Error) {
      return new ArcadError(error.message, undefined, error);
    }

    return new ArcadError('An unknown error occurred');
  }
}

export class NetworkError extends ArcadError {
  constructor(message: string, originalError?: AxiosError) {
    super(message, originalError?.code, originalError);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends ArcadError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class AIModelError extends ArcadError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'AIModelError';
  }
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const arcadError = ArcadError.fromError(error);

  if (arcadError instanceof NetworkError) {
    if (arcadError.code === 'ECONNABORTED') {
      return 'I apologize, but I\'m having trouble accessing the latest product information. Please try your question again, or you can visit www.arcadsoftware.com directly.';
    }
    return 'I encountered a connection issue. Could you please try your question again in a moment?';
  }

  if (arcadError instanceof ConfigurationError) {
    return 'I need a quick check of my settings. Could you please verify the Gemini API key in VS Code settings?';
  }

  if (arcadError instanceof AIModelError) {
    if (arcadError.code === '429') {
      return 'I\'m processing quite a few requests at the moment. Could you give me a quick moment to catch up?';
    }
    if (arcadError.code === '503') {
      return 'I\'m experiencing high demand right now. Please try your question again in a few moments.';
    }
  }

  return 'I encountered an unexpected issue. Let me try to resolve it and get back to you.';
}