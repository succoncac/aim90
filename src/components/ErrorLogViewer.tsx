import React, { useState } from 'react';
import { parseApiError } from '../utils/errorParser';

interface ErrorLogViewerProps {
  rawError: string;
  title?: string;
  providerName?: string;
  onRescan?: () => void;
  isScanning?: boolean;
  onEditKey?: () => void;
  onManualModel?: () => void;
  compact?: boolean;
}

export const ErrorLogViewer: React.FC<ErrorLogViewerProps> = ({
  rawError,
  title,
  providerName,
  onRescan,
  isScanning,
  onEditKey,
  onManualModel,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const parsed = parseApiError(rawError);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(parsed.formattedLog || parsed.rawText || rawError);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`err-viewer-container ${compact ? 'compact' : ''}`}>
      <div className="err-viewer-top">
        <div className="err-viewer-badge-row">
          <span className="err-status-pill">
            {parsed.httpCode ? `🔴 ${parsed.httpCode}` : '🔴 LỖI API'}
          </span>
          <span className="err-viewer-title">
            {title || `Lỗi kết nối${providerName ? ` (${providerName})` : ''}`}
          </span>
        </div>

        <div className="err-viewer-actions">
          {onRescan && (
            <button
              type="button"
              className="err-act-btn primary"
              onClick={onRescan}
              disabled={isScanning}
              title="Thử dò lại danh sách model"
            >
              {isScanning ? '⏳ Đang dò...' : '🔄 Thử lại'}
            </button>
          )}

          {onEditKey && (
            <button
              type="button"
              className="err-act-btn"
              onClick={onEditKey}
              title="Chỉnh sửa cấu hình API Key"
            >
              ✏️ Sửa Key
            </button>
          )}

          {onManualModel && (
            <button
              type="button"
              className="err-act-btn"
              onClick={onManualModel}
              title="Nhập tên model thủ công"
            >
              ⌨️ Nhập model
            </button>
          )}

          <button
            type="button"
            className="err-act-btn copy"
            onClick={handleCopy}
            title="Sao chép toàn bộ nội dung lỗi để kiểm tra"
          >
            {copied ? '✓ Đã chép' : '📋 Chép log'}
          </button>

          <button
            type="button"
            className="err-act-btn toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Thu gọn chi tiết log' : 'Xem toàn bộ nội dung máy chủ trả về'}
          >
            {isExpanded ? '▲ Thu gọn' : '▼ Xem log'}
          </button>
        </div>
      </div>

      {/* Concise human-friendly summary message */}
      <div className="err-summary-text">
        {parsed.summary}
      </div>

      {/* Actionable suggestion hint if detected */}
      {parsed.hint && (
        <div className="err-hint-box">
          💡 <strong>Gợi ý:</strong> {parsed.hint}
        </div>
      )}

      {/* Expandable technical log block */}
      {isExpanded && (
        <div className="err-expanded-log">
          <div className="err-log-header">
            <span>Chi tiết phản hồi từ máy chủ (Server Response):</span>
            <span className="err-log-size">
              {parsed.formattedLog.length} ký tự
            </span>
          </div>
          <pre className="err-code-box">
            {parsed.formattedLog}
          </pre>
        </div>
      )}
    </div>
  );
};
