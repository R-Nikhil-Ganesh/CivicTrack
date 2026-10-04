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
  CheckCircle2
} from 'lucide-react';
import {
  analyzeCivicQuery,
  QUICK_PROMPTS,
  MUNICIPAL_DEPARTMENTS,
  MUNICIPAL_HELPLINES
} from '../utils/civicKnowledge';

const CivicChatbot = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: "👋 Greetings! I am **CivicBot**, your 24/7 municipal AI assistant.\n\nTell me about any civic issue in your neighborhood (e.g., *potholes*, *water leaks*, *garbage dumps*, or *dark streetlights*), and I will route it to the right municipal department!",
      chips: ['🚰 Water Leakage', '🛣️ Road Pothole', '🗑️ Garbage Overflow', '💡 Streetlight Fault'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Automatically send voice query after a brief delay for a seamless experience
        handleSendQuery(transcript);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Clean up speech synthesis when closed
  useEffect(() => {
    return () => {
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

  const toggleListening = () => {
    if (!voiceSupported) {
      alert('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setTtsEnabled(!ttsEnabled);
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendQuery(input);
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
      navigate(url);
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

      // Format bold (**bold**) and inline code (`code`)
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

      return (
        <div key={idx} style={{ marginBottom: '4px', lineHeight: '1.45' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
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
            return part;
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
                      <span>{msg.actionText || 'Proceed'}</span>
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

          {/* Voice Listening Active Notification */}
          {isListening && (
            <div className="bot-listening-bar">
              <span className="listening-pulse"></span>
              <span>Listening to your voice... Speak now</span>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleFormSubmit} className="civic-bot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Type complaint or query...'}
              className="civic-bot-text-input"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`bot-mic-btn ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Stop Recording' : 'Voice Input (Speak your issue)'}
              aria-label="Voice Input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
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
