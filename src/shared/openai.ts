import OpenAI from "openai";

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'gpt-4o-mini';
  }

  /**
   * Sleep function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate text from a simple prompt with retry logic
   */
  async generateText(options: GenerateTextOptions): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`OpenAI API attempt ${attempt}/${maxRetries}`);
        console.log('OpenAI API Key available:', !!this.client);
        console.log('Using model:', this.model);
        console.log('Prompt length:', options.prompt?.length);
        
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: options.prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
        });

        const text = response.choices[0]?.message?.content || '';
        
        console.log('Response received, text length:', text.length);
        console.log('First 200 chars of response:', text.substring(0, 200));
        
        return text;
      } catch (error) {
        console.error(`OpenAI text generation error on attempt ${attempt}:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null,
          error: error
        });
        
        // Check if this is a rate limit error
        const isRateLimit = error instanceof Error && (
          error.message.includes('rate_limit') || 
          error.message.includes('rate limit') ||
          error.message.includes('429') ||
          error.message.includes('Too Many Requests')
        );

        // Check if this is a quota error
        const isQuotaError = error instanceof Error && (
          error.message.includes('quota') || 
          error.message.includes('insufficient_quota') ||
          error.message.includes('exceeded')
        );

        // If rate limit or quota error and we have retries left, wait and retry
        if ((isRateLimit || isQuotaError) && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit/quota error detected. Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
          continue;
        }
        
        // If this is the last attempt or non-retryable error, throw with specific message
        if (error instanceof Error) {
          if (error.message.includes('API key') || error.message.includes('invalid_api_key')) {
            throw new Error('Invalid or missing OpenAI API key');
          } else if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
            throw new Error('OpenAI API quota exceeded. Please check your billing or wait for quota reset.');
          } else if (isRateLimit) {
            throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
          } else if (error.message.includes('content_filter')) {
            throw new Error('Content blocked by OpenAI safety filters');
          } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
            throw new Error('OpenAI API access denied. Check API key permissions.');
          } else if (error.message.includes('model_not_found')) {
            throw new Error(`Model not available: ${this.model}. Try using gpt-4o-mini or gpt-4o.`);
          } else {
            throw new Error(`OpenAI API error: ${error.message}`);
          }
        }
        
        throw new Error('Failed to generate text with OpenAI: Unknown error');
      }
    }
    
    throw new Error('Failed to generate text after all retry attempts');
  }

  /**
   * Chat with conversation history
   */
  async chat(options: ChatOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Failed to chat with OpenAI');
    }
  }

  /**
   * Stream chat responses
   */
  async *streamChat(options: ChatOptions): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI stream chat error:', error);
      throw new Error('Failed to stream chat with OpenAI');
    }
  }

  /**
   * Analyze text for sentiment, categorization, etc.
   */
  async analyzeText(text: string, analysisType: 'sentiment' | 'category' | 'summary'): Promise<string> {
    const prompts = {
      sentiment: `Analyze the sentiment of the following text and respond with only one word: positive, negative, or neutral.\n\nText: ${text}`,
      category: `Categorize the following text into one of these categories: complaint, request, feedback, question, or other.\n\nText: ${text}`,
      summary: `Provide a brief summary of the following text in one sentence:\n\nText: ${text}`
    };

    return this.generateText({ 
      prompt: prompts[analysisType],
      temperature: 0.3,
      maxTokens: 100 
    });
  }

  /**
   * Generate auto-responses for HR chat
   */
  async generateAutoResponse(context: {
    messageText: string;
    category?: string;
    employeeName?: string;
  }): Promise<string> {
    const { messageText, category, employeeName } = context;
    
    const prompt = `
Eres un asistente de Recursos Humanos que ayuda a los empleados con sus solicitudes y preguntas.
Genera una respuesta útil y profesional al siguiente mensaje del empleado.

IMPORTANTE: Debes responder ÚNICAMENTE en español.

${employeeName ? `Empleado: ${employeeName}` : ''}
${category ? `Categoría: ${category}` : ''}
Mensaje: ${messageText}

Proporciona una respuesta breve y útil que:
1. Reconozca su mensaje
2. Proporcione orientación si es una pregunta simple
3. Confirme la recepción y los próximos pasos si requiere seguimiento
4. Solicite aclaraciones si la solicitud no es clara

Mantén la respuesta profesional pero amigable, en menos de 100 palabras.
Responde SIEMPRE en español.
`;

    return this.generateText({ 
      prompt,
      temperature: 0.5,
      maxTokens: 200 
    });
  }

  /**
   * Generate structured output with JSON parsing
   */
  async generateStructuredOutput<T>(prompt: string): Promise<T> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI structured output error:', error);
      throw new Error('Failed to generate structured output');
    }
  }
}

/**
 * Create an OpenAI service instance
 */
export function createOpenAIService(apiKey: string, model?: string): OpenAIService {
  return new OpenAIService({ apiKey, model });
}
