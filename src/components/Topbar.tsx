import React from 'react';
import { Provider } from '../types';

interface TopbarProps {
  onOpenSidebar: () => void;
  activeProvider: Provider | null;
  onEditActiveProvider: () => void;
  models: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isManualModel: boolean;
  onToggleManualModel: () => void;
  manualModelName: string;
  onChangeManualModelName: (name: string) => void;
  onRescanModels: () => void;
  isScanning: boolean;
  statusInfo: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenSidebar,
  activeProvider,
  onEditActiveProvider,
  models,
  selectedModel,
  onSelectModel,
  isManualModel,
  onToggleManualModel,
  manualModelName,
  onChangeManualModelName,
  onRescanModels,
  isScanning,
  statusInfo,
}) => {
  return (
    <header id="topbar">
      <button
        id="openSidebarBtn"
        className="icon-btn mobile-only"
        title="Mở menu nhà cung cấp"
        onClick={onOpenSidebar}
      >
        ☰
      </button>

      <button
        id="activeProvBtn"
        title={
          activeProvider
            ? `Nhà cung cấp: ${activeProvider.name} (${activeProvider.baseUrl})${
                activeProvider.statusText ? ` - ${activeProvider.statusText}` : ''
              }`
            : 'Nhấn để thêm nhà cung cấp'
        }
        onClick={onEditActiveProvider}
      >
        {activeProvider ? (
          <>
            <span className={`dot ${activeProvider.status || 'idle'}`} />
            <span className="prov-btn-label">{activeProvider.name}</span>
          </>
        ) : (
          '+ Thêm nhà cung cấp'
        )}
      </button>

      <div className="grow" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {isManualModel ? (
          <input
            id="modelInput"
            type="text"
            placeholder="Nhập tên model thủ công (VD: gpt-4o, claude-3-7-sonnet...)"
            value={manualModelName}
            onChange={(e) => onChangeManualModelName(e.target.value)}
            title={manualModelName || 'Nhập tên model'}
          />
        ) : (
          <select
            id="modelSelect"
            className="model-select"
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            disabled={!activeProvider}
            title={selectedModel || 'Chọn mô hình AI'}
          >
            {models.length === 0 ? (
              selectedModel ? (
                <option value={selectedModel}>{selectedModel} (Đang dùng)</option>
              ) : (
                <option value="">
                  {activeProvider?.status === 'err'
                    ? '🔴 Lỗi dò model (Nhấn 🔄 thử lại hoặc ✏️ nhập tay)'
                    : activeProvider?.status === 'loading'
                    ? '⏳ Đang quét danh sách model...'
                    : '(Chưa có model - Nhấn 🔄 để dò)'}
                </option>
              )
            ) : (
              <>
                {selectedModel && !models.includes(selectedModel) && (
                  <option key={selectedModel} value={selectedModel}>
                    {selectedModel} (Đang dùng)
                  </option>
                )}
                {models.map((m) => (
                  <option key={m} value={m} title={m}>
                    {m}
                  </option>
                ))}
              </>
            )}
          </select>
        )}
      </div>

      <button
        id="toggleManualModelBtn"
        className="icon-btn"
        title={isManualModel ? 'Chuyển sang danh sách chọn' : 'Nhập model thủ công'}
        style={{ color: isManualModel ? 'var(--accent)' : 'inherit' }}
        onClick={onToggleManualModel}
      >
        ✏️
      </button>

      <button
        id="rescanModelsBtn"
        className="icon-btn"
        title="Dò lại danh sách model cho nhà cung cấp hiện tại"
        onClick={onRescanModels}
        disabled={!activeProvider || isScanning}
      >
        {isScanning ? '⏳' : '🔄'}
      </button>

      <div id="reqInfoEl" className="req-info" title={statusInfo}>
        {statusInfo}
      </div>
    </header>
  );
};
