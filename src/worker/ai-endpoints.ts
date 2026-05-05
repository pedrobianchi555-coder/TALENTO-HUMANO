import { Hono } from "hono";
import { authMiddleware } from "./supabase-auth";
import { createOpenAIService } from "../shared/openai";

type Bindings = {
  OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// AI-powered text analysis endpoint
app.post("/api/ai/analyze-text", authMiddleware, async (c) => {
  try {
    const { text, analysis_type } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    if (!text || !analysis_type) {
      return c.json({ error: 'Text and analysis_type are required' }, 400);
    }

    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    const result = await openaiService.analyzeText(text, analysis_type as 'sentiment' | 'category' | 'summary');

    return c.json({ result });
  } catch (error) {
    console.error('Error analyzing text with AI:', error);
    return c.json({ error: 'Failed to analyze text' }, 500);
  }
});

// AI-powered chat endpoint for general assistance
app.post("/api/ai/chat", authMiddleware, async (c) => {
  try {
    const { message, context } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    
    // Build system context for HR assistant
    const systemPrompt = `You are an HR assistant helping employees with workplace questions and requests. 
    Be professional, helpful, and concise. If you don't know specific company policies, 
    suggest the employee contact HR directly for detailed information.
    
    ${context ? `Additional context: ${context}` : ''}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message }
    ];

    const response = await openaiService.chat({ messages });

    return c.json({ response });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return c.json({ error: 'Failed to process AI chat' }, 500);
  }
});

// AI-powered document summarization
app.post("/api/ai/summarize", authMiddleware, async (c) => {
  try {
    const { text, max_length } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    
    const prompt = `Provide a concise summary of the following text${max_length ? ` in no more than ${max_length} words` : ''}:

${text}

Summary:`;

    const summary = await openaiService.generateText({ 
      prompt, 
      temperature: 0.3, 
      maxTokens: max_length ? Math.min(max_length * 2, 500) : 200 
    });

    return c.json({ summary });
  } catch (error) {
    console.error('Error summarizing text:', error);
    return c.json({ error: 'Failed to summarize text' }, 500);
  }
});

// AI-powered content generation for HR communications
app.post("/api/ai/generate-content", authMiddleware, async (c) => {
  try {
    const { content_type, topic, tone, details } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    if (!content_type || !topic) {
      return c.json({ error: 'Content type and topic are required' }, 400);
    }

    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    
    let prompt = '';
    switch (content_type) {
      case 'email':
        prompt = `Write a professional HR email about ${topic}. ${tone ? `Use a ${tone} tone.` : 'Use a professional tone.'} ${details ? `Additional details: ${details}` : ''}`;
        break;
      case 'announcement':
        prompt = `Write a company announcement about ${topic}. ${tone ? `Use a ${tone} tone.` : 'Use a professional but engaging tone.'} ${details ? `Additional details: ${details}` : ''}`;
        break;
      case 'policy':
        prompt = `Draft a company policy section about ${topic}. Use clear, professional language. ${details ? `Additional details: ${details}` : ''}`;
        break;
      case 'job_description':
        prompt = `Write a job description for ${topic}. Include responsibilities, requirements, and qualifications. ${details ? `Additional details: ${details}` : ''}`;
        break;
      default:
        prompt = `Generate professional HR content about ${topic}. ${tone ? `Use a ${tone} tone.` : ''} ${details ? `Additional details: ${details}` : ''}`;
    }

    const content = await openaiService.generateText({ 
      prompt, 
      temperature: 0.6, 
      maxTokens: 800 
    });

    return c.json({ content });
  } catch (error) {
    console.error('Error generating content:', error);
    return c.json({ error: 'Failed to generate content' }, 500);
  }
});

export default app;
