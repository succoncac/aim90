import { FileAttachment, ChatMessage } from '../types';
import { isDownloadOrFileRequest } from '../constants';

/**
 * Tiện ích đóng gói và xuất file đa định dạng, đặc biệt là HTML gộp nguyên khối (Standalone Bundle)
 */

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Lỗi khi tải file:', err);
  }
}

/**
 * Lấy MIME Type phù hợp theo phần mở rộng file
 */
export function getMimeTypeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html;charset=utf-8';
    case 'css':
      return 'text/css;charset=utf-8';
    case 'js':
    case 'mjs':
      return 'application/javascript;charset=utf-8';
    case 'ts':
    case 'tsx':
      return 'text/typescript;charset=utf-8';
    case 'jsx':
      return 'text/jsx;charset=utf-8';
    case 'json':
      return 'application/json;charset=utf-8';
    case 'py':
      return 'text/x-python;charset=utf-8';
    case 'sh':
      return 'application/x-sh;charset=utf-8';
    case 'sql':
      return 'application/sql;charset=utf-8';
    case 'md':
      return 'text/markdown;charset=utf-8';
    default:
      return 'text/plain;charset=utf-8';
  }
}

/**
 * Chuẩn hoá tên file: loại bỏ ký tự cấm, luôn đảm bảo đuôi mở rộng hợp lệ (đặc biệt .html thay vì .htm)
 */
export function cleanFilename(filename: string, defaultExt: string = 'html'): string {
  let clean = (filename || '')
    .trim()
    .replace(/[\\/*?:"<>|]/g, '_')
    .replace(/\s+/g, '_');

  if (!clean) {
    const ext = defaultExt.toLowerCase() === 'htm' ? 'html' : defaultExt;
    return `index.${ext}`;
  }

  // Luôn chuyển đổi .htm thành .html chuẩn
  if (clean.toLowerCase().endsWith('.htm')) {
    clean = clean.slice(0, -4) + '.html';
  }

  if (!clean.includes('.')) {
    const ext = defaultExt.toLowerCase() === 'htm' ? 'html' : defaultExt;
    clean = `${clean}.${ext}`;
  }

  return clean;
}

/**
 * Đổi phần mở rộng của tên file (ví dụ script.js -> script.ts, index.htm -> index.html)
 */
export function changeFileExtension(filename: string, newExt: string): string {
  let cleanExt = newExt.replace(/^\./, '').trim().toLowerCase();
  if (cleanExt === 'htm') cleanExt = 'html';
  const parts = filename.split('.');
  if (parts.length > 1) {
    parts.pop();
    return `${parts.join('.')}.${cleanExt}`;
  }
  return `${filename}.${cleanExt}`;
}

/**
 * Lấy tên file mặc định dựa theo ngôn ngữ
 */
export function getDefaultFilenameForLanguage(lang: string): string {
  const clean = (lang || '').trim().toLowerCase();
  switch (clean) {
    case 'html':
    case 'htm':
      return 'index.html';
    case 'css':
      return 'styles.css';
    case 'js':
    case 'javascript':
      return 'script.js';
    case 'ts':
    case 'typescript':
      return 'main.ts';
    case 'jsx':
      return 'Component.jsx';
    case 'tsx':
      return 'Component.tsx';
    case 'json':
      return 'data.json';
    case 'py':
    case 'python':
      return 'app.py';
    case 'sh':
    case 'bash':
    case 'shell':
      return 'script.sh';
    case 'sql':
      return 'database.sql';
    case 'java':
      return 'Main.java';
    case 'cpp':
    case 'c++':
      return 'main.cpp';
    case 'c':
      return 'main.c';
    case 'cs':
    case 'csharp':
      return 'Program.cs';
    case 'php':
      return 'index.php';
    case 'go':
      return 'main.go';
    case 'rs':
    case 'rust':
      return 'main.rs';
    case 'md':
    case 'markdown':
      return 'README.md';
    default:
      return 'source_code.txt';
  }
}

/**
 * Lấy phần mở rộng file phù hợp theo ngôn ngữ
 */
export function getExtensionForLanguage(lang: string): string {
  const clean = (lang || '').trim().toLowerCase();
  switch (clean) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'javascript':
      return 'js';
    case 'ts':
    case 'typescript':
      return 'ts';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'json':
      return 'json';
    case 'py':
    case 'python':
      return 'py';
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return 'sh';
    case 'sql':
      return 'sql';
    case 'php':
      return 'php';
    case 'java':
      return 'java';
    case 'cpp':
    case 'c++':
    case 'c':
      return 'cpp';
    case 'cs':
    case 'csharp':
      return 'cs';
    case 'rb':
    case 'ruby':
      return 'rb';
    case 'go':
      return 'go';
    case 'rs':
    case 'rust':
      return 'rs';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'svg';
    case 'md':
    case 'markdown':
      return 'md';
    default:
      return 'txt';
  }
}

/**
 * Kiểm tra xem một khối code có phải là HTML không
 */
export function isHtmlBlock(b: { lang: string; code: string }): boolean {
  const lang = (b.lang || '').toLowerCase();
  return lang === 'html' || lang === 'htm' || /<!DOCTYPE\s+html/i.test(b.code) || /<html[\s>]/i.test(b.code);
}

/**
 * Kiểm tra xem một khối code có phải là JS / TS / JSX / TSX không
 */
export function isJsBlock(b: { lang: string; code: string }): boolean {
  const lang = (b.lang || '').toLowerCase();
  return ['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx'].includes(lang);
}

/**
 * Kiểm tra xem một khối code có phải là CSS không
 */
export function isCssBlock(b: { lang: string; code: string }): boolean {
  return (b.lang || '').toLowerCase() === 'css';
}

/**
 * Đóng gói một đoạn mã hoặc danh sách các khối mã thành một file HTML gộp nguyên khối hoàn chỉnh (chạy ngay trên mọi trình duyệt)
 */
export function bundleCodeToSingleHtml(code: string, language: string, customTitle: string = 'Trang Web Đã Xuất'): string {
  const cleanLang = (language || '').trim().toLowerCase();
  const trimmedCode = code.trim();

  // Kiểm tra các công nghệ được sử dụng để tự động nhúng CDN tương ứng
  const hasTailwind =
    /\b(flex|grid|bg-[a-z]+-\d+|text-[a-z]+-\d+|p-\d+|m-\d+|rounded-|shadow-|items-center|justify-between)\b/.test(
      trimmedCode
    );
  const hasReact =
    /import\s+.*from\s+['"]react['"]|React\.|useState|useEffect|ReactDOM|\.createRoot|<[A-Z][a-zA-Z0-9]*[\s/>]/.test(
      trimmedCode
    );
  const hasLucide = /data-lucide|lucide\./i.test(trimmedCode);

  // 1. Nếu bản thân mã đã là file HTML hoàn chỉnh
  if (
    cleanLang === 'html' ||
    cleanLang === 'htm' ||
    /<!DOCTYPE\s+html/i.test(trimmedCode) ||
    /<html[\s>]/i.test(trimmedCode)
  ) {
    let finalHtml = trimmedCode;
    if (!/<!DOCTYPE\s+html/i.test(finalHtml)) {
      finalHtml = `<!DOCTYPE html>\n<html lang="vi">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${customTitle}</title>\n</head>\n<body>\n${finalHtml}\n</body>\n</html>`;
    }

    // Nhúng Tailwind CDN nếu dùng class Tailwind mà chưa có
    if (hasTailwind && !finalHtml.includes('tailwindcss.com')) {
      const tailwindScript = '  <script src="https://cdn.tailwindcss.com"></script>\n';
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${tailwindScript}</head>`);
      } else {
        finalHtml = `${tailwindScript}${finalHtml}`;
      }
    }

    // Nhúng Lucide CDN nếu dùng icon Lucide mà chưa có
    if (hasLucide && !finalHtml.includes('lucide')) {
      const lucideScript = `  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>window.addEventListener('DOMContentLoaded', () => { if (window.lucide) window.lucide.createIcons(); });</script>\n`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${lucideScript}</body>`);
      } else {
        finalHtml = `${finalHtml}${lucideScript}`;
      }
    }

    return finalHtml;
  }

  // 2. Nếu là JavaScript / TypeScript / React JSX
  if (['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx'].includes(cleanLang)) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTitle}</title>
  ${hasTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  ${
    hasReact
      ? `<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`
      : ''
  }
  ${hasLucide ? '<script src="https://unpkg.com/lucide@latest"></script>' : ''}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    #root, #app { max-width: 1100px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="root">
    <div id="app"></div>
  </div>
  <script${hasReact ? ' type="text/babel"' : ''}>
    try {
${trimmedCode}
    } catch (e) {
      console.error('Lỗi thực thi mã trong file gộp:', e);
      const errBox = document.createElement('div');
      errBox.style.cssText = 'color:#ef4444;background:#1e1b4b;padding:16px;border-radius:8px;margin-top:20px;font-family:monospace;border:1px solid #dc2626;';
      errBox.innerHTML = '<strong>Lỗi thực thi JavaScript:</strong> ' + e.message;
      document.body.appendChild(errBox);
    }
  </script>
  ${hasLucide ? `<script>if (window.lucide) window.lucide.createIcons();</script>` : ''}
</body>
</html>`;
  }

  // 3. Nếu là CSS
  if (cleanLang === 'css') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTitle} - CSS Demo</title>
  <style>
${trimmedCode}
  </style>
</head>
<body>
  <div style="padding: 30px; font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto;">
    <h2>Bản xem thử kiểu mẫu CSS</h2>
    <p>File này đã được nhúng toàn bộ mã CSS bạn vừa tạo.</p>
  </div>
</body>
</html>`;
  }

  // 4. Nếu là văn bản hoặc ngôn ngữ khác
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 30px 20px;
      background: #0b0f19;
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 900px;
      width: 100%;
      background: #151d30;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 { font-size: 18px; color: #38bdf8; margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
    pre {
      background: #090d16;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13.5px;
      line-height: 1.6;
      color: #f1f5f9;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${customTitle} (${cleanLang || 'plaintext'})</h1>
    <pre><code>${escapeHtml(trimmedCode)}</code></pre>
  </div>
</body>
</html>`;
}

/**
 * Thu thập tất cả các khối mã nguồn xuyên suốt lịch sử trò chuyện để đóng gói đầy đủ (HTML + CSS + JS)
 */
export function collectAllCodeBlocksForBundle(
  assistantResponse: string,
  conversationHistory: ChatMessage[] = []
): { lang: string; code: string }[] {
  const currentBlocks = extractCodeBlocks(assistantResponse);
  const allBlocks: { lang: string; code: string }[] = [...currentBlocks];

  // Quét ngược về lịch sử để thu thập tất cả các khối mã nguồn xuyên suốt cuộc trò chuyện
  if (conversationHistory.length > 0) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.role === 'assistant' && !msg.isError) {
        const prevBlocks = extractCodeBlocks(msg.content);
        for (const pb of prevBlocks) {
          const pbCode = pb.code.trim();
          // Kiểm tra xem đoạn code này đã có trong allBlocks chưa để tránh trùng lặp
          const alreadyExists = allBlocks.some((b) => b.code.trim() === pbCode);
          if (alreadyExists) continue;

          if (isHtmlBlock(pb)) {
            if (!allBlocks.some(isHtmlBlock)) {
              allBlocks.unshift(pb); // Ưu tiên HTML lên đầu
            }
          } else if (isCssBlock(pb)) {
            allBlocks.push(pb);
          } else if (isJsBlock(pb)) {
            allBlocks.push(pb);
          } else {
            allBlocks.push(pb);
          }
        }
      }
    }
  }

  return allBlocks;
}

/**
 * Trích xuất và gộp tất cả các khối mã thành 1 file HTML gộp nguyên khối duy nhất, chạy ngay lập tức
 */
export function extractAndBundleMessageToHtml(
  messageContent: string,
  title: string = 'Ung_Dung_HTML_Gop',
  conversationHistory: ChatMessage[] = []
): string {
  // Lấy toàn bộ các khối code từ tin nhắn hiện tại và lịch sử
  const blocks = collectAllCodeBlocksForBundle(messageContent, conversationHistory);

  // Nếu không có khối code nào, bọc toàn bộ nội dung tin nhắn vào 1 trang HTML
  if (blocks.length === 0) {
    return bundleCodeToSingleHtml(messageContent, 'text', title);
  }

  const htmlBlock = blocks.find(isHtmlBlock);
  const cssBlocks = blocks.filter(isCssBlock);
  const jsBlocks = blocks.filter(isJsBlock);
  const combinedCss = cssBlocks.map((b) => b.code).join('\n\n');
  const combinedJs = jsBlocks.map((b) => b.code).join('\n\n');

  const fullSource = `${htmlBlock ? htmlBlock.code : ''}\n${combinedCss}\n${combinedJs}`;
  const hasTailwind =
    /\b(flex|grid|bg-[a-z]+-\d+|text-[a-z]+-\d+|p-\d+|m-\d+|rounded-|shadow-|items-center|justify-between)\b/.test(
      fullSource
    );
  const hasReact =
    /import\s+.*from\s+['"]react['"]|React\.|useState|useEffect|ReactDOM|\.createRoot|<[A-Z][a-zA-Z0-9]*[\s/>]/.test(
      fullSource
    );
  const hasLucide = /data-lucide|lucide\./i.test(fullSource);

  // Trường hợp 1: Có khối HTML
  if (htmlBlock) {
    let combined = htmlBlock.code.trim();

    // Chuẩn hoá cấu trúc HTML nếu là fragment
    if (!/<!DOCTYPE\s+html/i.test(combined) && !/<html[\s>]/i.test(combined)) {
      combined = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
${combined}
</body>
</html>`;
    }

    // Nhúng Tailwind CDN nếu cần
    if (hasTailwind && !combined.includes('tailwindcss.com')) {
      const twTag = '  <script src="https://cdn.tailwindcss.com"></script>\n';
      if (combined.includes('</head>')) {
        combined = combined.replace('</head>', `${twTag}</head>`);
      } else {
        combined = `${twTag}${combined}`;
      }
    }

    // Nhúng React & Babel CDN nếu code dùng React/JSX
    if (hasReact && !combined.includes('react.production.min.js')) {
      const reactTags = `  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\n  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n`;
      if (combined.includes('</head>')) {
        combined = combined.replace('</head>', `${reactTags}</head>`);
      } else {
        combined = `${reactTags}${combined}`;
      }
    }

    // Nhúng toàn bộ CSS vào <head>
    if (combinedCss && !combined.includes(combinedCss.slice(0, 30))) {
      const styleTag = `\n  <style id="bundle-custom-styles">\n${combinedCss}\n  </style>\n`;
      if (combined.includes('</head>')) {
        combined = combined.replace('</head>', `${styleTag}</head>`);
      } else if (combined.includes('<body')) {
        combined = combined.replace('<body', `${styleTag}<body`);
      } else {
        combined = `${styleTag}${combined}`;
      }
    }

    // Nhúng toàn bộ JS vào cuối <body>
    if (combinedJs && !combined.includes(combinedJs.slice(0, 30))) {
      const scriptType = hasReact ? ' type="text/babel"' : '';
      const scriptTag = `\n  <script${scriptType}>\n    try {\n${combinedJs}\n    } catch (e) {\n      console.error('Lỗi thực thi trong file gộp:', e);\n    }\n  </script>\n`;
      if (combined.includes('</body>')) {
        combined = combined.replace('</body>', `${scriptTag}</body>`);
      } else {
        combined = `${combined}${scriptTag}`;
      }
    }

    // Nhúng Lucide icon activation nếu có
    if (hasLucide && !combined.includes('lucide.createIcons')) {
      const lucideTag = `\n  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>window.addEventListener('DOMContentLoaded', () => { if (window.lucide) window.lucide.createIcons(); });</script>\n`;
      if (combined.includes('</body>')) {
        combined = combined.replace('</body>', `${lucideTag}</body>`);
      } else {
        combined = `${combined}${lucideTag}`;
      }
    }

    return combined;
  }

  // Trường hợp 2: Không có khối HTML riêng, tự tạo bộ khung HTML5 hoàn chỉnh
  const otherContent = blocks
    .filter((b) => !isCssBlock(b) && !isJsBlock(b))
    .map((b) => b.code)
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${hasTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  ${
    hasReact
      ? `<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`
      : ''
  }
  ${hasLucide ? '<script src="https://unpkg.com/lucide@latest"></script>' : ''}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    #root, #app { max-width: 1100px; margin: 0 auto; }
    ${combinedCss}
  </style>
</head>
<body>
  <div id="root">
    <div id="app">
      ${otherContent}
    </div>
  </div>
  <script${hasReact ? ' type="text/babel"' : ''}>
    try {
${combinedJs}
    } catch (e) {
      console.error('Lỗi thực thi trong file gộp:', e);
      const errBox = document.createElement('div');
      errBox.style.cssText = 'color:#ef4444;background:#1e1b4b;padding:16px;border-radius:8px;margin-top:20px;font-family:monospace;border:1px solid #dc2626;';
      errBox.innerHTML = '<strong>Lỗi JavaScript khi chạy:</strong> ' + e.message;
      document.body.appendChild(errBox);
    }
  </script>
  ${
    hasLucide
      ? `<script>window.addEventListener('DOMContentLoaded', () => { if (window.lucide) window.lucide.createIcons(); });</script>`
      : ''
  }
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ExtractedCodeBlock {
  lang: string;
  code: string;
  filename?: string;
}

/**
 * Trích xuất tất cả các khối code trong chuỗi markdown, tự động nhận diện tên file nếu có
 */
export function extractCodeBlocks(markdownText: string): ExtractedCodeBlock[] {
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)(?:[:\s]([a-zA-Z0-9_\-./]+))?\n?([\s\S]*?)(?:```|$)/g;
  const blocks: ExtractedCodeBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdownText)) !== null) {
    let rawLang = (match[1] || '').trim().toLowerCase();
    let headerFilename = (match[2] || '').trim();
    let code = match[3] ? match[3].trim() : '';

    if (rawLang === 'htm') rawLang = 'html';

    // Nhận diện comment tên file ở dòng đầu tiên (ví dụ: <!-- index.html -->, /* style.css */, // script.js)
    if (!headerFilename && code) {
      const firstLine = code.split('\n')[0].trim();
      const commentMatch = firstLine.match(
        /^(?:<!--|\/\*|\/\/|#)\s*(?:filename:?\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?$/i
      );
      if (commentMatch && commentMatch[1]) {
        headerFilename = commentMatch[1].trim();
      }
    }

    if (code) {
      blocks.push({
        lang: rawLang,
        code,
        filename: headerFilename ? cleanFilename(headerFilename, rawLang || 'txt') : undefined,
      });
    }
  }
  return blocks;
}

/**
 * Tự động tạo danh sách các thẻ file đính kèm (FileAttachment[]) chuẩn xác khi người dùng yêu cầu tải file
 */
export function resolveFileAttachmentsFromConversation(
  userPrompt: string,
  assistantResponse: string,
  conversationHistory: ChatMessage[] = []
): FileAttachment[] {
  if (!isDownloadOrFileRequest(userPrompt)) {
    return [];
  }

  const promptLower = userPrompt.toLowerCase();

  // 1. Kiểm tra yêu cầu chuyển đổi định dạng đặc biệt (TS, JS, PY, HTML...)
  let targetExt: string | null = null;
  if (/sang\s*(?:typescript|ts)|dạng\s*ts|file\s*ts/i.test(promptLower)) {
    targetExt = 'ts';
  } else if (/sang\s*(?:javascript|js)|dạng\s*js|file\s*js/i.test(promptLower)) {
    targetExt = 'js';
  } else if (/sang\s*(?:python|py)|dạng\s*py|file\s*py/i.test(promptLower)) {
    targetExt = 'py';
  } else if (/sang\s*html|dạng\s*html|file\s*html/i.test(promptLower)) {
    targetExt = 'html';
  } else if (/sang\s*css|dạng\s*css|file\s*css/i.test(promptLower)) {
    targetExt = 'css';
  } else if (/sang\s*json|dạng\s*json|file\s*json/i.test(promptLower)) {
    targetExt = 'json';
  }

  // 2. Tìm khối mã nguồn (ưu tiên phản hồi hiện tại, nếu không có thì tìm ngược về lịch sử)
  let blocks = extractCodeBlocks(assistantResponse);
  if (blocks.length === 0 && conversationHistory.length > 0) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.role === 'assistant' && !msg.isError) {
        const prevBlocks = extractCodeBlocks(msg.content);
        if (prevBlocks.length > 0) {
          blocks = prevBlocks;
          break;
        }
      }
    }
  }

  const attachments: FileAttachment[] = [];

  const hasHtml = blocks.some(isHtmlBlock);
  const hasCss = blocks.some(isCssBlock);
  const hasJs = blocks.some(isJsBlock);
  const isWebProject = hasHtml || (hasCss && hasJs);

  // A. Dự án Web: Tạo file index.html tự chạy hoàn chỉnh (nhúng đủ HTML, CSS, JS)
  if (isWebProject || targetExt === 'html') {
    const bundledContent = extractAndBundleMessageToHtml(
      assistantResponse,
      'index',
      conversationHistory
    );
    attachments.push({
      filename: 'index.html',
      content: bundledContent,
      language: 'html',
      isBundle: true,
      mimeType: 'text/html;charset=utf-8',
      description: 'Tệp HTML hoàn chỉnh (chạy ngay trên trình duyệt)',
    });
  }

  // B. Thêm từng file mã nguồn thành phần riêng biệt (CSS, JS, TS, PY...)
  if (blocks.length > 0) {
    let cssIdx = 0;
    let jsIdx = 0;

    for (const block of blocks) {
      let fn = block.filename;
      const l = (block.lang || '').toLowerCase();

      if (!fn) {
        if (isHtmlBlock(block)) {
          if (!isWebProject) {
            fn = 'index.html';
          }
        } else if (isCssBlock(block)) {
          cssIdx++;
          fn = cssIdx === 1 ? 'style.css' : `style_${cssIdx}.css`;
        } else if (isJsBlock(block)) {
          jsIdx++;
          const ext = l.includes('ts') ? 'ts' : 'js';
          fn = jsIdx === 1 ? `script.${ext}` : `script_${jsIdx}.${ext}`;
        } else {
          fn = getDefaultFilenameForLanguage(l);
        }
      }

      if (fn && targetExt) {
        fn = changeFileExtension(fn, targetExt);
      }

      if (fn) {
        fn = cleanFilename(fn, targetExt || l || 'txt');
        // Không thêm file trùng tên
        if (!attachments.some((a) => a.filename === fn)) {
          const effectiveLang = targetExt || l || 'txt';
          attachments.push({
            filename: fn,
            content: block.code,
            language: effectiveLang,
            isBundle: false,
            mimeType: getMimeTypeForFilename(fn),
            description: `Tệp mã nguồn ${effectiveLang.toUpperCase()}`,
          });
        }
      }
    }
  }

  // C. Nếu không có khối code nào, tạo file văn bản
  if (attachments.length === 0) {
    const isMd = assistantResponse.includes('#') || assistantResponse.includes('**');
    const filename = isMd ? 'phan_hoi.md' : 'phan_hoi.txt';
    attachments.push({
      filename,
      content: assistantResponse,
      language: isMd ? 'markdown' : 'text',
      isBundle: false,
      mimeType: getMimeTypeForFilename(filename),
      description: 'Tệp văn bản',
    });
  }

  return attachments;
}

/**
 * Tự động tạo thẻ file đính kèm đơn (FileAttachment) tương thích ngược
 */
export function resolveFileAttachmentFromConversation(
  userPrompt: string,
  assistantResponse: string,
  conversationHistory: ChatMessage[] = []
): FileAttachment | null {
  const list = resolveFileAttachmentsFromConversation(userPrompt, assistantResponse, conversationHistory);
  return list.length > 0 ? list[0] : null;
}


