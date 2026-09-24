/**
 * Tiện ích truy xuất dữ liệu Web thời gian thực & Research trang web bất kỳ
 */

// Trích xuất các liên kết URL trong văn bản người dùng
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

// Kiểm tra xem câu hỏi có cần cập nhật tin tức, báo chí, sự kiện hôm nay không
export function isLiveNewsQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const newsPatterns = [
    /tin\s*tức/i,
    /thời\s*sự/i,
    /báo\s*chí/i,
    /tin\s*nóng/i,
    /sự\s*kiện/i,
    /hôm\s*nay\s*có\s*gì/i,
    /diễn\s*biến\s*mới/i,
    /bài\s*viết\s*mới/i,
    /tin\s*mới\s*nhất/i,
    /thời\s*tiết/i,
    /giá\s*vàng/i,
    /chứng\s*khoán/i,
    /bóng\s*đá/i,
    /kết\s*quả/i,
    /breaking\s*news/i,
    /latest\s*news/i,
    /what\s*happened\s*today/i,
  ];
  return newsPatterns.some((pattern) => pattern.test(lower));
}

// Làm sạch HTML thành văn bản thuần gọn gàng
export function cleanHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tải nội dung của bất kỳ trang web nào (qua backend proxy hoặc trực tiếp)
 */
export async function fetchWebPageContent(url: string, signal?: AbortSignal): Promise<{ url: string; title: string; text: string } | null> {
  try {
    // 1. Thử qua backend endpoint chuyên dụng /api/web-research nếu có backend
    const isLocalOrNode = typeof window !== 'undefined' && window.location.protocol.startsWith('http');
    if (isLocalOrNode) {
      try {
        const res = await fetch(`/api/web-research?url=${encodeURIComponent(url)}`, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            return {
              url,
              title: data.title || '',
              text: data.content,
            };
          }
        }
      } catch {
        // Fallback sang các phương thức tiếp theo
      }
    }

    // 2. Thử qua /api/proxy
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const text = cleanHtmlToText(html).slice(0, 8000);
        if (text.length > 50) {
          return { url, title, text };
        }
      }
    } catch {
      // Fallback
    }

    // 3. Fallback cho chế độ file standalone tĩnh (CORS proxy an toàn công cộng)
    const publicProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    for (const p of publicProxies) {
      try {
        const res = await fetch(p, { signal });
        if (res.ok) {
          const html = await res.text();
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';
          const text = cleanHtmlToText(html).slice(0, 8000);
          if (text.length > 50) {
            return { url, title, text };
          }
        }
      } catch {
        // Continue loop
      }
    }

    return null;
  } catch (err) {
    console.warn(`Không thể truy cập trang web ${url}:`, err);
    return null;
  }
}

/**
 * Tải tin tức sự kiện báo chí trực tuyến mới nhất hôm nay
 */
export async function fetchRealtimeNews(query?: string, signal?: AbortSignal): Promise<string> {
  try {
    // 1. Thử qua backend /api/web-news
    const isLocalOrNode = typeof window !== 'undefined' && window.location.protocol.startsWith('http');
    if (isLocalOrNode) {
      try {
        const url = `/api/web-news${query ? `?q=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            return data.items
              .map(
                (it: any, idx: number) =>
                  `${idx + 1}. ${it.title} [Nguồn: ${it.source || 'Báo chí'}, Lúc: ${it.pubDate || 'Hôm nay'}]`
              )
              .join('\n');
          }
        }
      } catch {
        // Fallback
      }
    }

    // 2. Fallback trực tiếp Google News RSS (hỗ trợ qua allorigins nếu bị CORS trong standalone file)
    const rssUrl = query
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`
      : `https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi`;

    let xml = '';
    try {
      const res = await fetch(rssUrl, { signal });
      if (res.ok) {
        xml = await res.text();
      }
    } catch {
      try {
        const res2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`, { signal });
        if (res2.ok) {
          xml = await res2.text();
        }
      } catch {
        // continue
      }
    }

    if (xml) {
      const items: string[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
        const itemBlock = match[1];
        const rawTitle = (itemBlock.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const rawPubDate = (itemBlock.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
        const rawSource = (itemBlock.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || '';

        const title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        const source = rawSource.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        if (title) {
          items.push(`${items.length + 1}. ${title} [Nguồn: ${source || 'Báo chí'}, Lúc: ${rawPubDate}]`);
        }
      }
      if (items.length > 0) {
        return items.join('\n');
      }
    }

    return '';
  } catch (err) {
    console.warn('Lỗi tải tin tức thời gian thực:', err);
    return '';
  }
}

/**
 * Tự động phân tích câu hỏi người dùng, research trang web hoặc cập nhật tin tức trực tiếp
 */
export async function enrichPromptWithWebResearch(userPrompt: string, signal?: AbortSignal): Promise<string> {
  let enriched = userPrompt;

  // 1. Nếu có URL bất kỳ trong câu hỏi -> Tự động crawl và research nội dung trang web đó
  const urls = extractUrlsFromText(userPrompt);
  if (urls.length > 0) {
    const scrapedList: string[] = [];
    // Giới hạn cào tối đa 2 trang cùng lúc để giữ tốc độ nhanh
    for (const url of urls.slice(0, 2)) {
      const pageData = await fetchWebPageContent(url, signal);
      if (pageData && pageData.text) {
        scrapedList.push(
          `[DỮ LIỆU THỰC TẾ TRÍCH XUẤT TỪ LIÊN KẾT WEB: ${pageData.url}]\n${pageData.title ? `Tiêu đề: ${pageData.title}\n` : ''}Nội dung: ${pageData.text}`
        );
      }
    }
    if (scrapedList.length > 0) {
      enriched += `\n\n${scrapedList.join('\n\n')}`;
    }
  }

  // 2. Nếu hỏi về tin tức, thời sự, sự kiện báo chí hôm nay -> Tự động lấy tin tức thời gian thực
  if (isLiveNewsQuery(userPrompt)) {
    // Trích xuất từ khóa tìm kiếm nếu có
    const cleanKw = userPrompt
      .replace(/tin\s*tức|thời\s*sự|báo\s*chí|mới\s*nhất|hôm\s*nay|có\s*gì|bài\s*viết|cho\s*tôi\s*biết|về/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const newsData = await fetchRealtimeNews(cleanKw.length > 2 ? cleanKw : undefined, signal);
    if (newsData) {
      enriched += `\n\n[BÁO CHÍ & TIN TỨC SỰ KIỆN THỜI SỰ MỚI NHẤT HÔM NAY]:\n${newsData}\n(Hãy dựa vào các tin tức thực tế trên đây để trả lời câu hỏi của người dùng một cách chính xác, cập nhật nhất)`;
    }
  }

  return enriched;
}
