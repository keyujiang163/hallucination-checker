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

// Split text into atomic claims using the LLM
async function splitClaims(text) {
  const prompt = `从下面这段 AI 回答中拆出可独立验证的事实点。每条必须是一个具体断言,长度不超过 30 个汉字。
严格只返回 JSON 数组,不要任何解释、不要 Markdown 代码块。例如:["地球是圆的","水的沸点是100度"]

待拆文本:
"""${text}"""`;

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
      ...(LLM_KEY ? { 'Authorization': `Bearer ${LLM_KEY}` } : {})
    },
    timeout: 30000
  });

  const raw = resp.data?.choices?.[0]?.message?.content || '[]';
  // Try to extract JSON array from the response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (Array.isArray(arr)) {
      return arr.filter(c => typeof c === 'string' && c.trim().length > 0).slice(0, 5);
    }
    return [];
  } catch (_) {
    return [];
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
