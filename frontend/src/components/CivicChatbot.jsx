import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  PhoneCall,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import {
  analyzeCivicQuery,
  QUICK_PROMPTS,
  MUNICIPAL_DEPARTMENTS,
  MUNICIPAL_HELPLINES
} from '../utils/civicKnowledge';
import { useAuth } from '../context/AuthContext';

const CivicChatbot = () => {
  const navigate = useNavigate();
  const { user, isOfficial } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: "👋 Greetings! I am CivicBot, your 24/7 municipal AI assistant.\n\nTell me about any civic issue in your neighborhood (e.g., potholes, water leaks, garbage dumps, or dark streetlights), and I will route it to the right municipal department!",
      chips: ['🚰 Water Leakage', '🛣️ Road Pothole', '🗑️ Garbage Overflow', '💡 Streetlight Fault'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  // Microphone device switcher & audio VU meter states
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    return localStorage.getItem('civic_selected_mic_id') || 'default';
  });
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem('civic_selected_lang') || 'en-US';
  });
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [windowsDictationHint, setWindowsDictationHint] = useState(false);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const transcriptRef = useRef('');
  const baseTranscriptRef = useRef('');
  const restartCountRef = useRef(0);
  const lastRestartTimeRef = useRef(0);

  const activeStreamRef = useRef(null);
  const previewStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const SUPPORTED_LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'hi-IN', label: 'Hindi (हिंदी)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'te-IN', label: 'Telugu (తెలుగు)' },
    { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  ];

  // Check speech recognition support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Audio VU Level Meter Setup
  const setupAudioMeter = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }

      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 60) * 100));
        setAudioLevel(level);

        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (err) {
      console.warn('Audio meter setup error:', err);
    }
  };

  const cleanupAudioMeter = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Enumerate Audio Input Devices
  const loadAudioDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioInputs = devices.filter((d) => d.kind === 'audioinput');

      const hasLabels = audioInputs.some((d) => d.label);
      if (!hasLabels && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((d) => d.kind === 'audioinput');
        } catch (e) {
          console.warn('Could not unmask audio device labels:', e);
        }
      }

      setAudioDevices(audioInputs);

      const saved = localStorage.getItem('civic_selected_mic_id');
      if (saved && saved !== 'default') {
        const exists = audioInputs.some((d) => d.deviceId === saved);
        if (exists) {
          setSelectedDeviceId(saved);
        } else if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Error loading audio devices:', err);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
      };
    }
  }, []);

  const startMicPreview = async (deviceId) => {
    stopMicPreview();
    try {
      const constraints = (deviceId && deviceId !== 'default')
        ? { audio: { deviceId: { exact: deviceId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      previewStreamRef.current = stream;
      setupAudioMeter(stream);
    } catch (err) {
      console.warn('Mic preview error:', err);
    }
  };

  const stopMicPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
    if (!isListeningRef.current) {
      cleanupAudioMeter();
    }
  };

  useEffect(() => {
    if (showMicSettings && !isListening) {
      startMicPreview(selectedDeviceId);
    } else if (!showMicSettings && !isListening) {
      stopMicPreview();
    }
  }, [showMicSettings, isListening, selectedDeviceId]);

  const handleSelectDevice = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem('civic_selected_mic_id', deviceId);

    if (isListeningRef.current) {
      baseTranscriptRef.current = transcriptRef.current;
      stopListening(false);
      setTimeout(() => {
        startListening(deviceId);
      }, 150);
    } else if (showMicSettings) {
      startMicPreview(deviceId);
    }
  };

  const handleSelectLanguage = (langCode) => {
    setSelectedLang(langCode);
    localStorage.setItem('civic_selected_lang', langCode);
    if (isListeningRef.current) {
      baseTranscriptRef.current = transcriptRef.current;
      stopListening(false);
      setTimeout(() => {
        startListening();
      }, 150);
    }
  };

  const handleUseWindowsVoiceTyping = () => {
    setVoiceError(null);
    inputRef.current?.focus();
    setWindowsDictationHint(true);
    setTimeout(() => setWindowsDictationHint(false), 9000);
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Clean up speech recognition, preview and synthesis when closed or unmounted
  useEffect(() => {
    if (!isOpen) {
      stopListening(false);
      stopMicPreview();
      setShowMicSettings(false);
      setVoiceError(null);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopListening(false);
      stopMicPreview();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech function
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/[*_#`]/g, '')
      .replace(/•/g, '')
      .replace(/https?:\/\/\S+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendQuery = (userQueryText) => {
    const textToSend = userQueryText || input;
    if (!textToSend.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    transcriptRef.current = '';
    baseTranscriptRef.current = '';

    // Simulate smart municipal reasoning
    setTimeout(() => {
      const result = analyzeCivicQuery(textToSend);

      const botMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: result.text,
        category: result.category,
        priority: result.priority,
        actionType: result.actionType,
        actionUrl: result.actionUrl,
        actionText: result.actionText,
        chips: result.chips,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
      speakText(result.text);
    }, 450);
  };

  const stopListening = (send = false) => {
    isListeningRef.current = false;
    setIsListening(false);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        // Safe ignore
      }
      recognitionRef.current = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }

    cleanupAudioMeter();

    const captured = transcriptRef.current.trim();
    if (send && captured) {
      handleSendQuery(captured);
    }

    transcriptRef.current = '';
    baseTranscriptRef.current = '';
    restartCountRef.current = 0;
  };

  const startRecognitionInstance = () => {
    if (!isListeningRef.current) return;

    // Rate-limit restarts if microphone device keeps failing immediately
    const now = Date.now();
    if (now - lastRestartTimeRef.current < 2500) {
      restartCountRef.current += 1;
    } else {
      restartCountRef.current = 1;
    }
    lastRestartTimeRef.current = now;

    if (restartCountRef.current > 8 && !transcriptRef.current.trim()) {
      console.warn('Speech recognition restarted too frequently without capturing speech.');
      setVoiceError({
        title: 'Microphone Silent',
        message: 'No speech was detected. Please verify microphone volume or speak closer to mic.'
      });
      stopListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = selectedLang || navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const combined = [baseTranscriptRef.current, currentFinal, currentInterim]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (combined) {
          setInput(combined);
          transcriptRef.current = combined;
          setVoiceError(null);
          restartCountRef.current = 0;

          // Clear safety timer once words are recognized
          if (maxDurationTimerRef.current) {
            clearTimeout(maxDurationTimerRef.current);
            maxDurationTimerRef.current = null;
          }

          // Debounce: auto-submit query 2.2 seconds after speaker pauses
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopListening(true);
          }, 2200);
        }
      };

      recognition.onerror = async (event) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'no-speech') {
          // Expected ambient pause in Chrome; onend will automatically restart session
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError({
            title: 'Microphone Permission Blocked',
            message: 'Microphone access was denied. Please click the tune/lock icon in your browser address bar and set Microphone to "Allow".'
          });
          stopListening(false);
          return;
        }
        if (event.error === 'audio-capture') {
          setVoiceError({
            title: 'No Microphone Detected',
            message: 'No microphone was found. Please check your audio cable, headset, or sound input settings.'
          });
          stopListening(false);
          return;
        }
        if (event.error === 'network') {
          let isBrave = false;
          try {
            if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
              isBrave = await navigator.brave.isBrave();
            }
          } catch (e) {}

          if (isBrave) {
            setVoiceError({
              title: 'Brave Browser Blocks Speech Cloud',
              message: 'Brave blocks Google speech servers by default. You can open CivicPortal in Google Chrome or Microsoft Edge, or click below to dictate directly with Windows Voice Typing (Win + H).'
            });
          } else {
            setVoiceError({
              title: 'Speech Cloud Service Unreachable',
              message: 'The browser cannot reach Google Speech servers (blocked by an ad-blocker like uBlock/Pi-hole, strict firewall, or VPN). Try Microsoft Edge, pausing ad-blockers, or use Windows Voice Typing below.'
            });
          }
          stopListening(false);
          return;
        }

        stopListening(false);
      };

      recognition.onend = () => {
        // If still in listening mode, Chrome ended on silence pause: restart session immediately
        if (isListeningRef.current) {
          if (transcriptRef.current) {
            baseTranscriptRef.current = transcriptRef.current;
          }

          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              startRecognitionInstance();
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition instance:', err);
      if (isListeningRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            startRecognitionInstance();
          }
        }, 300);
      }
    }
  };

  const startListening = async (deviceIdOverride) => {
    setVoiceError(null);
    stopMicPreview();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const targetDeviceId = deviceIdOverride || selectedDeviceId;
    const audioConstraints = (targetDeviceId && targetDeviceId !== 'default')
      ? { deviceId: { exact: targetDeviceId } }
      : true;

    // Proactively verify / request microphone permission and lock media stream to chosen device
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        activeStreamRef.current = stream;
        setupAudioMeter(stream);
      } catch (err) {
        console.warn('Microphone permission / capture error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setVoiceError('Microphone permission blocked. Please allow microphone access in your browser address bar.');
          return;
        }
      }
    }

    stopListening(false);

    transcriptRef.current = '';
    baseTranscriptRef.current = '';
    restartCountRef.current = 0;
    setInput('');
    setIsListening(true);
    isListeningRef.current = true;

    startRecognitionInstance();

    // Max 25s listening timeout if completely idle
    maxDurationTimerRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        if (transcriptRef.current.trim()) {
          stopListening(true);
        } else {
          stopListening(false);
        }
      }
    }, 25000);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  const currentMic = audioDevices.find((d) => d.deviceId === selectedDeviceId);
  const currentMicLabel = currentMic?.label || (audioDevices.length > 0 ? audioDevices[0].label : 'Default Microphone');

  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setTtsEnabled(!ttsEnabled);
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopListening(false);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'bot',
        text: "Chat cleared! How can I assist you with municipal services or civic issues?",
        chips: ['🚰 Water Leakage', '🛣️ Road Pothole', '🗑️ Garbage Overflow', '💡 Streetlight Fault'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isListening) {
      stopListening(true);
    } else {
      handleSendQuery(input);
    }
  };

  const handleChipClick = (chipText) => {
    // Map chip to prompt if found
    const promptObj = QUICK_PROMPTS.find((p) => p.label === chipText);
    const query = promptObj ? promptObj.query : chipText;
    handleSendQuery(query);
  };

  const handleActionClick = (url) => {
    if (url) {
      setIsOpen(false);
      if (isOfficial && url.startsWith('/report')) {
        navigate('/admin');
      } else {
        navigate(url);
      }
    }
  };

  // Helper to render markdown-like bold and bullet formatting
  const renderFormattedText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} style={{ height: '8px' }} />;
      }

      // Format bold (**bold**), italic (*italic*), and inline code (`code`)
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

      return (
        <div key={idx} style={{ marginBottom: '4px', lineHeight: '1.45' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return <span key={pIdx} style={{ color: '#1e293b' }}>{part.slice(1, -1)}</span>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <span
                  key={pIdx}
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
                  }}
                >
                  {part.slice(1, -1)}
                </span>
              );
            }
            return part.replace(/\*/g, '');
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Launcher Button */}
      <div className="civic-bot-launcher-container">
        {!isOpen && (
          <div className="civic-bot-pill-hint" onClick={() => setIsOpen(true)}>
            <Sparkles size={14} className="sparkle-icon" />
            <span>CivicBot Assistant</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`civic-bot-launcher-btn ${isOpen ? 'active' : ''}`}
          aria-label={isOpen ? 'Close Civic AI Assistant' : 'Open Civic AI Assistant'}
          title={isOpen ? 'Close CivicBot' : 'Open CivicBot Municipal Assistant'}
        >
          {isOpen ? (
            <X size={26} />
          ) : (
            <div className="bot-btn-inner">
              <span className="bot-pulse-ring"></span>
              <Bot size={28} />
              <span className="bot-status-online" title="Online"></span>
            </div>
          )}
        </button>
      </div>

      {/* Slide-Up Chat Window */}
      {isOpen && (
        <div className="civic-bot-window card">
          {/* Header */}
          <div className="civic-bot-header">
            <div className="bot-header-left">
              <div className="bot-avatar-circle">
                <Bot size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 className="bot-title">CivicBot</h3>
                  <span className="bot-ai-badge">AI Assistant</span>
                </div>
                <p className="bot-subtitle">Municipal Grievance & GIS Navigator</p>
              </div>
            </div>

            <div className="bot-header-actions">
              <button
                type="button"
                onClick={toggleTTS}
                className={`bot-icon-btn ${ttsEnabled ? 'active-tts' : ''}`}
                title={ttsEnabled ? 'Disable Voice Readout' : 'Enable Voice Readout'}
                aria-label="Toggle Voice Readout"
              >
                {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setShowDirectory(!showDirectory)}
                className={`bot-icon-btn ${showDirectory ? 'active-tts' : ''}`}
                title="Municipal Department Directory & Helplines"
                aria-label="Department Directory"
              >
                <PhoneCall size={18} />
              </button>

              <button
                type="button"
                onClick={handleResetChat}
                className="bot-icon-btn"
                title="Reset Conversation"
                aria-label="Reset Chat"
              >
                <RotateCcw size={18} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bot-icon-btn"
                title="Minimize Chat"
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Department Directory Overlay */}
          {showDirectory && (
            <div className="bot-directory-drawer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Municipal Directory & SLAs</strong>
                <button
                  type="button"
                  onClick={() => setShowDirectory(false)}
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {MUNICIPAL_DEPARTMENTS.map((dept) => (
                  <div key={dept.name} className="directory-item">
                    <span style={{ fontSize: '1.2rem' }}>{dept.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{dept.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SLA: {dept.sla} • Tel: {dept.phone}</div>
                    </div>
                    {!isOfficial ? (
                      <button
                        type="button"
                        className="directory-action-btn"
                        onClick={() => {
                          setShowDirectory(false);
                          handleActionClick(`/report?category=${encodeURIComponent(dept.name)}`);
                        }}
                      >
                        Report
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="directory-action-btn"
                        onClick={() => {
                          setShowDirectory(false);
                          handleActionClick('/admin');
                        }}
                      >
                        View Dept
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Stream */}
          <div className="civic-bot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`bot-msg-row ${msg.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                {msg.role === 'bot' && (
                  <div className="msg-bot-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`bot-msg-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                  <div className="msg-body">{renderFormattedText(msg.text)}</div>

                  {/* Action CTA Button if available */}
                  {msg.actionUrl && (
                    <button
                      type="button"
                      className="msg-action-cta"
                      onClick={() => handleActionClick(msg.actionUrl)}
                    >
                      <span>
                        {isOfficial && msg.actionUrl.startsWith('/report')
                          ? 'View Department Dashboard'
                          : (msg.actionText || 'Proceed')}
                      </span>
                      <ExternalLink size={14} />
                    </button>
                  )}

                  {/* Suggestion Chips */}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="msg-chips-container">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="msg-chip"
                          onClick={() => handleChipClick(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="msg-timestamp">{msg.timestamp}</div>
                </div>

                {msg.role === 'user' && (
                  <div className="msg-user-avatar">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Error Notice */}
          {voiceError && (
            <div className="bot-voice-error-bar">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#991b1b' }}>
                  <span>⚠️</span>
                  <span>{typeof voiceError === 'object' ? voiceError.title : 'Voice Recognition Notice'}</span>
                </div>
                <div style={{ fontSize: '0.735rem', marginTop: '3px', lineHeight: 1.45, color: '#7f1d1d' }}>
                  {typeof voiceError === 'object' ? voiceError.message : voiceError}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleUseWindowsVoiceTyping}
                    className="bot-voice-action-btn"
                    title="Focus text input and trigger Windows Voice Typing (Win + H)"
                  >
                    🎙️ Use Windows Voice Typing (Win + H)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceError(null);
                      startListening();
                    }}
                    className="bot-voice-action-btn secondary"
                    title="Retry Web Speech"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="bot-voice-error-close"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Windows Dictation Hint Toast */}
          {windowsDictationHint && (
            <div className="bot-dictation-hint">
              <span>💡 <strong>Text Box Ready:</strong> Press <kbd>Win</kbd> + <kbd>H</kbd> now on your keyboard to speak into CivicBot!</span>
            </div>
          )}

          {/* Voice Listening Active Notification */}
          {isListening && (
            <div className="bot-listening-bar">
              <span className="listening-pulse"></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {input.trim()
                    ? `Hearing: "${input}"`
                    : 'Listening... Speak your civic complaint now'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentMicLabel}>
                    🎙️ {currentMicLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      loadAudioDevices();
                      setShowMicSettings(!showMicSettings);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      textDecoration: 'underline',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    (switch mic)
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="bot-listening-done-btn"
                title="Finish speaking and send"
              >
                Send Voice
              </button>
            </div>
          )}

          {/* Microphone Settings & Switcher Drawer */}
          {showMicSettings && (
            <div className="bot-mic-drawer">
              <div className="bot-mic-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={15} style={{ color: 'var(--primary)' }} />
                  <span>Microphone Devices & Audio Test</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMicSettings(false)}
                  className="bot-mic-drawer-close"
                  title="Close Settings"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Current Active Device Chip */}
              <div className="bot-mic-current-chip">
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active Mic:</span>
                <span className="bot-mic-name" title={currentMicLabel}>
                  {currentMicLabel}
                </span>
              </div>

              {/* Live Audio Level VU Meter */}
              <div className="bot-mic-level-box">
                <div className="bot-mic-level-header">
                  <span>Live Input Sound Level:</span>
                  <span style={{ fontWeight: 700, color: audioLevel > 15 ? '#16a34a' : '#64748b' }}>
                    {audioLevel > 15 ? 'Receiving Voice 🔊' : 'Quiet / Silence 🔇'}
                  </span>
                </div>
                <div className="bot-mic-meter-track">
                  <div
                    className="bot-mic-meter-fill"
                    style={{
                      width: `${Math.min(100, audioLevel)}%`,
                      background: audioLevel > 65 ? '#ef4444' : audioLevel > 20 ? '#22c55e' : '#3b82f6'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Speak now into your microphone to verify it picks up your sound.
                </span>
              </div>

              {/* Spoken Accent / Language Selector */}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Recognition Dialect / Accent:
                </span>
                <select
                  value={selectedLang}
                  onChange={(e) => handleSelectLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: '0.775rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b'
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Audio Devices List */}
              <div className="bot-mic-list">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px', display: 'block' }}>
                  Available Microphones ({audioDevices.length || 0}):
                </span>
                {audioDevices.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '4px 0' }}>
                    No audio inputs found. Using system default.
                  </div>
                ) : (
                  audioDevices.map((dev, idx) => {
                    const isSelected = (dev.deviceId === selectedDeviceId) || (!selectedDeviceId && idx === 0);
                    return (
                      <label
                        key={dev.deviceId || idx}
                        className={`bot-mic-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectDevice(dev.deviceId)}
                      >
                        <input
                          type="radio"
                          name="selectedMic"
                          checked={isSelected}
                          onChange={() => handleSelectDevice(dev.deviceId)}
                        />
                        <span className="bot-mic-opt-label">
                          {dev.label || `Microphone ${idx + 1}`}
                        </span>
                        {isSelected && <span className="bot-mic-badge">Active</span>}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleFormSubmit} className="civic-bot-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening to voice... (speak now)' : 'Type complaint or query...'}
              className="civic-bot-text-input"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`bot-mic-btn ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Stop Recording' : `Voice Input (${currentMicLabel})`}
              aria-label="Voice Input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Mic Settings & Device Switcher Button */}
            <button
              type="button"
              onClick={() => {
                loadAudioDevices();
                setShowMicSettings(!showMicSettings);
              }}
              className={`bot-mic-settings-btn ${showMicSettings ? 'active' : ''}`}
              title={`Switch Microphone (Current: ${currentMicLabel})`}
              aria-label="Microphone Settings"
            >
              <SlidersHorizontal size={17} />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim()}
              className="bot-send-btn"
              title="Send Message"
              aria-label="Send Message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CivicChatbot;
