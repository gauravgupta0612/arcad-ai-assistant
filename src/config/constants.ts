export enum QuestionType {
  ProductSpecific = 'product-specific',
  Technical = 'technical',
  Integration = 'integration',
  General = 'general',
  Language = 'language'
}

export enum WebviewMessageType {
  AddQuestion = 'addQuestion',
  CancelRequest = 'cancelRequest',
  UpdateStatus = 'updateStatus',
  ClearChat = 'clearChat',
  AnswerStart = 'answerStart',
  AddAnswer = 'addAnswer',
  AnswerStop = 'answerStop',
  AddError = 'addError'
}

export const URLS = {
  PRODUCTS: 'https://www.arcadsoftware.com/arcad/products/',
  GITHUB: 'https://github.com/ARCAD-Software',
  GITHUB_FALLBACK: 'https://github.com/ARCAD-Software'
} as const;

export const CONTENT = {
  MIN_LENGTH: 200,
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  TIMEOUT_MS: 10000
} as const;

export const TECHNICAL_TERMS = [
  'how to', 'implement', 'configure', 'setup', 'install', 'deploy',
  'documentation', 'guide', 'tutorial', 'example', 'requirement'
] as const;

export const INTEGRATION_TERMS = [
  'integrate', 'connection', 'workflow', 'pipeline', 'devops',
  'jenkins', 'github', 'gitlab', 'ci/cd', 'automation'
] as const;

export const PRODUCT_QUERY_TERMS = [
  'product',
  'what is',
  'tell me about',
  'how many',
  'list',
  'show me'
] as const;

export const PRODUCT_LIST_TERMS = [
  'list products',
  'show products',
  'what products',
  'which products'
] as const;

export const PRODUCT_COMPARISON_TERMS = [
  'compare',
  'difference between',
  'vs',
  'versus'
] as const;

export const SIMPLE_GREETINGS = [
  'hi', 'hey', 'hello', 'yo', 'hola', 'greetings', 'howdy', 'hai'
] as const;