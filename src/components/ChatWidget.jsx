import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minus, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_HISTORY = 20; // cap client-side history sent to API

const QUICK_QUESTIONS = [
  'How do I add a lead?',
  "How's my account doing?",
  'How do I use templates?',
];

const GREETING =
  "Hi! I'm the ReachDesk assistant. Ask me anything about the app or your account.";

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '0.55rem',
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: '0.5rem 0.75rem',
          borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          background: isUser ? 'var(--accent-blue)' : 'var(--bg-card-hover)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: '0.84rem',
          lineHeight: 1.5,
          border: isUser ? 'none' : '1px solid var(--border)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.content}
        <div
          style={{
            fontSize: '0.65rem',
            color: isUser ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
            marginTop: '0.2rem',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {msg.time}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.55rem' }}>
      <div
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '12px 12px 12px 3px',
          background: 'var(--bg-card-hover)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--text-muted)',
              display: 'inline-block',
              animation: `chat-bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Widget ────────────────────────────────────────────────────────────────
export default function ChatWidget({ profile }) {
  const userPlan = (profile?.plan || 'trial').toLowerCase();
  const isAllowedPlan = ['trial', 'starter', 'pro', 'teams', 'enterprise'].includes(userPlan);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  if (!isAllowedPlan) return null;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const sendMessage = async (content) => {
    const text = (content ?? inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');
    setError('');

    const userMsg = { role: 'user', content: text, time: formatTime(new Date()) };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build history to send — cap at MAX_HISTORY, omit the time field (not needed by API)
      const history = [...messages, userMsg]
        .slice(-MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }));

      const { data, error: invokeError } = await supabase.functions.invoke('groq-chat', {
        body: {
          mode: 'support',
          messages: history,
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      if (!data?.reply) throw new Error('No reply received');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, time: formatTime(new Date()) },
      ]);
    } catch (err) {
      console.error('[ChatWidget] Error calling groq-chat:', err);
      setError("Couldn't reach the assistant — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes chat-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes chat-fade-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="ReachDesk assistant"
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '1.5rem',
            width: '370px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '520px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9990,
            animation: 'chat-fade-in 0.2s ease-out',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MessageCircle size={14} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  ReachDesk assistant
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Typing...' : 'Online'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Minimize chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Message list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Greeting + quick chips — always shown */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '0.55rem',
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '12px 12px 12px 3px',
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  border: '1px solid var(--border)',
                }}
              >
                {GREETING}
              </div>
            </div>

            {/* Quick question chips — only on empty state */}
            {isEmpty && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      borderRadius: '20px',
                      padding: '0.28rem 0.65rem',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.color = 'var(--accent-blue)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {/* Loading indicator */}
            {isLoading && <TypingIndicator />}

            {/* Error bubble */}
            {error && !isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--danger-color)',
                  fontSize: '0.78rem',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(224,82,82,0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(224,82,82,0.2)',
                  marginBottom: '0.5rem',
                }}
              >
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Support footer */}
          <div
            style={{
              padding: '0.3rem 0.85rem',
              textAlign: 'center',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            Need more help?{' '}
            <a
              href="mailto:support@reachdeskcrm.com"
              style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              support@reachdeskcrm.com
            </a>
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '0.65rem 0.75rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              background: 'var(--bg-card)',
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              style={{
                flex: 1,
                resize: 'none',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.45rem 0.65rem',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                lineHeight: 1.45,
                maxHeight: '96px',
                minHeight: '36px',
                overflow: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: inputValue.trim() && !isLoading ? 'var(--accent-blue)' : 'var(--border)',
                color: '#fff',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          zIndex: 9991,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 22px rgba(0,0,0,0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
        }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
