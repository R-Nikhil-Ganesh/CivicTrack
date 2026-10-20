import { describe, it, expect } from 'vitest';
import { classifySpeechError, computeAudioLevel } from './speechUtils';

describe('Speech & Audio Processing Utilities', () => {
  describe('classifySpeechError()', () => {
    it('should classify permission denied error with lock/tune instruction', () => {
      const result = classifySpeechError('not-allowed');
      expect(result.isPermissionError).toBe(true);
      expect(result.isNetworkError).toBe(false);
      expect(result.title).toBe('Microphone Permission Blocked');
      expect(result.message).toContain('Microphone access was denied');
    });

    it('should classify audio capture failure when hardware is disconnected', () => {
      const result = classifySpeechError('audio-capture');
      expect(result.title).toBe('No Microphone Detected');
      expect(result.isPermissionError).toBe(false);
      expect(result.isNetworkError).toBe(false);
    });

    it('should recommend Windows Voice Typing and Brave Shields when in Brave browser', () => {
      const result = classifySpeechError('network', true);
      expect(result.isNetworkError).toBe(true);
      expect(result.title).toContain('Brave Browser');
      expect(result.message).toContain('Win + H');
    });

    it('should advise on network/firewall/VPN when network error occurs outside Brave', () => {
      const result = classifySpeechError('network', false);
      expect(result.isNetworkError).toBe(true);
      expect(result.title).toBe('Speech Cloud Service Unreachable');
      expect(result.message).toContain('VPN');
    });

    it('should handle unrecognized error codes gracefully', () => {
      const result = classifySpeechError('unknown_error_code');
      expect(result.title).toBe('Voice Recognition Error');
      expect(result.message).toContain('unknown_error_code');
    });
  });

  describe('computeAudioLevel()', () => {
    it('should return 0 for empty or null data', () => {
      expect(computeAudioLevel([])).toBe(0);
      expect(computeAudioLevel(null)).toBe(0);
      expect(computeAudioLevel(undefined)).toBe(0);
    });

    it('should return 0 when all audio bins are silent (0 amplitude)', () => {
      const silentData = new Uint8Array([0, 0, 0, 0, 0, 0]);
      expect(computeAudioLevel(silentData)).toBe(0);
    });

    it('should calculate expected percentage for moderate audio levels', () => {
      // avg = 30; (30 / 60) * 100 = 50%
      const moderateData = new Uint8Array([30, 30, 30, 30]);
      expect(computeAudioLevel(moderateData)).toBe(50);
    });

    it('should clamp at 100% when audio exceeds saturation ceiling', () => {
      const loudData = new Uint8Array([255, 255, 255, 255]);
      expect(computeAudioLevel(loudData)).toBe(100);
    });
  });
});
