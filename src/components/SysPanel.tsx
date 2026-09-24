import React from 'react';
import { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { RefreshCw } from 'lucide-react';

interface SysPanelProps {
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export const SysPanel: React.FC<SysPanelProps> = ({ settings, onUpdateSettings }) => {
  const isNsfw = settings.nsfw;
  const currentValue = isNsfw ? settings.systemNSFW : settings.systemNormal;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isNsfw) {
      onUpdateSettings({ systemNSFW: e.target.value });
    } else {
      onUpdateSettings({ systemNormal: e.target.value });
    }
  };

  const handleReset = () => {
    if (isNsfw) {
      onUpdateSettings({ systemNSFW: DEFAULT_SETTINGS.systemNSFW });
    } else {
      onUpdateSettings({ systemNormal: DEFAULT_SETTINGS.systemNormal });
    }
  };

  return (
    <div id="sysPanel" className="sys-panel-container">
      <textarea
        id="sysText"
        rows={4}
        placeholder={
          isNsfw
            ? 'Nhập chỉ dẫn câu chuyện, mô tả nhân vật, lời thoại, bối cảnh nhập vai...'
            : 'Nhập chỉ dẫn hệ thống (VD: Bạn là một chuyên gia lập trình & sáng tạo chuyên sâu...)'
        }
        value={currentValue}
        onChange={handleChange}
      />

      <div className="sys-actions flex items-center justify-between mt-1 text-xs">
        <span className="hint text-slate-400">
          ✓ Tự động gửi kèm chỉ dẫn hệ thống trong các lượt trò chuyện
        </span>
        <button
          id="resetSysBtn"
          className="btn-ghost small flex items-center gap-1 text-slate-400 hover:text-slate-200"
          style={{ marginLeft: 'auto' }}
          onClick={handleReset}
          title="Khôi phục prompt mặc định"
        >
          <RefreshCw size={12} />
          Khôi phục mặc định
        </button>
      </div>
    </div>
  );
};
