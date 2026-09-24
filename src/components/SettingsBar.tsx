import React from 'react';
import { Settings } from '../types';

interface SettingsBarProps {
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  showSysPanel: boolean;
  onToggleSysPanel: () => void;
  onClearChat: () => void;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  settings,
  onUpdateSettings,
  showSysPanel,
  onToggleSysPanel,
  onClearChat,
}) => {
  const tempPercent = Math.min(100, Math.max(0, (settings.temperature / 2) * 100));

  return (
    <section id="settingsBar">
      <div className="ctrl" title="Độ sáng tạo (Temperature: 0.00 đến 2.00, mặc định: 1.00)">
        <span>Temp:</span>
        <input
          id="tempRange"
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={settings.temperature}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onUpdateSettings({ temperature: Math.round(val * 100) / 100 });
            }
          }}
          style={{
            width: '90px',
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${tempPercent}%, rgba(255, 255, 255, 0.15) ${tempPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
          }}
        />
        <input
          id="tempValInput"
          type="number"
          className="num"
          min="0"
          max="2"
          step="0.01"
          value={settings.temperature}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              const clamped = Math.min(2, Math.max(0, Math.round(val * 100) / 100));
              onUpdateSettings({ temperature: clamped });
            }
          }}
          style={{
            width: '54px',
            padding: '2px 4px',
            fontSize: '11.5px',
            textAlign: 'center',
            fontFamily: 'ui-monospace, monospace',
            height: '24px',
          }}
          title="Nhập trực tiếp giá trị Temperature từ 0.00 đến 2.00 (mặc định 1.00)"
        />
      </div>

      <label className="ctrl" title="Giới hạn số token tối đa cho câu trả lời (Mặc định: 8192, hỗ trợ tới 131072+)">
        <span>Max tokens:</span>
        <input
          id="maxTokensInput"
          type="number"
          className="num"
          value={settings.maxTokens}
          min="1"
          max="1000000"
          step="256"
          style={{ width: '74px', padding: '2px 6px', fontSize: '11.5px', height: '24px' }}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) {
              onUpdateSettings({ maxTokens: val });
            }
          }}
        />
      </label>

      <label className="switch ctrl" title="Nhận câu trả lời từng chữ liên tục">
        <input
          id="streamToggle"
          type="checkbox"
          checked={settings.stream}
          onChange={(e) => onUpdateSettings({ stream: e.target.checked })}
        />
        <span>Stream</span>
      </label>

      <label
        className={`switch nsfw ctrl ${settings.nsfw ? 'active-nsfw' : ''}`}
        title="Bật/tắt chế độ sáng tạo tự do mở rộng (Creative Mode)"
        style={{
          background: settings.nsfw ? 'linear-gradient(135deg, rgba(255, 51, 102, 0.22), rgba(255, 107, 139, 0.15))' : 'transparent',
          border: settings.nsfw ? '1px solid #ff4d79' : '1px solid transparent',
          padding: '4px 10px',
          borderRadius: '9px',
          transition: 'all 0.2s ease',
          boxShadow: settings.nsfw ? '0 0 12px rgba(255, 51, 102, 0.3)' : 'none',
        }}
      >
        <input
          id="nsfwToggle"
          type="checkbox"
          checked={settings.nsfw}
          style={{ accentColor: '#ff3366', cursor: 'pointer' }}
          onChange={(e) => onUpdateSettings({ nsfw: e.target.checked })}
        />
        <span style={{ color: settings.nsfw ? '#ff859d' : 'var(--fg2)', fontWeight: settings.nsfw ? 700 : 500, fontSize: '13px' }}>
          🔞 18+
        </span>
      </label>

      <button
        id="toggleSysBtn"
        className="btn-ghost small"
        style={{
          marginLeft: 'auto',
          borderColor: showSysPanel ? 'var(--accent)' : 'var(--line)',
          color: showSysPanel ? 'var(--fg)' : 'var(--fg2)',
          background: showSysPanel ? 'var(--bg3)' : 'transparent',
        }}
        onClick={onToggleSysPanel}
        title="Bật/tắt khung chỉnh sửa System Prompt"
      >
        ⚙️ System prompt {showSysPanel ? '▲' : '▼'}
      </button>

      <button
        id="clearChatBtn"
        className="btn-ghost small"
        title="Xoá toàn bộ lịch sử trò chuyện của nhà cung cấp này"
        onClick={onClearChat}
      >
        🗑️ Xoá chat
      </button>
    </section>
  );
};
