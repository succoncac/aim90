import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ApiFormat, AppState, ChatMessage, NetworkTransport, Preset, Provider, Settings } from './types';
import { DEFAULT_PRESETS, DEFAULT_SETTINGS, REFUSAL_REGEX, STORAGE_KEY } from './constants';
import { executeChat, fetchProviderModels, filterModels } from './utils/apiAdapters';
import {
  loadAppState,
  saveAppState,
  clearAllAppState,
  exportStateAsJson,
  importStateFromJson,
} from './utils/storage';
import { resolveFileAttachmentsFromConversation } from './utils/exportUtils';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SettingsBar } from './components/SettingsBar';
import { SysPanel } from './components/SysPanel';
import { MessagesView } from './components/MessagesView';
import { Composer } from './components/Composer';
import { ProviderModal } from './components/ProviderModal';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { ErrorLogViewer } from './components/ErrorLogViewer';
import { SecurityShieldOverlay } from './components/SecurityShieldOverlay';
import { securityShield, SecurityStatus } from './utils/securityShield';

export default function App() {
  // Application State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [manualModelMap, setManualModelMap] = useState<Record<string, boolean>>({});
  const [manualModelNames, setManualModelNames] = useState<Record<string, string>>({});
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [myPresets, setMyPresets] = useState<Preset[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showSysPanel, setShowSysPanel] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_console_draft_input') || '';
    } catch {
      return '';
    }
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>(() => securityShield.getStatus());

  const abortControllerRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Initialize Security Shield to protect source code against F12, bots, and scrapers
  useEffect(() => {
    securityShield.init();
    const unsubscribe = securityShield.subscribe((status) => {
      setSecurityStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-save draft input to localStorage whenever typing
  useEffect(() => {
    try {
      if (inputMessage) {
        localStorage.setItem('ai_console_draft_input', inputMessage);
      } else {
        localStorage.removeItem('ai_console_draft_input');
      }
    } catch {
      // Ignore quota errors
    }
  }, [inputMessage]);

  // Show Toast
  const triggerToast = (msg: string, isErr = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastIsError(isErr);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Load from IndexedDB & LocalStorage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const parsed = await loadAppState();
        if (!isMounted) return;
        if (parsed) {
          if (parsed.providers && Array.isArray(parsed.providers)) {
            const cleanProviders = parsed.providers.filter(
              (p) => p.id !== 'prov-openai-sample' && p.id !== 'prov-gemini-sample'
            );
            setProviders(cleanProviders);
            if (parsed.activeProviderId && cleanProviders.some((p) => p.id === parsed.activeProviderId)) {
              setActiveProviderId(parsed.activeProviderId);
            } else {
              setActiveProviderId(cleanProviders[0]?.id || null);
            }
          } else {
            initDefaultProviders();
          }
          if (parsed.selectedModels) setSelectedModels(parsed.selectedModels);
          if (parsed.manualModelMap) setManualModelMap(parsed.manualModelMap);
          if (parsed.manualModelNames) setManualModelNames(parsed.manualModelNames);
          if (parsed.conversations) setConversations(parsed.conversations);
          if (parsed.myPresets) setMyPresets(parsed.myPresets);
          if (parsed.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
          }
        } else {
          initDefaultProviders();
        }
      } catch (e) {
        console.error('Error loading state:', e);
        if (isMounted) initDefaultProviders();
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const initDefaultProviders = () => {
    setProviders([]);
    setActiveProviderId(null);
    setSelectedModels({});
  };

  // Save to IndexedDB and LocalStorage on state change (only after initial load completes)
  useEffect(() => {
    if (!isLoaded) return;
    const toSave: AppState = {
      providers,
      activeProviderId,
      selectedModels,
      manualModelMap,
      manualModelNames,
      conversations,
      myPresets,
      settings,
    };
    saveAppState(toSave);
  }, [
    isLoaded,
    providers,
    activeProviderId,
    selectedModels,
    manualModelMap,
    manualModelNames,
    conversations,
    myPresets,
    settings,
  ]);

  // Active provider object
  const activeProvider = useMemo(() => {
    return providers.find((p) => p.id === activeProviderId) || providers[0] || null;
  }, [providers, activeProviderId]);

  // Filtered models for active provider
  const availableModels = useMemo(() => {
    if (!activeProvider) return [];
    const raw = activeProvider.models || [];
    const filtered = filterModels(raw, settings.filterChatModels);
    // BẢO VỆ: Nếu đã chọn hoặc đã ghim model, luôn giữ model đó trong danh sách chọn
    const activeChoice = selectedModels[activeProvider.id] || activeProvider.pinnedModel;
    if (activeChoice && !filtered.includes(activeChoice)) {
      return [activeChoice, ...filtered];
    }
    return filtered;
  }, [activeProvider, settings.filterChatModels, selectedModels]);

  // Current selected model name for active provider
  const currentModelName = useMemo(() => {
    if (!activeProvider) return '';
    const provId = activeProvider.id;
    const isManual = manualModelMap[provId] || false;
    if (isManual) {
      return manualModelNames[provId] || '';
    }
    const selected = selectedModels[provId] || activeProvider.pinnedModel;
    if (selected) {
      return selected;
    }
    return availableModels[0] || '';
  }, [activeProvider, manualModelMap, manualModelNames, selectedModels, availableModels]);

  // Active provider's conversation
  const currentMessages = useMemo(() => {
    if (!activeProvider) return [];
    return conversations[activeProvider.id] || [];
  }, [activeProvider, conversations]);

  // Scan models for a specific provider
  const handleRescanProvider = async (prov: Provider) => {
    setIsScanning(true);
    setProviders((prev) =>
      prev.map((p) =>
        p.id === prov.id ? { ...p, status: 'loading', statusText: 'Đang kết nối dò model...' } : p
      )
    );

    try {
      const foundModels = await fetchProviderModels(prov, settings);
      if (foundModels.length === 0) {
        throw new Error('Không tìm thấy model nào từ phản hồi của API.');
      }

      setProviders((prev) =>
        prev.map((p) =>
          p.id === prov.id
            ? {
                ...p,
                models: foundModels,
                status: 'ok',
                statusText: `✓ Tìm thấy ${foundModels.length} models`,
                lastChecked: Date.now(),
              }
            : p
        )
      );

      // QUAN TRỌNG: Tuyệt đối giữ nguyên model đang chọn hoặc model ghim cố định, không reset về model mới nhất đắt tiền
      setSelectedModels((prev) => {
        const currentChoice = prev[prov.id] || prov.pinnedModel;
        if (currentChoice) {
          return { ...prev, [prov.id]: currentChoice }; // Giữ nguyên 100%
        }
        const filtered = filterModels(foundModels, settings.filterChatModels);
        const defaultChoice = filtered[0] || foundModels[0] || '';
        return { ...prev, [prov.id]: defaultChoice };
      });

      triggerToast(`✓ [${prov.name}] Dò thành công ${foundModels.length} models! (Đã giữ nguyên model đang chọn)`);
    } catch (err: any) {
      console.error('Scan error:', err);
      const errMsg = err?.message || 'Không thể kết nối đến nhà cung cấp';

      // Auto recovery for Gemini if blocked by ListModels restriction
      if (
        (prov.format === 'gemini' || prov.baseUrl.includes('generativelanguage')) &&
        (errMsg.includes('API_KEY_SERVICE_BLOCKED') || errMsg.includes('UNAUTHENTICATED'))
      ) {
        const fallbackList = [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
          'gemini-2.0-pro-exp-02-05',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ];
        setProviders((prev) =>
          prev.map((p) =>
            p.id === prov.id
              ? {
                  ...p,
                  models: fallbackList,
                  status: 'ok',
                  statusText: '✓ Đã nạp 6 model Gemini chính thức (Bỏ qua giới hạn ListModels để chat ngay)',
                  lastChecked: Date.now(),
                }
              : p
          )
        );
        setSelectedModels((prev) => {
          const currentChoice = prev[prov.id] || prov.pinnedModel;
          if (currentChoice) {
            return { ...prev, [prov.id]: currentChoice }; // Giữ nguyên model đang dùng
          }
          return { ...prev, [prov.id]: fallbackList[0] };
        });
        triggerToast(`✓ [${prov.name}] Đã nạp 6 model Gemini. (Đã giữ nguyên model đang chọn)`);
        return;
      }

      setProviders((prev) =>
        prev.map((p) =>
          p.id === prov.id
            ? {
                ...p,
                status: 'err',
                statusText: errMsg,
              }
            : p
        )
      );
      triggerToast(`❌ Lỗi dò model [${prov.name}]: ${errMsg.slice(0, 120)}`, true);
    } finally {
      setIsScanning(false);
    }
  };

  // Add / Edit Provider Save Handler
  const handleSaveProvider = (data: {
    name: string;
    baseUrl: string;
    format: ApiFormat;
    apiKey: string;
    saveAsPreset: boolean;
    detectedModels?: string[];
    defaultModel?: string;
  }) => {
    const hasTestedModels = Array.isArray(data.detectedModels) && data.detectedModels.length > 0;
    const pinnedModel = data.defaultModel?.trim() || (editingProvider ? editingProvider.pinnedModel : undefined);

    if (editingProvider) {
      // Update existing provider
      const updatedModels = hasTestedModels ? data.detectedModels! : editingProvider.models;
      const updatedStatus = hasTestedModels ? 'ok' : 'idle';
      const updatedStatusText = hasTestedModels
        ? `Đã tìm thấy ${data.detectedModels!.length} mô hình AI.`
        : undefined;

      setProviders((prev) =>
        prev.map((p) =>
          p.id === editingProvider.id
            ? {
                ...p,
                name: data.name,
                baseUrl: data.baseUrl,
                format: data.format,
                apiKey: data.apiKey,
                models: updatedModels,
                status: updatedStatus,
                statusText: updatedStatusText,
                pinnedModel: pinnedModel,
              }
            : p
        )
      );

      if (pinnedModel) {
        setSelectedModels((prev) => ({ ...prev, [editingProvider.id]: pinnedModel }));
      }

      triggerToast(`Đã cập nhật: ${data.name}${pinnedModel ? ` (Ghim: ${pinnedModel})` : ''}`);

      // If user did not test connection in modal but provided an API key, trigger scan
      if (!hasTestedModels && data.apiKey) {
        const provToScan: Provider = {
          ...editingProvider,
          name: data.name,
          baseUrl: data.baseUrl,
          format: data.format,
          apiKey: data.apiKey,
          pinnedModel: pinnedModel,
        };
        setTimeout(() => handleRescanProvider(provToScan), 300);
      }
    } else {
      // Add new provider
      const newId = `prov-${Date.now()}`;
      const newProv: Provider = {
        id: newId,
        name: data.name,
        baseUrl: data.baseUrl,
        format: data.format,
        apiKey: data.apiKey,
        models: hasTestedModels ? data.detectedModels! : [],
        status: hasTestedModels ? 'ok' : 'idle',
        statusText: hasTestedModels
          ? `Đã tìm thấy ${data.detectedModels!.length} mô hình AI.`
          : undefined,
        pinnedModel: pinnedModel,
      };
      setProviders((prev) => [...prev, newProv]);
      setActiveProviderId(newId);

      if (pinnedModel) {
        setSelectedModels((prev) => ({ ...prev, [newId]: pinnedModel }));
      } else if (hasTestedModels && data.detectedModels![0]) {
        setSelectedModels((prev) => ({ ...prev, [newId]: data.detectedModels![0] }));
      }

      triggerToast(`Đã thêm: ${data.name}${pinnedModel ? ` (Ghim: ${pinnedModel})` : ''}`);

      // If user supplied an API key and wasn't tested in modal, automatically trigger model scan
      if (!hasTestedModels && data.apiKey) {
        setTimeout(() => handleRescanProvider(newProv), 300);
      }
    }

    // Save as Custom Preset if requested
    if (data.saveAsPreset) {
      const presetId = `preset-custom-${Date.now()}`;
      const newCustomPreset: Preset = {
        id: presetId,
        name: data.name,
        baseUrl: data.baseUrl,
        format: data.format,
        group: 'custom',
        isCustom: true,
      };
      setMyPresets((prev) => [...prev, newCustomPreset]);
      triggerToast(`Đã lưu "${data.name}" vào danh sách Mẫu của tôi!`);
    }

    setModalOpen(false);
    setEditingProvider(null);
  };

  // Delete Provider
  const handleDeleteProvider = (id: string) => {
    const prov = providers.find((p) => p.id === id);
    if (!prov) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá nhà cung cấp',
      message: `Bạn có chắc muốn xoá nhà cung cấp "${prov.name}" không? Toàn bộ thiết lập và mô hình liên kết sẽ bị gỡ bỏ.`,
      confirmText: 'Xoá ngay',
      variant: 'danger',
      onConfirm: () => {
        const remaining = providers.filter((p) => p.id !== id);
        setProviders(remaining);
        if (activeProviderId === id) {
          setActiveProviderId(remaining[0]?.id || null);
        }
        triggerToast(`Đã xoá nhà cung cấp: ${prov.name}`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (presetId: string) => {
    setMyPresets((prev) => prev.filter((p) => p.id !== presetId));
    triggerToast('Đã xoá mẫu tuỳ chỉnh');
  };

  // Clear all saved data
  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá toàn bộ dữ liệu',
      message: 'CẢNH BÁO: Thao tác này sẽ xoá TOÀN BỘ dữ liệu API key, lịch sử trò chuyện và cài đặt đã lưu trong trình duyệt. Bạn có chắc chắn muốn tiếp tục?',
      confirmText: 'Xoá tất cả',
      variant: 'danger',
      onConfirm: async () => {
        await clearAllAppState();
        initDefaultProviders();
        setConversations({});
        setMyPresets([]);
        setSettings(DEFAULT_SETTINGS);
        triggerToast('Đã xoá toàn bộ dữ liệu đã lưu!');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Export backup JSON file
  const handleExportBackup = () => {
    const currentState: AppState = {
      providers,
      activeProviderId,
      selectedModels,
      manualModelMap,
      manualModelNames,
      conversations,
      myPresets,
      settings,
    };
    exportStateAsJson(currentState);
    triggerToast('Đã tải xuống file sao lưu JSON!');
  };

  // Import backup JSON / HTML file
  const handleImportBackup = async (file: File) => {
    try {
      const imported = await importStateFromJson(file);
      if (imported.providers && Array.isArray(imported.providers)) {
        setProviders(imported.providers);
        setActiveProviderId(imported.activeProviderId || imported.providers[0]?.id || null);
      }
      if (imported.selectedModels) setSelectedModels(imported.selectedModels);
      if (imported.manualModelMap) setManualModelMap(imported.manualModelMap);
      if (imported.manualModelNames) setManualModelNames(imported.manualModelNames);
      if (imported.conversations) setConversations(imported.conversations);
      if (imported.myPresets) setMyPresets(imported.myPresets);
      if (imported.settings) setSettings({ ...DEFAULT_SETTINGS, ...imported.settings });

      await saveAppState(imported);
      triggerToast('Khôi phục dữ liệu thành công!');
    } catch (err: any) {
      triggerToast(`Lỗi khôi phục: ${err?.message || 'File không hợp lệ'}`, true);
    }
  };

  // Clear chat for current provider
  const handleClearChat = () => {
    if (!activeProvider) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá lịch sử hội thoại',
      message: `Xoá toàn bộ lịch sử trò chuyện của "${activeProvider.name}"? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xoá chat',
      variant: 'danger',
      onConfirm: () => {
        setConversations((prev) => ({ ...prev, [activeProvider.id]: [] }));
        triggerToast('Đã xoá hội thoại hiện tại');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Delete single message
  const handleDeleteMessage = (msgId: string) => {
    if (!activeProvider) return;
    setConversations((prev) => ({
      ...prev,
      [activeProvider.id]: (prev[activeProvider.id] || []).filter((m) => m.id !== msgId),
    }));
  };

  // Copy message content
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    triggerToast('Đã sao chép nội dung tin nhắn!');
  };

  // Stop generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsThinking(false);
    triggerToast('Đã dừng phản hồi');
  };

  // Send message
  const handleSendMessage = async () => {
    if (!activeProvider) {
      triggerToast('Vui lòng chọn hoặc thêm nhà cung cấp trước!', true);
      return;
    }

    const text = inputMessage.trim();
    if (!text || isGenerating) return;

    const modelToUse = currentModelName;
    if (!modelToUse) {
      triggerToast('Vui lòng chọn model hoặc nhập tên model thủ công!', true);
      return;
    }

    const provId = activeProvider.id;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedHistory = [...(conversations[provId] || []), userMsg];
    setConversations((prev) => ({ ...prev, [provId]: updatedHistory }));
    setInputMessage('');

    // Trigger AI execution with anti-refusal loop
    await runAiChatFlow({
      provider: activeProvider,
      model: modelToUse,
      history: updatedHistory,
      retryAttempt: 0,
    });
  };

  // Retry last assistant message
  const handleRetryLastMessage = async () => {
    if (!activeProvider || isGenerating) return;
    const provId = activeProvider.id;
    const history = conversations[provId] || [];
    if (history.length === 0) return;

    // Remove last assistant message if present
    let cleanHistory = [...history];
    if (cleanHistory[cleanHistory.length - 1].role === 'assistant') {
      cleanHistory.pop();
    }
    if (cleanHistory.length === 0) return;

    setConversations((prev) => ({ ...prev, [provId]: cleanHistory }));

    await runAiChatFlow({
      provider: activeProvider,
      model: currentModelName,
      history: cleanHistory,
      retryAttempt: 0,
    });
  };

  // Core execution flow with Anti-Refusal 3-Attempt Auto-Retry
  const runAiChatFlow = async (params: {
    provider: Provider;
    model: string;
    history: ChatMessage[];
    retryAttempt: number;
  }) => {
    const { provider, model, history, retryAttempt } = params;
    const provId = provider.id;

    setIsGenerating(true);
    setIsThinking(true);
    setStreamingText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let rafId: number | null = null;
    let latestAccumulated = '';

    try {
      let currentAccumulated = '';

      // Ensure that if settings.systemPrompt is empty, it does not inject any default system message
      // that overrides the user's role-play configuration, while maintaining persona consistency logic
      // by respecting the user's defined system context.
      const effectiveSettings: Settings = {
        ...settings,
        systemPrompt:
          typeof settings.systemPrompt === 'string'
            ? settings.systemPrompt
            : undefined,
      };

      const result = await executeChat({
        provider,
        model,
        messages: history,
        settings: effectiveSettings,
        abortSignal: controller.signal,
        retryAttempt,
        onDelta: (_chunk, accumulated) => {
          setIsThinking(false);
          currentAccumulated = accumulated;
          latestAccumulated = accumulated;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              setStreamingText(latestAccumulated);
              rafId = null;
            });
          }
        },
      });

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setStreamingText(result.fullText || currentAccumulated);

      // Anti-Refusal check (Only in 18+ mode)
      if (settings.nsfw && result.isRefusal) {
        console.warn(`Anti-Refusal triggered on attempt ${retryAttempt + 1}. Detected refusal:`, result.fullText);

        if (retryAttempt < 3) {
          triggerToast(
            `⚠️ Đang tinh chỉnh phân vai (Lần ${retryAttempt + 1}/3)...`,
            true
          );

          // Retry with hardened nudge & next jailbreak strategy rotation if needed
          await new Promise((r) => setTimeout(r, 350));
          return await runAiChatFlow({
            provider,
            model,
            history,
            retryAttempt: retryAttempt + 1,
          });
        } else {
          // If the model actually returned non-empty text that was just borderline dialogue, keep it
          if (
            result.fullText &&
            result.fullText.trim().length > 30 &&
            !REFUSAL_REGEX.test(result.fullText.slice(0, 150).toLowerCase())
          ) {
            console.log('Accepting response instead of blocking:', result.fullText);
          } else {
            // Exceeded attempts
            const refusalMsg: ChatMessage = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ [BỘ LỌC AN TOÀN]: Mô hình "${model}" tạm thời bị hạn chế bởi bộ lọc từ chối của nhà cung cấp.\n\n💡 Bạn có thể:\n1. Bấm thử lại lần nữa hoặc chuyển sang mô hình linh hoạt hơn (như DeepSeek V3/R1, Llama 3, Mistral, Grok).\n2. Thêm bối cảnh nhập vai cụ thể trong ô System prompt.`,
              timestamp: Date.now(),
              isError: true,
            };
            setConversations((prev) => ({
              ...prev,
              [provId]: [...history, refusalMsg],
            }));
            triggerToast('Mô hình bị giới hạn bởi bộ lọc an toàn của nhà cung cấp.', true);
            return;
          }
        }
      }

      // Valid response received! Save to conversation
      const finalContent = result.fullText || currentAccumulated || '(Phản hồi rỗng)';

      // Kiểm tra nếu tin nhắn yêu cầu gần nhất của người dùng là yêu cầu tải file
      const lastUserMsg = [...history].reverse().find((m) => m.role === 'user');
      const attachedFiles = lastUserMsg
        ? resolveFileAttachmentsFromConversation(lastUserMsg.content, finalContent, history)
        : [];

      const finalAssistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now(),
        fileAttachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      };

      setConversations((prev) => ({
        ...prev,
        [provId]: [...history, finalAssistantMsg],
      }));
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('User aborted generation');
        return;
      }
      console.error('Chat execution failed:', err);
      const errText = err?.message || String(err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: errText,
        timestamp: Date.now(),
        isError: true,
      };
      setConversations((prev) => ({
        ...prev,
        [provId]: [...history, errMsg],
      }));
      setProviders((prev) =>
        prev.map((p) =>
          p.id === provId
            ? {
                ...p,
                status: 'err',
                statusText: errText,
              }
            : p
        )
      );
      triggerToast(`Lỗi: ${err?.message?.slice(0, 80) || 'Không thể nhận phản hồi'}`, true);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const isManual = activeProvider ? manualModelMap[activeProvider.id] || false : false;
  const manualModelVal = activeProvider ? manualModelNames[activeProvider.id] || '' : '';

  return (
    <div id="app">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        providers={providers}
        activeProviderId={activeProviderId}
        onSelectProvider={(id) => {
          setActiveProviderId(id);
          setSidebarOpen(false);
        }}
        onAddProvider={() => {
          setEditingProvider(null);
          setModalOpen(true);
        }}
        onEditProvider={(prov) => {
          setEditingProvider(prov);
          setModalOpen(true);
        }}
        onDeleteProvider={handleDeleteProvider}
        onRescanProvider={handleRescanProvider}
        contextLimit={settings.contextLimit}
        onChangeContextLimit={(c) => setSettings((s) => ({ ...s, contextLimit: c }))}
        onClearAllData={handleClearAllData}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <main id="main">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          activeProvider={activeProvider}
          onEditActiveProvider={() => {
            if (activeProvider) {
              setEditingProvider(activeProvider);
            } else {
              setEditingProvider(null);
            }
            setModalOpen(true);
          }}
          models={availableModels}
          selectedModel={currentModelName}
          onSelectModel={(model) => {
            if (activeProvider) {
              setSelectedModels((prev) => ({ ...prev, [activeProvider.id]: model }));
              // Khóa cố định ngay vào cấu hình provider để tránh bị reset khi bấm dò lại
              setProviders((prev) =>
                prev.map((p) => (p.id === activeProvider.id ? { ...p, pinnedModel: model } : p))
              );
            }
          }}
          isManualModel={isManual}
          onToggleManualModel={() => {
            if (activeProvider) {
              setManualModelMap((prev) => ({ ...prev, [activeProvider.id]: !isManual }));
            }
          }}
          manualModelName={manualModelVal}
          onChangeManualModelName={(name) => {
            if (activeProvider) {
              setManualModelNames((prev) => ({ ...prev, [activeProvider.id]: name }));
            }
          }}
          onRescanModels={() => {
            if (activeProvider) handleRescanProvider(activeProvider);
          }}
          isScanning={isScanning}
          statusInfo={
            activeProvider
              ? `${activeProvider.format.toUpperCase()} • ${currentModelName || 'Chưa chọn model'}`
              : ''
          }
        />

        <SettingsBar
          settings={settings}
          onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          showSysPanel={showSysPanel}
          onToggleSysPanel={() => setShowSysPanel((v) => !v)}
          onClearChat={handleClearChat}
        />

        {showSysPanel && (
          <SysPanel
            settings={settings}
            onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          />
        )}

        {/* Clear and prominent status banner when model scan fails */}
        {activeProvider && activeProvider.status === 'err' && (
          <div className="active-prov-err-wrapper">
            <ErrorLogViewer
              rawError={activeProvider.statusText || 'Không thể kết nối đến nhà cung cấp API.'}
              title="Lỗi kết nối / không dò được model"
              providerName={activeProvider.name}
              onRescan={() => handleRescanProvider(activeProvider)}
              isScanning={isScanning}
              onEditKey={() => {
                setEditingProvider(activeProvider);
                setModalOpen(true);
              }}
              onManualModel={() => {
                setManualModelMap((prev) => ({ ...prev, [activeProvider.id]: true }));
              }}
            />
          </div>
        )}

        <MessagesView
          messages={currentMessages}
          streamingText={streamingText}
          isGenerating={isGenerating}
          isThinking={isThinking}
          onCopyMessage={handleCopyMessage}
          onRetryLastMessage={handleRetryLastMessage}
          onDeleteMessage={handleDeleteMessage}
        />

        <Composer
          input={inputMessage}
          onChangeInput={setInputMessage}
          onSend={handleSendMessage}
          onStop={handleStopGeneration}
          isGenerating={isGenerating}
          disabled={!activeProvider}
          isNsfw={settings.nsfw}
        />
      </main>

      <ProviderModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProvider(null);
        }}
        editingProvider={editingProvider}
        currentModel={editingProvider ? (selectedModels[editingProvider.id] || '') : ''}
        myPresets={myPresets}
        onSaveProvider={handleSaveProvider}
        onDeleteCustomPreset={handleDeleteCustomPreset}
      />

      <Toast message={toastMessage} isError={toastIsError} />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Protective anti-tamper, anti-devtools, and polymorphic DOM shield overlay */}
      <SecurityShieldOverlay
        status={securityStatus}
        onRefreshSession={() => window.location.reload()}
      />
    </div>
  );
}
