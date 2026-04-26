import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a spy for the WebSocket constructor
const MockWebSocket = vi.fn().mockImplementation((url: string) => ({
  url,
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
}));

vi.stubGlobal('WebSocket', MockWebSocket);

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

vi.stubGlobal('navigator', {
    mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
        }),
    }
});

import { VoiceService } from '../lib/voice-service';

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    vi.clearAllMocks();
    voiceService = new VoiceService();
  });

  it('should start voice service and connect to websocket', async () => {
    await voiceService.start('sk-test-key');
    expect(MockWebSocket).toHaveBeenCalled();
  });

  it('should stop voice service and clean up resources', async () => {
    await voiceService.start('sk-test-key');
    const wsInstance = vi.mocked(MockWebSocket).mock.results[0].value;
    voiceService.stop();
    expect(wsInstance.close).toHaveBeenCalled();
  });
});
