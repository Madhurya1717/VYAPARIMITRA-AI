/**
 * Audio Player Utility for VyapariMitra AI
 * 
 * Bulletproof audio playback engine that:
 * 1. Sanitizes audio URIs (eliminates duplicate 'data:audio/wav;base64,' prefixes).
 * 2. Plays authentic Gnani Timbre synthesized voice via HTMLAudioElement.
 * 3. Gracefully falls back to browser Web Speech API (window.speechSynthesis)
 *    if autoplay restrictions block async playback or media decoding encounters issues.
 * 4. Broadcasts play/pause/end state so UI components can display animated waveforms.
 */

type PlaybackListener = (isPlaying: boolean) => void;

class AudioPlayerService {
  private currentAudio: HTMLAudioElement | null = null;
  private isCurrentlyPlaying = false;
  private listeners: Set<PlaybackListener> = new Set();

  /**
   * Cleans and formats audio data URI, stripping any duplicate data: prefixes.
   */
  public sanitizeAudioUrl(audioData?: string): string {
    if (!audioData || typeof audioData !== 'string') return '';
    let cleaned = audioData.trim();

    // Remove repeated data: prefixes if any were accidentally chained
    while (cleaned.startsWith('data:audio/wav;base64,data:audio/wav;base64,')) {
      cleaned = cleaned.substring('data:audio/wav;base64,'.length);
    }
    while (cleaned.startsWith('data:audio/wav;base64,data:')) {
      cleaned = cleaned.substring('data:audio/wav;base64,'.length);
    }

    // If it's already a valid data URI, return it
    if (cleaned.startsWith('data:audio/') || cleaned.startsWith('data:application/')) {
      return cleaned;
    }

    // If it's pure base64 without a data URI scheme, wrap it
    if (cleaned.length > 50 && !cleaned.includes('://') && !cleaned.startsWith('data:')) {
      return `data:audio/wav;base64,${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Subscribe to playback state changes (true = playing, false = idle/ended).
   */
  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.isCurrentlyPlaying);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setPlaying(playing: boolean) {
    this.isCurrentlyPlaying = playing;
    this.listeners.forEach((listener) => {
      try {
        listener(playing);
      } catch (err) {
        console.warn('Audio listener error:', err);
      }
    });
  }

  /**
   * Stop any currently active audio playback (both HTML5 Audio and Web Speech).
   */
  public stopAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {
        // Ignore pause errors
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore speech synthesis errors
      }
    }

    this.setPlaying(false);
  }

  /**
   * Main playback method: Plays Gnani Timbre audio, or falls back to Web Speech synthesis.
   */
  public async playSpokenAudio(options: {
    audioBase64?: string;
    text?: string;
    language?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }): Promise<boolean> {
    const { audioBase64, text, language = 'te-IN', onStart, onEnd, onError } = options;

    // First stop any current sound
    this.stopAudio();

    const sanitizedUrl = this.sanitizeAudioUrl(audioBase64);

    // If we have a valid audio URL, attempt to play it via HTMLAudioElement
    if (sanitizedUrl && sanitizedUrl.length > 100) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        this.currentAudio = audio;

        const playPromise = new Promise<boolean>((resolve) => {
          let hasFinished = false;

          const finish = (success: boolean) => {
            if (hasFinished) return;
            hasFinished = true;
            this.setPlaying(false);
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            if (success && onEnd) onEnd();
            resolve(success);
          };

          audio.onplay = () => {
            this.setPlaying(true);
            if (onStart) onStart();
          };

          audio.onended = () => {
            finish(true);
          };

          audio.onerror = (e) => {
            console.warn('Audio element decode/playback error, trying speech synthesis fallback:', e);
            finish(false);
          };

          audio.src = sanitizedUrl;
          audio.load();

          const playCall = audio.play();
          if (playCall !== undefined) {
            playCall
              .then(() => {
                // Audio started successfully
              })
              .catch((err) => {
                console.warn('Audio.play() rejected (autoplay restriction or decode):', err);
                finish(false);
              });
          }
        });

        const success = await playPromise;
        if (success) {
          return true;
        }
      } catch (err) {
        console.warn('Failed HTML5 audio attempt:', err);
      }
    }

    // Fallback: Web Speech API (window.speechSynthesis)
    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return this.playViaSpeechSynthesis(text, language, onStart, onEnd, onError);
    }

    if (onError) onError(new Error('No audio or speech synthesis available'));
    return false;
  }

  /**
   * Fallback using browser's native SpeechSynthesis (supports Telugu and English)
   */
  private playViaSpeechSynthesis(
    text: string,
    language: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel(); // Clear queue

        const utterance = new SpeechSynthesisUtterance(text);
        const isTelugu = language.toLowerCase().includes('te');
        utterance.lang = isTelugu ? 'te-IN' : 'en-IN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to pick the best available voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const matchingVoice = voices.find(
            (v) =>
              (isTelugu && (v.lang.includes('te') || v.name.toLowerCase().includes('telugu'))) ||
              (!isTelugu && (v.lang.includes('en-IN') || v.lang.includes('en')))
          );
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
        }

        utterance.onstart = () => {
          this.setPlaying(true);
          if (onStart) onStart();
        };

        utterance.onend = () => {
          this.setPlaying(false);
          if (onEnd) onEnd();
          resolve(true);
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          this.setPlaying(false);
          if (onError) onError(e);
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis invocation failed:', err);
        this.setPlaying(false);
        if (onError) onError(err);
        resolve(false);
      }
    });
  }

  public get isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }
}

export const audioPlayer = new AudioPlayerService();
