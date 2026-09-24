import React, { useState } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { Copy, Check } from 'lucide-react';

/**
 * Làm sạch các ký tự Markdown bị lỗi hiển thị trơ trọi (như ** hoặc ## vô cớ)
 * - Loại bỏ các cặp ** rỗng, ** trơ trọi không có nội dung, hoặc số lượng ** lẻ khiến văn bản bị lỗi.
 * - Loại bỏ các dấu # hoặc ## trơ trọi không có tiêu đề, hoặc xuất hiện vô cớ giữa câu/cuối dòng.
 * - Chuẩn hoá các tiêu đề Markdown để render mượt mà.
 */
export function sanitizeMarkdown(text: string): string {
  if (!text) return '';

  let res = text;

  // 1. Xử lý dấu sao ** (bold / asterisks) trơ trọi hoặc lỗi
  // Xoá các cặp ** rỗng: '****' hoặc '**   **'
  res = res.replace(/\*\*\s*\*\*/g, '');

  // Chuẩn hoá khoảng trắng bên trong **: '** text **' -> '**text**'
  res = res.replace(/\*\*\s+([^\n*]+?)\s+\*\*/g, '**$1**');
  res = res.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');
  res = res.replace(/\*\*([^\n*]+?)\s+\*\*/g, '**$1**');

  // Xoá dấu ** trơ trọi đứng một mình được bao quanh bởi khoảng trắng, đầu dòng hoặc dấu câu
  res = res.replace(/(^|[\s\n])\*\*(?=[\s\n.,!?;:]|$)/g, '$1');
  res = res.replace(/\*\*([.,!?;:])/g, '$1');
  res = res.replace(/([.,!?;:])\*\*/g, '$1');

  // Nếu số lượng ** là số lẻ hoặc có dấu ** mồ côi không có cặp đóng
  const boldMatches = res.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    const lastIdx = res.lastIndexOf('**');
    if (lastIdx !== -1) {
      res = res.substring(0, lastIdx) + res.substring(lastIdx + 2);
    }
  }

  // 2. Xử lý triệt để dấu thăng ## hoặc # (headings) trơ trọi, lỗi ## trước số thứ tự (ví dụ: ## 1., ## 2., ## 1 nhỏ)
  // Xoá các dòng chỉ chứa toàn dấu # hoặc ## trơ trọi không có chữ/tiêu đề
  res = res.replace(/^[ \t]*#{1,6}[ \t]*$/gm, '');

  // Đảm bảo xuống dòng tách biệt trước các đề mục nếu model viết dính liền trong câu (ví dụ: "...xong. ## 1. Phần mở đầu" -> xuống 2 dòng)
  res = res.replace(/([^\n])\s*(#{1,6}\s*(?:\d+[.)]|\b(?:phần|mục|bước|chương)\b))/gi, '$1\n\n$2');

  // Loại bỏ hoàn toàn ký tự ## hoặc # đứng trước số thứ tự đề mục (ví dụ: "## 1. " -> "1. ", "## 2. " -> "2. ", "### 1 nhỏ" -> "1 nhỏ")
  res = res.replace(/^([ \t]*)#{1,6}\s*(\d+[.)]\s*)/gm, '$1$2');
  res = res.replace(/(^|[\n\r]|[ \t]+)#{1,6}\s*(\d+[.)]\s*)/g, '$1$2');
  res = res.replace(/^([ \t]*)#{1,6}\s*(\d+\s*(?:nhỏ|lớn|la mã|[a-zA-ZÀ-ỹ]))/gmi, '$1$2');

  // Xoá dấu ## hoặc # đứng trơ trọi vô cớ giữa câu (không phải tiêu đề đầu dòng)
  res = res.replace(/([^\n])\s+#{1,6}(?=\s|[.,!?;:]|$)/g, '$1');

  // Xoá các dấu # hoặc ## thừa ở cuối dòng hoặc cuối văn bản
  res = res.replace(/[ \t]+#{1,6}[ \t]*$/gm, '');

  // Xoá dấu ## hoặc # trơ trọi ở đầu dòng theo sau ngay bởi dấu câu hoặc khoảng trắng rỗng
  res = res.replace(/^[ \t]*#{1,6}\s*(?=[.,!?;:]|$)/gm, '');

  // Chuẩn hoá tiêu đề nếu dính liền chữ (ví dụ: '##Tiêu đề' -> '## Tiêu đề')
  res = res.replace(/^([ \t]*#{1,6})([^\s#\n0-9])/gm, '$1 $2');

  // 3. Khắc phục lỗi sát chữ (thiếu khoảng trắng giữa dấu câu, số thứ tự, ngoặc đơn do các model nhỏ/yếu)
  // Thêm khoảng trắng sau dấu phẩy, dấu chấm phẩy nếu dính liền chữ
  res = res.replace(/([,;])([A-Za-zÀ-ỹ0-9])/g, '$1 $2');

  // Thêm khoảng trắng sau dấu hai chấm nếu không phải URL (http, https)
  res = res.replace(/([a-zA-ZÀ-ỹ0-9]):([a-zA-ZÀ-ỹ])/g, (m, p1, p2) => {
    if (m.toLowerCase().startsWith('http:') || m.toLowerCase().startsWith('https:')) {
      return m;
    }
    return `${p1}: ${p2}`;
  });

  // Thêm khoảng trắng sau dấu chấm câu khi kết thúc từ và bắt đầu câu mới viết hoa
  res = res.replace(/([a-zA-ZÀ-ỹ]{2,})\.([A-ZÀ-Ỹ])/g, '$1. $2');

  // Thêm khoảng trắng sau số thứ tự đầu dòng (ví dụ: "1.nhỏ" -> "1. nhỏ")
  res = res.replace(/^([ \t]*\d+\.)([^\s0-9.])/gm, '$1 $2');
  res = res.replace(/(\n\d+\.)([^\s0-9.])/g, '$1 $2');

  // Thêm khoảng trắng quanh dấu ngoặc đơn dính chữ (ví dụ: "text(ví dụ)" -> "text (ví dụ)")
  res = res.replace(/([a-zA-ZÀ-ỹ0-9])\(([a-zA-ZÀ-ỹ0-9])/g, '$1 ($2');
  res = res.replace(/\)([a-zA-ZÀ-ỹ0-9])/g, ') $1');

  // 4. Khắc phục lỗi thừa chữ (lặp từ liên tiếp do hiện tượng lặp token của model yếu)
  res = res.replace(/\b(là|của|và|các|những|được|cho|trong|với|khi|đã|đang|sẽ|rất|này|đó|rằng|thì|tại|từ)\s+\1\b/gi, '$1');

  return res;
}

// Alias cho backwards-compatibility
export const sanitizeMarkdownAsterisks = sanitizeMarkdown;

/**
 * Chip hiển thị mã/lệnh inline có nút bấm sao chép tức thì (1-click copy)
 */
export const InlineCodeChip: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanCode = code.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = cleanCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <span
      className={`inline-cmd-wrapper group cursor-pointer select-none transition-all ${
        copied ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200' : ''
      }`}
      onClick={handleCopy}
      title="Bấm để sao chép nhanh đoạn mã hoặc lệnh này"
    >
      <code className="inline-code font-mono text-[13px]">{code}</code>
      <span className="inline-flex items-center text-[10px] ml-1 transition-colors">
        {copied ? (
          <span className="flex items-center gap-0.5 text-emerald-400 font-medium text-[10.5px]">
            <Check className="w-3 h-3" />
            <span>Đã chép</span>
          </span>
        ) : (
          <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-300 opacity-70 group-hover:opacity-100" />
        )}
      </span>
    </span>
  );
};

/**
 * Parse text trong một dòng cho các định dạng nội tuyến:
 * - `inline code` (hỗ trợ copy nhanh)
 * - **bold** (chữ in đậm, sạch dấu)
 * - *italic* (chữ in nghiêng)
 */
function renderInlineFormatting(lineText: string, keyPrefix: string): React.ReactNode[] {
  if (!lineText) return [];

  // Tách theo `inline code`
  const codeParts = lineText.split(/(`[^`\n]+`)/g);
  const nodes: React.ReactNode[] = [];

  codeParts.forEach((part, partIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      const codeContent = part.slice(1, -1);
      nodes.push(
        <InlineCodeChip
          key={`${keyPrefix}-c-${partIdx}`}
          code={codeContent}
        />
      );
      return;
    }

    // Tokenize **bold**
    const boldParts = part.split(/(\*\*[^*]+?\*\*)/g);
    boldParts.forEach((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
        const boldText = bPart.slice(2, -2);
        nodes.push(
          <strong
            key={`${keyPrefix}-b-${partIdx}-${bIdx}`}
            className="font-bold text-white tracking-wide"
          >
            {boldText}
          </strong>
        );
        return;
      }

      // Tokenize *italic*
      const italicParts = bPart.split(/(\*[^*]+?\*)/g);
      italicParts.forEach((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
          const italicText = iPart.slice(1, -1);
          nodes.push(
            <em
              key={`${keyPrefix}-i-${partIdx}-${bIdx}-${iIdx}`}
              className="italic text-slate-200"
            >
              {italicText}
            </em>
          );
          return;
        }

        // Văn bản thường (loại bỏ hoàn toàn bất kỳ dấu ** hoặc ## còn sót lại)
        const cleanIPart = iPart.replace(/\*\*/g, '').replace(/^[ \t]*#{1,6}\s*/g, '');
        if (cleanIPart) {
          nodes.push(
            <span key={`${keyPrefix}-t-${partIdx}-${bIdx}-${iIdx}`}>
              {cleanIPart}
            </span>
          );
        }
      });
    });
  });

  return nodes;
}

/**
 * Parse text without codeblocks into React nodes supporting:
 * - Tiêu đề Markdown (#, ##, ###, ####) không bị lộ dấu ## trơ trọi
 * - Dòng lệnh terminal độc lập tự động đưa vào CodeBlock có nút copy
 * - **bold** (không lỗi dấu sao)
 * - *italic*
 * - `inline code` (bấm là copy)
 */
export function renderRichText(rawText: string, keyPrefix: string): React.ReactNode[] {
  if (!rawText) return [];

  // 1. Làm sạch triệt để các dấu ** và ## trơ trọi
  const clean = sanitizeMarkdown(rawText);

  // 2. Tách từng dòng để xử lý tiêu đề và dòng lệnh độc lập
  const lines = clean.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const isLast = lineIdx === lines.length - 1;
    const trimmed = line.trim();

    // 2.1 Xử lý tiêu đề Markdown (#, ##, ###, ####)
    const headingMatch = line.match(/^([ \t]*)(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[2].length;
      const headingText = headingMatch[3].trim();
      const inlineHeadingNodes = renderInlineFormatting(headingText, `${keyPrefix}-h-${lineIdx}`);

      if (level === 1) {
        nodes.push(
          <div
            key={`${keyPrefix}-h1-${lineIdx}`}
            className="text-lg font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/10 flex items-center gap-2"
          >
            {inlineHeadingNodes}
          </div>
        );
      } else if (level === 2) {
        nodes.push(
          <div
            key={`${keyPrefix}-h2-${lineIdx}`}
            className="text-base font-bold text-sky-300 mt-2.5 mb-1 flex items-center gap-1.5"
          >
            {inlineHeadingNodes}
          </div>
        );
      } else if (level === 3) {
        nodes.push(
          <div
            key={`${keyPrefix}-h3-${lineIdx}`}
            className="text-[14.5px] font-semibold text-slate-100 mt-2 mb-0.5"
          >
            {inlineHeadingNodes}
          </div>
        );
      } else {
        nodes.push(
          <div
            key={`${keyPrefix}-h4-${lineIdx}`}
            className="text-[13.5px] font-semibold text-slate-200 mt-1.5 mb-0.5"
          >
            {inlineHeadingNodes}
          </div>
        );
      }
      return;
    }

    // 2.2 Xử lý dòng lệnh terminal độc lập bắt đầu bằng '$ ' hoặc '> '
    const cliMatch = line.match(/^[ \t]*[$>]\s+([a-zA-Z0-9_\-./]+.*)$/);
    if (cliMatch) {
      const cmdText = cliMatch[1].trim();
      nodes.push(
        <div key={`${keyPrefix}-cli-${lineIdx}`} className="my-1.5">
          <CodeBlock language="bash" code={cmdText} />
        </div>
      );
      return;
    }

    // 2.3 Xử lý dòng lệnh phổ biến độc lập chưa được đóng khối (npm, pip, git, docker, curl...)
    const isStandaloneCmd =
      /^(npm|npx|pnpm|yarn|pip|pip3|git|curl|docker|docker-compose|kubectl|cargo|brew|apt|apt-get|sudo)\s+[a-zA-Z0-9_\-./]+/i.test(
        trimmed
      ) &&
      !trimmed.includes(' và ') &&
      !trimmed.includes(' là ') &&
      !trimmed.includes(' của ') &&
      !trimmed.endsWith('.');

    if (isStandaloneCmd) {
      nodes.push(
        <div key={`${keyPrefix}-cmd-${lineIdx}`} className="my-1.5">
          <CodeBlock language="bash" code={trimmed} />
        </div>
      );
      return;
    }

    // 2.4 Dòng văn bản bình thường với định dạng nội tuyến
    const formattedLine = renderInlineFormatting(line, `${keyPrefix}-l-${lineIdx}`);
    nodes.push(
      <React.Fragment key={`${keyPrefix}-frag-${lineIdx}`}>
        {formattedLine}
        {!isLast && '\n'}
      </React.Fragment>
    );
  });

  return nodes;
}

/**
 * Parses full message content:
 * - Formats full ```lang\ncode``` blocks using <CodeBlock> with 1-click copy
 * - Formats text with **bold**, *italic*, and `inline code`
 */
export function parseAndRenderMessage(content: string): React.ReactNode[] {
  if (!content) return [];

  const segments: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n?([\s\S]*?)(?:```|$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      segments.push(
        <div key={`txt-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
          {renderRichText(textBefore, `pre-${lastIndex}`)}
        </div>
      );
    }

    const lang = match[1] ? match[1].trim() : '';
    const code = match[2] !== undefined ? match[2] : '';

    segments.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={lang}
        code={code}
      />
    );

    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) {
      codeBlockRegex.lastIndex++;
    }
  }

  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    segments.push(
      <div key={`txt-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
        {renderRichText(remainingText, `post-${lastIndex}`)}
      </div>
    );
  }

  return segments;
}
