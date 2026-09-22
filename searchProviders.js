// Search provider abstraction. Each provider takes a claim string and returns:
//   { hasEvidence: boolean, evidence: string, provider?: string }
// Throwing is allowed for unrecoverable errors; the dispatcher catches and converts
// to a hasEvidence:false result with a [provider] error prefix.
//
// Add new providers by: (1) implementing searchXxx, (2) adding to dispatch map,
// (3) documenting in README. Total ~5 lines per provider.

const axios = require('axios');

// Query Rewriting: simplify long natural-language queries into keyword-style.
// For Chinese sentences > 15 chars, drop CJK stopwords and keep digits + noun phrases.
// For English, lowercase + drop a/an/the/is/are/was/were/of/in/on/at/to/for/and/or/but.
// Final length: 4-30 chars; if too short, prepend first words of original. Never return empty.
function rewriteQuery(q) {
  if (!q || typeof q !== 'string') return q;
  const trimmed = q.trim();
  if (trimmed.length <= 15) return trimmed;
  const hasCJK = /[\u4e00-\u9fff]/.test(trimmed);
  let out;
  if (hasCJK) {
    out = trimmed
      .replace(/[\u3002\uff01\uff1f\u3001\uff0c,.!?;:]/g, ' ')
      .replace(/(是|的|了|在|有|和|与|或|为|及|把|被|从|到|给|让|使|就|也|都|还)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (out.length < 4) {
      out = trimmed.replace(/[\u3000-\u303f\uff00-\uffef,.!?;:，。！？；：、\s]+/g, ' ').trim();
    }
  } else {
    out = trimmed
      .toLowerCase()
      .replace(/\b(a|an|the|is|are|was|were|of|in|on|at|to|for|and|or|but|be|been|being|has|have|had)\b/g, ' ')
      .replace(/[,.!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (out.length < 4) {
    const head = trimmed.split(/\s+/).slice(0, 3).join(' ');
    out = (head + ' ' + out).trim();
  }
  if (out.length > 30) out = out.substring(0, 30).trim();
  return out || trimmed;
}

// DuckDuckGo Instant Answer lookup (free, no key).
// 30s timeout + 1 retry (1000ms backoff). Only ECONNRESET/ETIMEDOUT/ECONNABORTED/5xx retry.
async function searchDDG(claim, opts = {}) {
  const url = 'https://api.duckduckgo.com/';
  const TIMEOUT_MS = 30000;
  const MAX_RETRIES = 1;
  const BACKOFF_MS = 1000;
  const query = rewriteQuery(claim);
  let attempt = 0;
  let lastErr = null;
  while (attempt <= MAX_RETRIES) {
    try {
      const resp = await axios.get(url, {
        params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
        timeout: TIMEOUT_MS
      });
      if (resp.status >= 500 && resp.status < 600) {
        throw Object.assign(new Error(`ddg_http_${resp.status}`), { code: 'ECONNRESET' });
      }
      const d = resp.data || {};
      const abstract = (d.AbstractText || '').trim();
      const related = Array.isArray(d.RelatedTopics) ? d.RelatedTopics : [];
      if (abstract && abstract.length > 10) {
        return { hasEvidence: true, evidence: `${abstract} (source: ${d.AbstractSource || 'DuckDuckGo'})` };
      }
      for (const t of related) {
        if (t.Text && t.Text.length > 20) {
          return { hasEvidence: true, evidence: `${t.Text.substring(0, 200)} (source: DuckDuckGo Related)` };
        }
      }
      return { hasEvidence: false, evidence: 'No direct evidence found in DuckDuckGo Instant Answer.' };
    } catch (err) {
      lastErr = err;
      const code = err && err.code;
      const status = err && err.response && err.response.status;
      const msg = (err && err.message) || '';
      const isTimeout = code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(msg);
      const isConn = code === 'ECONNRESET' || code === 'ETIMEDOUT';
      const isServer = status >= 500 && status < 600;
      const retryable = isTimeout || isConn || isServer;
      if (!retryable || attempt >= MAX_RETRIES) {
        throw err;
      }
      console.error(`[searchDDG] retry attempt=${attempt + 1} code=${code || ('http_' + status)} msg=${msg.slice(0, 120)}`);
      await new Promise(r => setTimeout(r, BACKOFF_MS));
      attempt++;
    }
  }
  throw lastErr || new Error('searchDDG exhausted retries');
}

// Brave Search: needs BRAVE_API_KEY. Free tier 2000 req/month.
// Uses native fetch (Node 18+). 8s timeout via AbortController.
// On HTTP error or parse error, throws -> dispatcher catches and returns hasEvidence:false
// with a [brave] error prefix.
async function searchBrave(claim) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('brave_error: BRAVE_API_KEY not set');
  }
  const query = rewriteQuery(claim);
  const url = 'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query) + '&count=5';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let resp;
  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      signal: ctrl.signal
    });
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
    throw new Error('brave_error: ' + (isAbort ? 'timeout after 8000ms' : (err && err.message) || 'fetch_failed'));
  }
  clearTimeout(timer);
  if (!resp.ok) {
    throw new Error('brave_error: ' + resp.status);
  }
  let data;
  try {
    data = await resp.json();
  } catch (err) {
    throw new Error('brave_error: invalid_json');
  }
  const web = data && data.web && Array.isArray(data.web.results) ? data.web.results : [];
  if (web.length === 0) {
    return { hasEvidence: false, evidence: 'No results from Brave Search.' };
  }
  const snippets = [];
  for (const r of web) {
    const desc = (r && r.description ? String(r.description) : '').trim();
    const title = (r && r.title ? String(r.title) : '').trim();
    const url = (r && r.url ? String(r.url) : '').trim();
    if (!desc) continue;
    const head = title ? `${title}: ` : '';
    // Strip any URL fragment from description to keep evidence clean + bounded.
    const cleanDesc = desc.replace(/https?:\/\/\S+/g, '').trim();
    if (!cleanDesc) continue;
    snippets.push((head + cleanDesc).slice(0, 240));
    if (snippets.length >= 3) break;
  }
  if (snippets.length === 0) {
    return { hasEvidence: false, evidence: 'No usable descriptions in Brave results.' };
  }
  return {
    hasEvidence: true,
    evidence: `[brave] ${snippets.join(' | ')}`,
    provider: 'brave'
  };
}

// Wikipedia: free, no key - but DNS-hijacked in mainland China by the GFW.
// Disabled by default. See README Limitations.
async function searchWikipedia(claim) {
  throw new Error('wikipedia provider disabled in this env');
}

// Tavily: needs TAVILY_API_KEY. Designed for AI fact-check.
async function searchTavily(claim) {
  throw new Error('tavily not configured: set TAVILY_API_KEY in .env');
}

// Dispatcher: routes claim to provider. Catches errors and converts to hasEvidence:false
// with a [provider] error prefix, so callers never need try/catch around search.
async function searchWithProvider(claim, opts = {}) {
  const providerName = (opts.provider || process.env.SEARCH_PROVIDER || 'ddg').toLowerCase();
  const dispatch = {
    ddg: searchDDG,
    brave: searchBrave,
    wikipedia: searchWikipedia,
    tavily: searchTavily
  };
  const fn = dispatch[providerName];
  if (!fn) {
    return {
      hasEvidence: false,
      evidence: `[${providerName}] error: unknown provider (set SEARCH_PROVIDER to ddg|brave|wikipedia|tavily)`,
      provider: providerName
    };
  }
  try {
    const r = await fn(claim, opts);
    return { ...r, provider: providerName };
  } catch (err) {
    const code = err && err.code;
    const rawMsg = (err && err.message) || String(err);
    const isTimeout = code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(rawMsg);
    const clean = rawMsg.replace(/https?:\/\/[^\s)]+/g, '<url>').slice(0, 200);
    const reason = isTimeout ? 'search timeout after 30s' : clean;
    return {
      hasEvidence: false,
      evidence: `[${providerName}] error: ${reason}`,
      provider: providerName
    };
  }
}

module.exports = { searchDDG, searchBrave, searchWikipedia, searchTavily, searchWithProvider, rewriteQuery };