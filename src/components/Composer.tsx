import React, { useRef, useEffect } from 'react';

interface ComposerProps {
  input: string;
  onChangeInput: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
  isNsfw?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  input,
  onChangeInput,
  onSend,
  onStop,
  isGenerating,
  disabled,
  isNsfw = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height strictly bounded to avoid abnormal stretching
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = '44px';
      const scrollHeight = el.scrollHeight;
      const clampedHeight = Math.min(Math.max(scrollHeight, 44), 180);
      el.style.height = `${clampedHeight}px`;
      el.style.overflowY = scrollHeight > 180 ? 'auto' : 'hidden';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <footer id="composer">
      <textarea
        ref={textareaRef}
        id="input"
        rows={1}
        placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
        value={input}
        onChange={(e) => onChangeInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating}
      />

      {isGenerating ? (
        <button
          id="stopBtn"
          type="button"
          className="btn-stop"
          onClick={onStop}
          title="Dừng sinh phản hồi"
        >
          ⏹ Dừng
        </button>
      ) : (
        <button
          id="sendBtn"
          type="button"
          className={`btn-send ${isNsfw ? 'nsfw-active' : ''}`}
          onClick={onSend}
          disabled={disabled || !input.trim()}
          title="Gửi tin nhắn (Enter)"
        >
          Gửi
        </button>
      )}
    </footer>
  );
};
