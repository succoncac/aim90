import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = '', code }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = language.trim().toLowerCase();
  const isBash = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd', 'powershell'].includes(cleanLang);
  const displayLang = cleanLang || (isBash ? 'bash' : 'code');

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-block-wrapper my-3 overflow-hidden rounded-xl border border-white/10 bg-[#090d1a]/90 backdrop-blur-md shadow-lg shadow-black/40">
      {/* Code block header: macOS dots, language label & copy button */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.04] border-b border-white/[0.08] select-none text-xs">
        <div className="flex items-center gap-2.5">
          {/* macOS style dots */}
          <div className="flex items-center gap-1.5 opacity-70">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block shadow-sm" />
          </div>

          <div className="flex items-center gap-1.5 ml-1 text-slate-300 font-mono font-medium text-[11.5px] uppercase tracking-wider">
            {isBash ? (
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className={isBash ? 'text-emerald-400' : 'text-sky-300'}>{displayLang}</span>
          </div>
        </div>

        {/* Copy button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.14] border border-white/10'
            }`}
            title="Sao chép toàn bộ khối mã lệnh này"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="relative">
        <pre className="p-3.5 m-0 overflow-x-auto text-[13.5px] font-mono leading-relaxed text-slate-100 bg-transparent selection:bg-purple-600/40">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
