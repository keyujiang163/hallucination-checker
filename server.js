// Hallucination Checker MVP - server.js
// Flow: text in -> LLM splits claims -> DuckDuckGo verifies each -> green/red report
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3737;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MiniMax LLM endpoint (OpenAI-compatible)
const LLM_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
const LLM_MODEL = process.env.LLM_MODEL || 'MiniMax-M3';
const LLM_KEY = process.env.MINIMAX_API_KEY || '';

// Rule-based fallback splitter: no LLM, no keys, deterministic.
// Returns an array of { claim: string } objects (compatible with JSON array shape).
function fallbackSplitClaims(text) {
  if (!text || typeof text !== 'string') return [];
  // Detect CJK vs Latin: if any CJK char present, treat as Chinese
  const hasCJK = /[\u4e00-\u9fff]/.test(text);
  let pieces;
  if (hasCJK) {
    // Split on Chinese sentence boundaries: 。 ! ? ；
    pieces = text.split(/[。！？；]+/);
  } else {
    // English: split on . ! ? ; followed by uppercase letter or newline/end
    pieces = text.split(/(?<=[.!?;])\s+(?=[A-Z])|(?<=[.!?;])\s*$/m);
    // Also try a simpler split if the lookbehind yielded nothing
    if (pieces.length <= 1) pieces = text.split(/[.!?;]+\s*/);
  }
  // Clean: trim, drop empties
  let cleaned = pieces
    .map(s => (s || '').trim())
    .filter(s => s.length > 0);
  // Truncate any over 200 chars by comma split (CJK or Latin)
  const out = [];
  for (const seg of cleaned) {
    if (seg.length <= 200) {
      out.push({ claim: seg });
    } else {
      const sub = hasCJK
        ? seg.split(/[,,]+/)
        : seg.split(/,\s*/);
      for (const s of sub) {
        const t = (s || '').trim();
        if (t.length > 0 && t.length <= 200) out.push({ claim: t });
        else if (t.length > 200) out.push({ claim: t.substring(0, 200) });
      }
    }
  }
  // Cap at 5 claims, same as LLM path
  return out.slice(0, 5);
}

// Split text into atomic claims. Tries LLM first; falls back to rules on any failure.
// Always returns string[] so downstream code (searchDDG) keeps working unchanged.
async function splitClaims(text) {
  // If no key configured, skip LLM entirely
  if (!LLM_KEY) {
    const reason = 'no_api_key';
    console.error(`[fallback] reason=${reason} input_len=${(text || '').length}`);
    return fallbackSplitClaims(text).map(o => o.claim);
  }

  const prompt = `从下面这段 AI 回答中拆出可独立验证的事实点。每条必须是一个具体断言,长度不超过 30 个汉字。
严格只返回 JSON 数组,不要任何解释、不要 Markdown 代码块。例如:["地球是圆的","水的沸点是100度"]

待拆文本:
"""${text}"""`;

  try {
    const resp = await axios.post(LLM_URL, {
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: '你是一个严格的事实点拆分器,只输出 JSON 数组。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_KEY}`
      },
      timeout: 30000
    });

    // Check API-level error code (some gateways use base_resp)
    const baseStatus = resp.data && resp.data.base_resp && resp.data.base_resp.status_code;
    if (baseStatus !== undefined && baseStatus !== 0) {
      const reason = `llm_base_resp_${baseStatus}`;
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }

    const choices = resp.data && resp.data.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      const reason = 'llm_empty_choices';
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }

    const raw = (choices[0].message && choices[0].message.content) || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      const reason = 'llm_no_json_array';
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }
    let arr;
    try {
      arr = JSON.parse(match[0]);
    } catch (e) {
      const reason = 'llm_json_parse';
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }
    if (!Array.isArray(arr)) {
      const reason = 'llm_not_array';
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }
    const strings = arr
      .map(c => {
        if (typeof c === 'string') return c.trim();
        if (c && typeof c === 'object' && typeof c.claim === 'string') return c.claim.trim();
        return '';
      })
      .filter(s => s.length > 0)
      .slice(0, 5);
    if (strings.length === 0) {
      const reason = 'llm_empty_strings';
      console.error(`[fallback] reason=${reason}`);
      return fallbackSplitClaims(text).map(o => o.claim);
    }
    return strings;
  } catch (err) {
    // Never echo any key/token; only the error message + code.
    const code = err && err.response && err.response.status;
    const reason = `llm_exception_${code || (err && err.code) || 'unknown'}`;
    console.error(`[fallback] reason=${reason}`);
    return fallbackSplitClaims(text).map(o => o.claim);
  }
}

// DuckDuckGo Instant Answer lookup (free, no key)
async function searchDDG(query) {
  const url = 'https://api.duckduckgo.com/';
  const resp = await axios.get(url, {
    params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
    timeout: 15000
  });
  const d = resp.data || {};
  const abstract = (d.AbstractText || '').trim();
  const related = Array.isArray(d.RelatedTopics) ? d.RelatedTopics : [];
  // Prefer abstract; fallback to first related topic with text
  if (abstract && abstract.length > 10) {
    return { hasEvidence: true, evidence: `${abstract} (source: ${d.AbstractSource || 'DuckDuckGo'})` };
  }
  for (const t of related) {
    if (t.Text && t.Text.length > 20) {
      return { hasEvidence: true, evidence: `${t.Text.substring(0, 200)} (source: DuckDuckGo Related)` };
    }
  }
  return { hasEvidence: false, evidence: 'No direct evidence found in DuckDuckGo Instant Answer.' };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'hallucination-checker', version: '0.1.0' });
});

// Demo route: hard-coded payload for E2E sanity checks. No LLM, no keys.
app.get('/api/demo', (req, res) => {
  res.json({
    text: '珠穆朗玛峰高 8848 米,是世界最高峰。',
    input2: '珠穆朗玛峰高 12000 米。'
  });
});

// Main fact-check endpoint
app.post('/api/check', async (req, res) => {
  const text = (req.body && req.body.text ? String(req.body.text) : '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  let claims = [];
  try {
    claims = await splitClaims(text);
  } catch (err) {
    return res.status(500).json({ error: 'LLM split failed', detail: String(err.message || err) });
  }

  if (claims.length === 0) {
    return res.json({ results: [], note: 'No factual claims extracted.' });
  }

  const results = [];
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    let status = 'unknown';
    let evidence = '';
    try {
      // Rate limit: 2s between DuckDuckGo requests
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      const r = await searchDDG(claim);
      status = r.hasEvidence ? 'verified' : 'unverified';
      evidence = r.evidence;
    } catch (err) {
      status = 'unknown';
      evidence = `search error: ${String(err.message || err)}`;
    }
    results.push({ claim, status, evidence });
  }

  res.json({ results, claimCount: results.length });
});

app.listen(PORT, () => {
  console.log(`hallucination-checker listening on http://localhost:${PORT}`);
});
