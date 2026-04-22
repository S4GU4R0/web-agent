export class VoiceService {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  async start(apiKey: string, model: string = 'gpt-4o-realtime-preview-2024-10-01', baseUrl: string = 'wss://api.openai.com/v1/realtime') {
    const url = `${baseUrl}?model=${model}`;
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('Realtime socket connected');
      this.socket?.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful assistant.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
        }
      }));
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    await this.startRecording();
  }

  private async startRecording() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Audio = this.base64Encode(pcmData);
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      }
    };
  }

  private handleEvent(event: any) {
    switch (event.type) {
      case 'response.audio.delta':
        this.playAudioChunk(event.delta);
        break;
      case 'response.audio_transcript.delta':
        // Handle transcript
        break;
      // ... handle other events
    }
  }

  private playAudioChunk(base64Audio: string) {
    // Basic implementation of audio playback
    // In a real app, we'd use a buffer or AudioWorklet for smoother playback
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    let output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private base64Encode(buffer: Int16Array): string {
    const uint8 = new Uint8Array(buffer.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }

  stop() {
    this.socket?.close();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
  }
}

export const voiceService = new VoiceService();
