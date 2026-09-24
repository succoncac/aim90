import React, { useState } from 'react';
import { Download, Check, FileCode, Globe, Terminal, FileText, Sparkles } from 'lucide-react';
import { downloadFile, getMimeTypeForFilename } from '../utils/exportUtils';

export interface FileAttachmentCardProps {
  filename: string;
  content: string;
  language?: string;
  isBundle?: boolean;
  mimeType?: string;
  description?: string;
}

export const FileAttachmentCard: React.FC<FileAttachmentCardProps> = ({
  filename,
  content,
  language = '',
  isBundle = false,
  mimeType,
  description,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const cleanLang = language.trim().toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Tính dung lượng file dạng human readable (bytes, KB, MB)
  const calculateSize = (str: string): string => {
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fileSize = calculateSize(content);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveMime = mimeType || getMimeTypeForFilename(filename);
    downloadFile(content, filename, effectiveMime);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  // Chọn icon và màu sắc phù hợp cho file
  const getFileVisuals = () => {
    if (isBundle || ext === 'html' || ext === 'htm') {
      return {
        icon: <Globe className="w-5 h-5 text-amber-400" />,
        colorBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        badge: isBundle ? 'HTML Gộp' : 'HTML',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    }
    if (['ts', 'tsx'].includes(ext) || cleanLang.includes('typescript')) {
      return {
        icon: <FileCode className="w-5 h-5 text-sky-400" />,
        colorBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
        badge: 'TypeScript',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      };
    }
    if (['js', 'jsx'].includes(ext) || cleanLang.includes('javascript')) {
      return {
        icon: <FileCode className="w-5 h-5 text-yellow-400" />,
        colorBg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
        badge: 'JavaScript',
        badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      };
    }
    if (['py'].includes(ext) || cleanLang.includes('python')) {
      return {
        icon: <FileCode className="w-5 h-5 text-emerald-400" />,
        colorBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        badge: 'Python',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    }
    if (['sh', 'bash', 'zsh'].includes(ext) || cleanLang.includes('bash')) {
      return {
        icon: <Terminal className="w-5 h-5 text-emerald-400" />,
        colorBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        badge: 'Shell',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    }
    return {
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      colorBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
      badge: ext.toUpperCase() || 'FILE',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    };
  };

  const visuals = getFileVisuals();

  return (
    <div
      onClick={handleDownload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDownload(e as any);
        }
      }}
      className={`group my-3 relative overflow-hidden rounded-xl border p-3.5 transition-all duration-200 cursor-pointer select-none bg-gradient-to-r from-[#0b1329] via-[#0d1733] to-[#0f1d40] hover:from-[#0d1733] hover:to-[#12224d] shadow-lg shadow-black/40 hover:shadow-sky-950/40 hover:border-sky-500/50 ${
        downloaded ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-white/15'
      }`}
      title={`Bấm vào đây để tải file ${filename} về máy (${fileSize})`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & File info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105 ${visuals.colorBg}`}
          >
            {visuals.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-semibold text-[13.5px] text-white group-hover:text-sky-300 transition-colors truncate">
                {filename}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium uppercase tracking-wider ${visuals.badgeBg}`}>
                {visuals.badge}
              </span>
              {isBundle && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-300 font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>Gộp chạy ngay</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
              <span className="font-mono">{fileSize}</span>
              <span>•</span>
              <span className="text-slate-300 group-hover:text-white transition-colors">
                {description || (downloaded ? 'Đã tải file thành công!' : 'Bấm vào để tải file về máy')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Download button / status */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
              downloaded
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/20'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30 group-hover:shadow-sky-500/50 group-hover:scale-105'
            }`}
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã tải!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
