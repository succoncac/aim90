import React, { useState, useEffect } from 'react';
import { ApiFormat, Preset, Provider } from '../types';
import { DEFAULT_PRESETS } from '../constants';
import { detectFormat, fetchProviderModels } from '../utils/apiAdapters';
import { ErrorLogViewer } from './ErrorLogViewer';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProvider: Provider | null;
  currentModel?: string;
  myPresets: Preset[];
  onSaveProvider: (data: {
    name: string;
    baseUrl: string;
    format: ApiFormat;
    apiKey: string;
    saveAsPreset: boolean;
    detectedModels?: string[];
    defaultModel?: string;
  }) => void;
  onDeleteCustomPreset: (presetId: string) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  editingProvider,
  currentModel,
  myPresets,
  onSaveProvider,
  onDeleteCustomPreset,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');
  const [name, setName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [format, setFormat] = useState<ApiFormat>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saveAsPreset, setSaveAsPreset] = useState<boolean>(false);

  // Live test state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'err';
    models?: string[];
    error?: string;
  }>({ status: 'idle' });
  const [selectedDefaultModel, setSelectedDefaultModel] = useState<string>('');

  // Sync state when editingProvider changes or modal opens
  useEffect(() => {
    setTestResult({ status: 'idle' });
    setSelectedDefaultModel(currentModel || '');
    setIsTesting(false);

    if (editingProvider) {
      setName(editingProvider.name);
      setBaseUrl(editingProvider.baseUrl);
      setFormat(editingProvider.format || detectFormat(editingProvider.baseUrl));
      setApiKey(editingProvider.apiKey || '');
      setSelectedPresetId('custom');
      setSaveAsPreset(false);
      const initialChoice =
        editingProvider.pinnedModel ||
        (currentModel && editingProvider.models?.includes(currentModel)
          ? currentModel
          : (currentModel || editingProvider.models?.[0] || ''));
      setSelectedDefaultModel(initialChoice);
      if (editingProvider.models && editingProvider.models.length > 0) {
        setTestResult({ status: 'ok', models: editingProvider.models });
      }
    } else {
      // Default to OpenAI preset for convenient quickstart
      const openAiPreset = DEFAULT_PRESETS[0];
      setSelectedPresetId(openAiPreset.id);
      setName(openAiPreset.name);
      setBaseUrl(openAiPreset.baseUrl);
      setFormat(openAiPreset.format);
      setApiKey('');
      setSaveAsPreset(false);
    }
  }, [editingProvider, isOpen, currentModel]);

  if (!isOpen) return null;

  const detected = detectFormat(baseUrl);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') {
      return;
    }
    const found = [...myPresets, ...DEFAULT_PRESETS].find((p) => p.id === presetId);
    if (found) {
      setName(found.name);
      setBaseUrl(found.baseUrl);
      setFormat(found.format);
    }
  };

  const handleUrlChange = (val: string) => {
    setBaseUrl(val);
    const autoFmt = detectFormat(val);
    setFormat(autoFmt);
  };

  const isSelectedCustomPreset = myPresets.some((p) => p.id === selectedPresetId);

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      alert('Vui lòng nhập Base URL trước khi kiểm tra.');
      return;
    }
    setIsTesting(true);
    setTestResult({ status: 'loading' });
    try {
      const tempProv: Provider = {
        id: editingProvider?.id || 'temp',
        name: name.trim() || 'Nhà cung cấp',
        baseUrl: baseUrl.trim(),
        format,
        apiKey: apiKey.trim(),
        models: [],
        status: 'idle',
      };
      const foundModels = await fetchProviderModels(tempProv);
      if (foundModels.length === 0) {
        throw new Error('API kết nối được nhưng không tìm thấy mô hình AI (danh sách models rỗng).');
      }
      setTestResult({ status: 'ok', models: foundModels });
      // Giữ nguyên model người dùng đang chọn nếu có
      const preservedChoice = selectedDefaultModel || currentModel || '';
      if (preservedChoice && foundModels.includes(preservedChoice)) {
        setSelectedDefaultModel(preservedChoice);
      } else if (!selectedDefaultModel) {
        setSelectedDefaultModel(foundModels[0] || '');
      }
    } catch (err: any) {
      console.error('Test error in modal:', err);
      const errStr = err?.message || String(err);
      if (
        (format === 'gemini' || baseUrl.includes('generativelanguage')) &&
        (errStr.includes('API_KEY_SERVICE_BLOCKED') || errStr.includes('UNAUTHENTICATED'))
      ) {
        const fallbackModels = [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ];
        setTestResult({ status: 'ok', models: fallbackModels });
        const preservedChoice = selectedDefaultModel || currentModel || '';
        if (preservedChoice && fallbackModels.includes(preservedChoice)) {
          setSelectedDefaultModel(preservedChoice);
        } else {
          setSelectedDefaultModel(fallbackModels[0]);
        }
        return;
      }
      setTestResult({
        status: 'err',
        error: errStr,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp.');
      return;
    }
    if (!baseUrl.trim()) {
      alert('Vui lòng nhập Base URL.');
      return;
    }
    onSaveProvider({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      format,
      apiKey: apiKey.trim(),
      saveAsPreset,
      detectedModels: testResult.status === 'ok' ? testResult.models : undefined,
      defaultModel: selectedDefaultModel.trim() || undefined,
    });
  };

  return (
    <div id="provModal" className="modal" onClick={onClose}>
      <div 
        className="modal-card modal-liquid-floating"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h3 id="modalTitle">
            {editingProvider ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          </h3>
          <button 
            id="closeModalBtn" 
            className="icon-btn close-floating-btn" 
            onClick={onClose} 
            type="button"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-form-body">
          <div className="field">
            <label htmlFor="presetSelect">Mẫu có sẵn (Presets danh mục)</label>
            <div className="preset-row">
              <select
                id="presetSelect"
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
              >
                <option value="custom">✏️ Tự nhập nhà cung cấp (Custom)</option>

                {myPresets.length > 0 && (
                  <optgroup label="Của tôi (đã lưu)">
                    {myPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        ⭐ {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Phổ biến hàng đầu">
                  {DEFAULT_PRESETS.filter((p) => p.group === 'popular').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Dịch vụ khác">
                  {DEFAULT_PRESETS.filter((p) => p.group === 'other').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>

              {isSelectedCustomPreset && (
                <button
                  id="delPresetBtn"
                  type="button"
                  className="btn-ghost small"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => onDeleteCustomPreset(selectedPresetId)}
                  title="Xoá mẫu đã lưu này"
                >
                  Xoá mẫu
                </button>
              )}
            </div>
          </div>

          <div className="field-grid-2">
            <div className="field">
              <label htmlFor="provNameInput">Tên hiển thị</label>
              <input
                id="provNameInput"
                type="text"
                placeholder="VD: OpenAI, DeepSeek, Google Gemini..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="provFormatSelect">Định dạng kết nối API</label>
              <select
                id="provFormatSelect"
                value={format}
                onChange={(e) => setFormat(e.target.value as ApiFormat)}
              >
                <option value="openai">OpenAI tương thích (/v1/chat/completions)</option>
                <option value="anthropic">Anthropic Claude (/v1/messages)</option>
                <option value="gemini">Google Gemini (/v1beta/models)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="provUrlInput">Base URL API</label>
            <input
              id="provUrlInput"
              type="text"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              required
            />
            <div id="formatHint" className="hint" style={{ marginTop: 6 }}>
              <span>Định dạng tự nhận diện: <strong style={{ color: 'var(--accent1)' }}>{detected}</strong></span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="provKeyInput">API Key (Khoá truy cập)</label>
            <div className="key-row">
              <input
                id="provKeyInput"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-... (hoặc dán API key tại đây)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                id="toggleKeyVisBtn"
                className="icon-btn"
                type="button"
                title={showKey ? 'Ẩn key' : 'Hiện key'}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="fnote">
              🔒 Lưu trữ an toàn cục bộ trên thiết bị của bạn (Local Storage), hoàn toàn không qua máy chủ trung gian.
            </div>

            {/* Test Connection & Scan Models Button */}
            <button
              id="testConnBtn"
              type="button"
              className="btn-ghost"
              style={{
                width: '100%',
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                fontWeight: 600,
                padding: '8px 12px',
              }}
              disabled={isTesting}
              onClick={handleTestConnection}
            >
              {isTesting ? '⏳ Đang kiểm tra & dò danh sách model...' : '⚡ Thử kết nối & Dò model ngay'}
            </button>

            {/* Test Result Display: Loading / OK / Err */}
            {testResult.status === 'loading' && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg2)',
                  border: '1px solid var(--line)',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--fg2)',
                }}
              >
                <span>⏳ Đang gửi yêu cầu đến máy chủ API để kiểm tra API key và quét danh sách mô hình...</span>
              </div>
            )}

            {(() => {
              const availableModalModels =
                testResult.status === 'ok' && testResult.models && testResult.models.length > 0
                  ? testResult.models
                  : editingProvider?.models && editingProvider.models.length > 0
                  ? editingProvider.models
                  : [];

              if (availableModalModels.length === 0) return null;

              return (
                <div
                  style={{
                    marginTop: 10,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: testResult.status === 'ok' ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg3)',
                    border: testResult.status === 'ok' ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--line)',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong
                      style={{
                        color: testResult.status === 'ok' ? 'var(--success)' : 'var(--fg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{testResult.status === 'ok' ? '✅ KẾT NỐI THÀNH CÔNG!' : '🔒 MÔ HÌNH GHIM CỐ ĐỊNH'}</span>
                      <span>(Có {availableModalModels.length} model)</span>
                    </strong>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <label
                      htmlFor="testDefaultModelSelect"
                      style={{ fontSize: 11.5, color: 'var(--fg2)', display: 'block', marginBottom: 4 }}
                    >
                      Chọn mô hình AI ghim cố định (Không bao giờ tự ý nhảy model khi dò lại):
                    </label>
                    <select
                      id="testDefaultModelSelect"
                      value={selectedDefaultModel}
                      onChange={(e) => setSelectedDefaultModel(e.target.value)}
                      style={{ width: '100%', fontSize: 13 }}
                    >
                      {selectedDefaultModel && !availableModalModels.includes(selectedDefaultModel) && (
                        <option key={selectedDefaultModel} value={selectedDefaultModel}>
                          {selectedDefaultModel} (Đang dùng)
                        </option>
                      )}
                      {availableModalModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11.5,
                        color: 'var(--fg2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>🔒</span>
                      <span>
                        Model này được lưu cố định. Khi bấm nút dò lại, hệ thống sẽ KHÔNG tự nhảy sang model khác đắt tiền.
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {testResult.status === 'err' && testResult.error && (
              <div style={{ marginTop: 10 }}>
                <ErrorLogViewer
                  rawError={testResult.error}
                  title="Lỗi kiểm tra kết nối API"
                  compact={true}
                />
              </div>
            )}
          </div>

          <div className="chk-line custom-checkbox-row">
            <input
              id="saveAsPresetChk"
              type="checkbox"
              checked={saveAsPreset}
              onChange={(e) => setSaveAsPreset(e.target.checked)}
            />
            <label htmlFor="saveAsPresetChk">Lưu nhà cung cấp này vào danh sách Mẫu của tôi để tái sử dụng</label>
          </div>

          <div className="modal-actions">
            <button
              id="cancelModalBtn"
              type="button"
              className="btn-ghost"
              onClick={onClose}
            >
              Huỷ
            </button>
            <button id="saveProvBtn" type="submit" className="btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

