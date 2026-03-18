/**
 * AI Provider Abstraction
 *
 * Supports three providers via AI_PROVIDER env var:
 * - "anthropic" (default) — Anthropic Claude SDK
 * - "openai" — OpenAI SDK (GPT-4o, etc.)
 * - "ollama" — Local Ollama API for fully local/private operation
 */

export type AIProvider = 'anthropic' | 'openai' | 'ollama';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  maxTokens: number;
  messages: AIMessage[];
}

export interface AIResponse {
  text: string;
}

function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'openai' || provider === 'ollama') return provider;
  return 'anthropic';
}

async function callAnthropic(options: AIRequestOptions): Promise<AIResponse> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. Add it in your deployment dashboard under Settings → Environment Variables.'
    );
  }
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens,
    messages: options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('\n');

  return { text };
}

async function callOpenAI(options: AIRequestOptions): Promise<AIResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let openaiModule: any;
  try {
    // Dynamic require with variable to prevent webpack from resolving at build time
    const moduleName = 'openai';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    openaiModule = require(moduleName);
  } catch {
    throw new Error(
      'OpenAI SDK not installed. Run: npm install openai'
    );
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set.'
    );
  }
  const OpenAI = openaiModule.default || openaiModule;
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: options.model || 'gpt-4o',
    max_tokens: options.maxTokens,
    messages: options.messages.map((m: AIMessage) => ({ role: m.role, content: m.content })),
  });

  const text = response.choices[0]?.message?.content || '';
  return { text };
}

async function callOllama(options: AIRequestOptions): Promise<AIResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = options.model || process.env.OLLAMA_MODEL || 'llama3.1';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: options.messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        num_predict: options.maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return { text: data.message?.content || '' };
}

/**
 * Send a message to the configured AI provider and get a text response.
 * Provider is selected via AI_PROVIDER env var (default: "anthropic").
 */
export async function generateAIResponse(options: AIRequestOptions): Promise<AIResponse> {
  const provider = getProvider();

  switch (provider) {
    case 'openai':
      return callOpenAI(options);
    case 'ollama':
      return callOllama(options);
    case 'anthropic':
    default:
      return callAnthropic(options);
  }
}

/** Returns the name of the active provider for logging. */
export function getActiveProvider(): AIProvider {
  return getProvider();
}
