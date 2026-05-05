import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiConfig {
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

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.0-flash-exp';
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
        console.log(`Gemini API attempt ${attempt}/${maxRetries}`);
        console.log('Gemini API Key available:', !!this.genAI);
        console.log('Using model:', this.model);
        console.log('Prompt length:', options.prompt?.length);
        
        const model = this.genAI.getGenerativeModel({ 
          model: this.model,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1000,
          }
        });

        console.log('Model initialized, calling generateContent...');
        const result = await model.generateContent(options.prompt);
        console.log('Content generated, getting response...');
        
        const response = await result.response;
        const text = response.text();
        
        console.log('Response received, text length:', text.length);
        console.log('First 200 chars of response:', text.substring(0, 200));
        
        return text;
      } catch (error) {
        console.error(`Gemini text generation error on attempt ${attempt}:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null,
          error: error
        });
        
        // Check if this is a rate limit error
        const isRateLimit = error instanceof Error && (
          error.message.includes('RATE_LIMIT') || 
          error.message.includes('rate limit') ||
          error.message.includes('429') ||
          error.message.includes('Too Many Requests')
        );

        // Check if this is a quota error
        const isQuotaError = error instanceof Error && (
          error.message.includes('QUOTA') || 
          error.message.includes('quota') ||
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
          if (error.message.includes('API_KEY')) {
            throw new Error('Invalid or missing Gemini API key');
          } else if (error.message.includes('QUOTA') || error.message.includes('quota')) {
            throw new Error('Gemini API quota exceeded. Please check your billing or wait for quota reset.');
          } else if (isRateLimit) {
            throw new Error('Gemini API rate limit exceeded. Please try again in a few minutes.');
          } else if (error.message.includes('SAFETY')) {
            throw new Error('Content blocked by Gemini safety filters');
          } else if (error.message.includes('PERMISSION') || error.message.includes('permission')) {
            throw new Error('Gemini API access denied. Check API key permissions.');
          } else if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('not supported')) {
            throw new Error(`Model not available: ${this.model}. Try using gemini-2.0-flash-exp or gemini-1.5-pro.`);
          } else if (error.message.includes('models/')) {
            throw new Error(`Invalid model name: ${this.model}. Available models: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash.`);
          } else {
            throw new Error(`Gemini API error: ${error.message}`);
          }
        }
        
        throw new Error('Failed to generate text with Gemini: Unknown error');
      }
    }
    
    throw new Error('Failed to generate text after all retry attempts');
  }

  /**
   * Chat with conversation history
   */
  async chat(options: ChatOptions): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
        }
      });

      // Convert messages to Gemini format
      const history = options.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });
      const lastMessage = options.messages[options.messages.length - 1];
      
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw new Error('Failed to chat with Gemini');
    }
  }

  /**
   * Stream chat responses
   */
  async *streamChat(options: ChatOptions): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
        }
      });

      // Convert messages to Gemini format
      const history = options.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });
      const lastMessage = options.messages[options.messages.length - 1];
      
      const result = await chat.sendMessageStream(lastMessage.content);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error('Gemini stream chat error:', error);
      throw new Error('Failed to stream chat with Gemini');
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
You are an HR assistant helping employees with their requests and questions. 
Generate a helpful, professional response to the following employee message.

${employeeName ? `Employee: ${employeeName}` : ''}
${category ? `Category: ${category}` : ''}
Message: ${messageText}

Provide a brief, helpful response that acknowledges their message and either:
1. Provides guidance if it's a simple question
2. Confirms receipt and next steps if it requires follow-up
3. Asks for clarification if the request is unclear

Keep the response professional but friendly, under 100 words.
`;

    return this.generateText({ 
      prompt,
      temperature: 0.5,
      maxTokens: 200 
    });
  }
}

/**
 * Create a Gemini service instance
 */
export function createGeminiService(apiKey: string, model?: string): GeminiService {
  return new GeminiService({ apiKey, model });
}
