import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceService } from '../lib/voice-service';

// Define the mock class
class MockWebSocket {
  url: string;
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let WebSocketSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Stub the global WebSocket
    WebSocketSpy = vi.fn().mockImplementation((url: string) => new MockWebSocket(url));
    vi.stubGlobal('WebSocket', WebSocketSpy);

    // Stub AudioContext
    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        onaudioprocess: null,
      }),
      destination: {},
      close: vi.fn(),
    })));

    // Stub navigator.mediaDevices
    vi.stubGlobal('navigator', {
        mediaDevices: {
            getUserMedia: vi.fn().mockResolvedValue({
                getTracks: () => [{ stop: vi.fn() }],
            }),
        }
    });

    voiceService = new VoiceService();
  });

  it('should start voice service and connect to websocket', async () => {
    await voiceService.start('sk-test-key');
    expect(WebSocketSpy).toHaveBeenCalled();
  });

  it('should stop voice service and clean up resources', async () => {
    await voiceService.start('sk-test-key');
    const wsInstance = WebSocketSpy.mock.results[0].value;
    voiceService.stop();
    expect(wsInstance.close).toHaveBeenCalled();
  });
});
