import React, { useState } from 'react';
import { Provider } from '../types';
import { ErrorLogViewer } from './ErrorLogViewer';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  activeProviderId: string | null;
  onSelectProvider: (id: string) => void;
  onAddProvider: () => void;
  onEditProvider: (prov: Provider) => void;
  onDeleteProvider: (id: string) => void;
  onRescanProvider: (prov: Provider) => void;
  contextLimit: number;
  onChangeContextLimit: (limit: number) => void;
  onClearAllData: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  providers,
  activeProviderId,
  onSelectProvider,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onRescanProvider,
  contextLimit,
  onChangeContextLimit,
  onClearAllData,
  onExportBackup,
  onImportBackup,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2500);
  };

  return (
    <>
      <aside id="sidebar" className={isOpen ? 'open' : ''}>
        <div className="side-top">
          <div className="brand">
            <div className="logo">⚡</div>
            <span>AI</span>
          </div>
          <button
            id="closeSidebarBtn"
            className="icon-btn mobile-only"
            title="Đóng menu"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="disclaimer">
          🔒 <strong>Bảo mật:</strong> API key chỉ lưu tại localStorage trình duyệt và gửi thẳng tới nhà cung cấp đã chọn.
        </p>

        <div className="providers" id="providersList">
          {providers.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 8px' }}>
              Chưa có nhà cung cấp nào. Hãy nhấn Thêm bên dưới!
            </div>
          ) : (
            providers.map((prov) => {
              const isActive = prov.id === activeProviderId;
              const modelCount = prov.models?.length || 0;

              return (
                <div
                  key={prov.id}
                  className={`prov ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectProvider(prov.id)}
                >
                  <div className="prov-top">
                    <span className={`dot ${prov.status || 'idle'}`} />
                    <span className="prov-name" title={prov.name}>
                      {prov.name}
                    </span>
                    <span className="chip">{prov.format || 'openai'}</span>
                    {isActive && <span className="active-pill">Đang chọn</span>}
                  </div>

                  {/* 1. Đường link API đầy đủ, không bị cắt xén */}
                  <div className="prov-url-box">
                    <div className="prov-url-head">
                      <span className="prov-url-title">🔗 Đường link API:</span>
                      <button
                        type="button"
                        className="prov-mini-copy"
                        title="Sao chép đường link này"
                        onClick={(e) => handleCopyText(`url-${prov.id}`, prov.baseUrl, e)}
                      >
                        {copiedId === `url-${prov.id}` ? '✓ Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                    <div className="prov-url-val" title={prov.baseUrl}>
                      {prov.baseUrl}
                    </div>
                  </div>

                  {/* 2. Trạng thái kết nối thành công hoặc toàn bộ mã lỗi chi tiết */}
                  {prov.status === 'ok' ? (
                    <div className="prov-status-panel ok">
                      <div className="status-panel-head">
                        <span className="status-badge ok">🟢 KẾT NỐI THÀNH CÔNG</span>
                        <span className="status-count">{modelCount} model{modelCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="status-panel-body">
                        {prov.statusText || `Đã kết nối thành công và tải ${modelCount} mô hình AI.`}
                      </div>
                    </div>
                  ) : prov.status === 'err' ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <ErrorLogViewer
                        rawError={prov.statusText || 'Không thể kết nối đến nhà cung cấp API.'}
                        compact={true}
                        onRescan={() => onRescanProvider(prov)}
                        isScanning={prov.status === 'loading'}
                        onEditKey={() => onEditProvider(prov)}
                      />
                    </div>
                  ) : prov.status === 'loading' ? (
                    <div className="prov-status-panel loading">
                      <div className="status-panel-head">
                        <span className="status-badge loading">⏳ ĐANG KIỂM TRA KẾT NỐI...</span>
                      </div>
                      <div className="status-panel-body">
                        {prov.statusText || 'Đang gửi yêu cầu kiểm tra và lấy danh sách model...'}
                      </div>
                    </div>
                  ) : (
                    <div className="prov-status-panel idle">
                      <div className="status-panel-head">
                        <span className="status-badge idle">⚪ CHƯA KIỂM TRA</span>
                        <span className="status-count">{modelCount > 0 ? `${modelCount} models` : 'Chưa có model'}</span>
                      </div>
                      <div className="status-panel-body">
                        {modelCount > 0
                          ? `Đã lưu sẵn ${modelCount} models. Nhấn "Dò model" để làm mới.`
                          : 'Nhấn nút "Dò model" bên dưới để kiểm tra kết nối & tải danh sách model.'}
                      </div>
                    </div>
                  )}

                  <div className="prov-actions">
                    <button
                      type="button"
                      title="Dò lại danh sách model"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRescanProvider(prov);
                      }}
                      disabled={prov.status === 'loading'}
                    >
                      🔄 {prov.status === 'loading' ? 'Đang dò...' : 'Dò model'}
                    </button>
                    <button
                      type="button"
                      title="Chỉnh sửa cấu hình"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProvider(prov);
                      }}
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      type="button"
                      className="danger"
                      title="Xoá nhà cung cấp này"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProvider(prov.id);
                      }}
                    >
                      🗑️ Xoá
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button id="addProvBtn" className="btn-add" onClick={onAddProvider}>
          + Thêm nhà cung cấp
        </button>

        <div className="side-bottom">
          <div className="row">
            <span>Ngữ cảnh gửi</span>
            <select
              id="contextSelect"
              value={contextLimit}
              onChange={(e) => onChangeContextLimit(Number(e.target.value))}
            >
              <option value="0">Tất cả hội thoại</option>
              <option value="6">6 tin gần nhất</option>
              <option value="12">12 tin gần nhất</option>
              <option value="20">20 tin gần nhất</option>
              <option value="40">40 tin gần nhất</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              id="exportBackupBtn"
              className="btn-ghost small"
              style={{ flex: 1, padding: '5px 4px', textAlign: 'center' }}
              onClick={onExportBackup}
              title="Tải file sao lưu (JSON) chứa API key và cấu hình"
            >
              💾 Sao lưu
            </button>
            <label
              id="importBackupLabel"
              className="btn-ghost small"
              style={{ flex: 1, padding: '5px 4px', textAlign: 'center', cursor: 'pointer', display: 'inline-block' }}
              title="Khôi phục dữ liệu từ file sao lưu JSON"
            >
              📥 Khôi phục
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImportBackup(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          <button
            id="clearAllBtn"
            className="btn-ghost small"
            style={{ color: 'var(--danger)', marginTop: 8 }}
            onClick={onClearAllData}
            title="Xoá tất cả API key, lịch sử và thiết lập đã lưu"
          >
            🗑️ Xoá toàn bộ dữ liệu
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="overlay"
          onClick={onClose}
          style={{ display: 'block' }}
        />
      )}
    </>
  );
};
