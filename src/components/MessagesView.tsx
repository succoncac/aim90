import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { parseAndRenderMessage } from '../utils/markdownParser';

interface MessagesViewProps {
  messages: ChatMessage[];
  streamingText: string;
  isGenerating: boolean;
  isThinking: boolean;
  onCopyMessage: (content: string) => void;
  onRetryLastMessage: () => void;
  onDeleteMessage: (id: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  messages,
  streamingText,
  isGenerating,
  isThinking,
  onCopyMessage,
  onRetryLastMessage,
  onDeleteMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamingText, isGenerating, isThinking]);

  if (messages.length === 0 && !isGenerating) {
    return (
      <div id="messages" ref={containerRef}>
        <div className="empty" id="emptyState">
          <h2>✦ AI</h2>
          <ol>
            <li>Chọn hoặc thêm nhà cung cấp ở <code>Menu bên trái</code></li>
            <li>Dán API key và nhấn <code>Dò model</code></li>
            <li>Bật <code>🔞 18+</code> để kích hoạt chế độ sáng tạo mở rộng</li>
          </ol>
        </div>
      </div>
    );
  }

  // Helper to render text with markdown code blocks and inline highlights
  const renderFormattedBody = (content: string) => {
    return parseAndRenderMessage(content);
  };

  return (
    <div id="messages" ref={containerRef}>
      {messages.map((m, idx) => {
        const isUser = m.role === 'user';
        const isError = m.isError;
        const isLastAssistant = !isUser && idx === messages.length - 1;

        return (
          <div
            key={m.id}
            className={`msg ${isError ? 'error' : isUser ? 'user' : 'assistant'}`}
          >
            <div className="msg-inner">
              <div className="msg-head">
                <span>{isError ? '⚠️ THÔNG BÁO LỖI' : isUser ? '👤 BẠN' : '⚡ TRỢ LÝ AI'}</span>
                <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 'auto' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="msg-body">
                {isError ? (
                  <div className="chat-error-card">
                    <div className="chat-error-title">
                      <span>⚠️ Yêu cầu API thất bại</span>
                    </div>
                    <pre className="chat-error-log-box">{m.content}</pre>
                  </div>
                ) : (
                  renderFormattedBody(m.content)
                )}
              </div>

              <div className="msg-actions">
                <button
                  type="button"
                  title="Sao chép toàn bộ tin nhắn"
                  onClick={() => onCopyMessage(m.content)}
                >
                  📋 Sao chép
                </button>

                {isLastAssistant && !isGenerating && (
                  <button
                    type="button"
                    title="Gửi lại yêu cầu để nhận câu trả lời khác"
                    onClick={onRetryLastMessage}
                  >
                    🔄 Thử lại
                  </button>
                )}

                <button
                  type="button"
                  title="Xoá tin nhắn này"
                  onClick={() => onDeleteMessage(m.id)}
                >
                  ✕ Xoá
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Ongoing streaming response or thinking indicator */}
      {isGenerating && (
        <div className="msg assistant streaming">
          <div className="msg-inner">
            <div className="msg-head">
              <span className="flex items-center gap-1.5">
                <span className="live-pulse-dot" />
                ⚡ TRỢ LÝ AI
              </span>
              <span style={{ color: 'var(--accent2)', fontSize: 11, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isThinking && !streamingText ? 'Đang suy nghĩ...' : 'Đang gửi trực tiếp...'}
              </span>
            </div>

            <div className="msg-body">
              {isThinking && !streamingText ? (
                <div className="thinking">
                  <i />
                  <i />
                  <i />
                  <span className="thinking-text">Đang kết nối và chuẩn bị câu trả lời...</span>
                </div>
              ) : (
                <>
                  {renderFormattedBody(streamingText)}
                  <span className="cursor" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
