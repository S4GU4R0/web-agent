import { OpenAI } from 'openai';

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelTool {
  name: string;
  description: string;
  parameters: any;
}

export interface CompletionOptions {
  stream?: boolean;
  onToken?: (token: string) => void;
  tools?: ModelTool[];
}

export interface ModelProvider {
  id: string;
  name: string;
  generateCompletion(messages: ModelMessage[], options?: CompletionOptions): Promise<ModelMessage>;
}

export class OpenAIProvider implements ModelProvider {
  id = 'openai';
  name = 'OpenAI';
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true 
    });
  }

  async generateCompletion(messages: ModelMessage[], options?: CompletionOptions): Promise<ModelMessage> {
    const openaiTools = options?.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }
    }));

    if (options?.stream) {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
        stream: true,
        tools: openaiTools,
        stream_options: { include_usage: true }
      });

      let fullContent = '';
      let toolCalls: any[] = [];
      let usage: any = undefined;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullContent += delta.content;
          if (options.onToken) {
            options.onToken(delta.content);
          }
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = { ...tc, function: { ...tc.function } };
            } else {
              if (tc.function?.arguments) {
                toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          }
        }

        if (chunk.usage) {
            usage = chunk.usage;
        }
      }

      if (toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: fullContent,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: tc.function
          })),
          usage
        };
      }

      return { role: 'assistant', content: fullContent, usage };
    } else {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
        tools: openaiTools,
      });
      
      const message = response.choices[0].message;
      return {
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls,
        usage: response.usage
      };
    }
  }
}

export class PuterProvider implements ModelProvider {
  id = 'puter';
  name = 'Puter.js';

  async generateCompletion(messages: ModelMessage[], options?: CompletionOptions): Promise<ModelMessage> {
    // @ts-ignore
    if (typeof puter === 'undefined') {
      throw new Error('Puter.js not loaded');
    }

    // @ts-ignore
    const response = await puter.ai.chat(messages.filter(m => m.role !== 'tool'), { stream: !!options?.stream });

    if (options?.stream) {
      let fullContent = '';
      // @ts-ignore
      for await (const part of response) {
        const text = part.text;
        fullContent += text;
        if (options.onToken) {
          options.onToken(text);
        }
      }
      return { role: 'assistant', content: fullContent };
    } else {
      // @ts-ignore
      return { role: 'assistant', content: response.toString() };
    }
  }
}

export const getProvider = (providerId: string, config: any): ModelProvider => {
  switch (providerId) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.baseURL);
    case 'puter':
      return new PuterProvider();
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
};
