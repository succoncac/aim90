import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, RefreshCw, Cpu, Bot, AlertTriangle } from 'lucide-react';
import { SecurityStatus, generatePolymorphicDecoy } from '../utils/securityShield';

interface SecurityShieldOverlayProps {
  status: SecurityStatus;
  onRefreshSession?: () => void;
}

export const SecurityShieldOverlay: React.FC<SecurityShieldOverlayProps> = ({
  status,
  onRefreshSession,
}) => {
  const [decoyCode, setDecoyCode] = useState<string>('');
  const [dots, setDots] = useState<string>('');

  useEffect(() => {
    // Generate dynamic polymorphic scramble
    setDecoyCode(generatePolymorphicDecoy());
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  if (!status.isDevToolsOpen && !status.isBotDetected && !status.isTampered) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-[#090d16]/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-slate-100 select-none overflow-hidden">
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* Scrambled polymorphic decoy tree for scrapers and automated tools */}
      <div
        className="hidden"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: decoyCode }}
      />

      <div className="relative max-w-lg w-full bg-[#0f172a] border border-amber-500/30 rounded-2xl p-8 shadow-2xl shadow-amber-500/10 text-center flex flex-col items-center">
        {/* Animated Threat Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-6 shadow-inner text-amber-400 animate-pulse">
          {status.isBotDetected ? (
            <Bot className="w-8 h-8" />
          ) : (
            <ShieldAlert className="w-8 h-8" />
          )}
        </div>

        <h2 className="text-xl font-bold tracking-wide text-white mb-2 flex items-center gap-2">
          <span>HỆ THỐNG BẢO MẬT KÍCH HOẠT</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            DEFENSE_ACTIVE
          </span>
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {status.isBotDetected
            ? 'Phát hiện môi trường tự động hóa hoặc bot trích xuất dữ liệu. Cấu trúc mã nguồn và bộ nhớ đã được mã hóa tự động để bảo vệ ứng dụng.'
            : 'Công cụ phát triển DevTools (F12 / Inspect) hoặc hành vi can thiệp DOM đang được bật. Cấu trúc mã nguồn và API Key trong phiên làm việc đã được đóng băng để chống rò rỉ.'}
        </p>

        {/* Security Matrix Box */}
        <div className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3.5 mb-6 text-left font-mono text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Mã hóa DOM & Memory:</span>
            <span className="text-emerald-400 font-semibold">POLYMORPHIC_ENCRYPTED</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">DevTools Detector:</span>
            <span className={status.isDevToolsOpen ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
              {status.isDevToolsOpen ? 'TRAPPED (OPEN)' : 'PASSIVE'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Bot / Scraper Engine:</span>
            <span className={status.isBotDetected ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
              {status.isBotDetected ? 'BLOCKED' : 'CLEAN'}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex items-center gap-2 text-xs text-amber-400/90 mb-6 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 w-full text-left">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Vui lòng đóng bảng F12 / DevTools hoặc tắt các công cụ scraping để tiếp tục sử dụng bình thường.</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            if (onRefreshSession) {
              onRefreshSession();
            } else {
              window.location.reload();
            }
          }}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Kiểm tra lại & Khôi phục phiên làm việc</span>
        </button>
      </div>
    </div>
  );
};
