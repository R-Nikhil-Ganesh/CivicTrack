/**
 * CivicTrack Speech & Audio Processing Utilities
 */

/**
 * Classifies SpeechRecognition error events and provides targeted user remediation.
 *
 * @param {string} errorType - Event error code from SpeechRecognition (e.g., 'network', 'not-allowed')
 * @param {boolean} isBrave - Whether running inside Brave browser
 * @returns {{ title: string, message: string, isPermissionError: boolean, isNetworkError: boolean }}
 */
export function classifySpeechError(errorType, isBrave = false) {
  if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
    return {
      title: 'Microphone Permission Blocked',
      message: 'Microphone access was denied. Please click the tune/lock icon in your browser address bar and set Microphone to "Allow".',
      isPermissionError: true,
      isNetworkError: false,
    };
  }

  if (errorType === 'audio-capture') {
    return {
      title: 'No Microphone Detected',
      message: 'No microphone was found. Please check your audio cable, headset, or sound input settings.',
      isPermissionError: false,
      isNetworkError: false,
    };
  }

  if (errorType === 'network') {
    if (isBrave) {
      return {
        title: 'Brave Browser Blocks Speech Cloud',
        message: 'Brave blocks Google speech servers by default. You can open CivicPortal in Google Chrome or Microsoft Edge, or click below to dictate directly with Windows Voice Typing (Win + H).',
        isPermissionError: false,
        isNetworkError: true,
      };
    }
    return {
      title: 'Speech Cloud Service Unreachable',
      message: 'The browser cannot reach Google Speech servers (blocked by an ad-blocker like uBlock/Pi-hole, strict firewall, or VPN). Try Microsoft Edge, pausing ad-blockers, or use Windows Voice Typing below.',
      isPermissionError: false,
      isNetworkError: true,
    };
  }

  return {
    title: 'Voice Recognition Error',
    message: `Encountered unexpected voice recognition code: ${errorType}`,
    isPermissionError: false,
    isNetworkError: false,
  };
}

/**
 * Computes a normalized 0-100 VU level from an array of audio frequency byte values.
 *
 * @param {Uint8Array|Array<number>} dataArray - Audio frequency data (0-255 per bin)
 * @param {number} scaleFactor - Normalization ceiling divisor (default: 60)
 * @returns {number} Level from 0 to 100
 */
export function computeAudioLevel(dataArray, scaleFactor = 60) {
  if (!dataArray || dataArray.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const avg = sum / dataArray.length;
  return Math.min(100, Math.max(0, Math.round((avg / scaleFactor) * 100)));
}
