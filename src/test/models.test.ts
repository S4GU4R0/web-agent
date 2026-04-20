import { describe, it, expect, vi } from 'vitest';
import { OpenAIProvider } from '../lib/models';
import { http, HttpResponse } from 'msw';
import { server } from './setup';

describe('OpenAIProvider', () => {
  it('should generate a completion', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Hello from mock!',
              },
            },
          ],
        });
      })
    );

    const provider = new OpenAIProvider('fake-key');
    const result = await provider.generateCompletion([{ role: 'user', content: 'Hi' }]);
    expect(result.content).toBe('Hello from mock!');
  });

  it('should handle streaming completions', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }) + '\n\n'));
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: ' world!' } }] }) + '\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    const provider = new OpenAIProvider('fake-key');
    const onToken = vi.fn();
    const result = await provider.generateCompletion([{ role: 'user', content: 'Hi' }], {
      stream: true,
      onToken,
    });

    expect(result.content).toBe('Hello world!');
    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken).toHaveBeenCalledWith('Hello');
    expect(onToken).toHaveBeenCalledWith(' world!');
  });

  it('should handle PuterProvider', async () => {
    const mockPuter = {
      ai: {
        chat: vi.fn().mockResolvedValue('Puter response'),
      },
    };
    // @ts-ignore
    global.puter = mockPuter;

    const { PuterProvider } = await import('../lib/models');
    const provider = new PuterProvider();
    const result = await provider.generateCompletion([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('Puter response');
    expect(mockPuter.ai.chat).toHaveBeenCalledWith([{ role: 'user', content: 'Hi' }], { stream: false });
  });
});
