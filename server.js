// Hallucination Checker MVP - server.js
// Flow: text in -> LLM splits claims -> search provider verifies each -> green/red report
// Search: see searchProviders.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { searchWithProvider } = require('./searchProviders');
const { requireQuota } = require('./quota');

const app = express();
const PORT = process.env.PORT || 3737;

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: '请求过快,1 分钟最多 30 次' }
});

// Body parsing: json for all routes EXCEPT /api/webhook/stripe (Stripe needs raw bytes
// for signature verification). Defer json parse so the webhook route can capture raw.
app.use((req, res, next) => {
  if (req.path === '/api/webhook/stripe') return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
app.use(express.static(path.join(__dirname, 'public')));

// --- Billing (Stripe) ---
// Plans are defined statically here; switch to DB when we add user accounts.
const PRICING_PLANS = [
  { plan: 'free', price: 0, quota: 50 },
  { plan: 'pro', price: 9, quota: 1000 },
  { plan: 'team', price: 49, quota: 10000 }
];

// Lazy-loaded Stripe client. We don't touch stripe.* on import if STRIPE_SECRET is absent
// so dev mode (no secret) still boots cleanly.
const STRIPE_SECRET = process.env.STRIPE_SECRET || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
let stripeClient = null;
function getStripe() {
  if (stripeClient !== null) return stripeClient;
  if (!STRIPE_SECRET) return null;
  // require lazily so missing SECRET doesn't crash dev
  const Stripe = require('stripe');
  stripeClient = new Stripe(STRIPE_SECRET, { apiVersion: '2024-09-30.acacia' });
  return stripeClient;
}

// LLM provider abstraction. Each entry tells the request layer:
// - baseUrl: REST endpoint (no trailing slash) for chat completions
// - model: default model id (overridable via env LLM_MODEL_<PROVIDER>)
// - keyEnv: which process.env var carries the API key
// - headers(promptMessages): returns the headers object for fetch
// - payload(model, messages, temperature): returns the JSON body to POST
// Abstract only — only the active provider is actually invoked. Others defined
// but never called until provider is switched at runtime via LLM_PROVIDER env.
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'minimax').toLowerCase();

const LLM_PROVIDERS = {
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: process.env.LLM_MODEL || 'MiniMax-M3',
    keyEnv: 'MINIMAX_API_KEY',
    headers: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || ''}`
    }),
    payload: (model, messages, temperature) => ({ model, messages, temperature })
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: process.env.LLM_MODEL_ANTHROPIC || 'claude-3-5-sonnet-latest',
    keyEnv: 'ANTHROPIC_API_KEY',
    headers: () => ({
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    }),
    payload: (model, messages, temperature) => ({
      model,
      max_tokens: 1024,
      messages: messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }))
    })
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: process.env.LLM_MODEL_OPENAI || 'gpt-4o-mini',
    keyEnv: 'OPENAI_API_KEY',
    headers: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
    }),
    payload: (model, messages, temperature) => ({ model, messages, temperature })
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: process.env.LLM_MODEL_DEEPSEEK || 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY',
    headers: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`
    }),
    payload: (model, messages, temperature) => ({ model, messages, temperature })
  }
};

const LLM_ACTIVE = LLM_PROVIDERS[LLM_PROVIDER];
const LLM_URL = LLM_ACTIVE ? LLM_ACTIVE.baseUrl : LLM_PROVIDERS.minimax.baseUrl;
const LLM_MODEL = LLM_ACTIVE ? LLM_ACTIVE.model : LLM_PROVIDERS.minimax.model;
const LLM_KEY = process.env[LLM_ACTIVE ? LLM_ACTIVE.keyEnv : 'MINIMAX_API_KEY'] || '';

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
    const messages = [
      { role: 'system', content: '你是一个严格的事实点拆分器,只输出 JSON 数组。' },
      { role: 'user', content: prompt }
    ];
    const resp = await axios.post(
      LLM_URL,
      LLM_ACTIVE.payload(LLM_MODEL, messages, 0.2),
      {
        headers: LLM_ACTIVE.headers(),
        timeout: 30000
      }
    );

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
app.post('/api/check', apiLimiter, requireQuota('free'), async (req, res) => {
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
      // Rate limit: 2s between search requests
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      console.error(`[check] claim="${claim}"`);
      const r = await searchWithProvider(claim);
      status = r.hasEvidence ? 'verified' : 'unverified';
      evidence = r.evidence;
    } catch (err) {
      status = 'unknown';
      // Sanitize: never echo axios config / URL / token. Map timeout to friendly text.
      const code = err && err.code;
      const rawMsg = (err && err.message) || String(err);
      const isTimeout = code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(rawMsg);
      if (isTimeout) {
        evidence = 'search timeout after 30s, 已重试 1 次';
      } else {
        // Strip any URL fragment + cap length; never include request headers/config.
        const clean = rawMsg.replace(/https?:\/\/[^\s)]+/g, '<url>').slice(0, 200);
        evidence = `search error: ${clean}`;
      }
    }
    results.push({ claim, status, evidence });
  }

  res.json({ results, claimCount: results.length });
});

// --- Billing API ---

// GET /api/pricing — static plan catalog. Future: read from Stripe Products API.
app.get('/api/pricing', (req, res) => {
  res.json(PRICING_PLANS);
});

// POST /api/checkout/create-session — create a Stripe Checkout session.
// Body: { plan: 'free' | 'pro' | 'team' }
// When STRIPE_SECRET is set, calls stripe.checkout.sessions.create for real.
// Without a secret, returns a fixed stub URL so the UI flow can be dev-tested.
app.post('/api/checkout/create-session', apiLimiter, async (req, res) => {
  try {
    const plan = String((req.body && req.body.plan) || '').toLowerCase();
    const found = PRICING_PLANS.find(p => p.plan === plan);
    if (!found) {
      return res.status(400).json({ error: 'invalid_plan', message: `unknown plan "${plan}"` });
    }
    if (plan === 'free') {
      return res.json({ url: `${SITE_URL}/?plan=free`, stub: true });
    }
    const stripe = getStripe();
    if (!stripe) {
      // Dev fallback: no STRIPE_SECRET configured. Return a stub URL.
      return res.json({
        url: `https://checkout.stripe.com/test_${plan}_stub`,
        stub: true,
        message: 'STRIPE_SECRET not configured; returning stub URL. Set STRIPE_SECRET in .env to enable real checkout.'
      });
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: { name: `Hallucination Checker ${plan.toUpperCase()}` },
          unit_amount: found.price * 100
        },
        quantity: 1
      }],
      success_url: `${SITE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/?checkout=cancelled`
    });
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    // Never echo key/secret; only safe fields + status.
    const status = err && err.statusCode ? err.statusCode : 500;
    const rawType = err && err.type ? String(err.type) : 'stripe_error';
    console.error(`[stripe create-session] type=${rawType} status=${status} msg=${String(err.message || err).slice(0, 200)}`);
    return res.status(status).json({ error: 'checkout_create_failed', type: rawType });
  }
});

// POST /api/webhook/stripe — receives Stripe events.
// Signature verification is REAL and MUST run before trusting the payload.
// When STRIPE_WEBHOOK_SECRET is missing, still attempts verification so the code path is
// exercised in dev; in that case the header check is skipped but the constructEvent call
// still runs against any incoming body+sig. (Stripe test events will fail without a real
// secret, which is the correct behaviour — Stripe returns a signed event only after the
// endpoint is configured in the dashboard.)
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.body; // Buffer because of express.raw
  // Always log a marker; never echo the secret.
  console.error(`[stripe webhook] received size=${rawBody && rawBody.length} sig=${sig ? 'present' : 'missing'} secret=${STRIPE_WEBHOOK_SECRET ? 'configured' : 'unset'}`);
  if (!sig) {
    return res.status(400).json({ error: 'missing_signature', message: 'Stripe-Signature header required' });
  }
  // Even when no secret is configured, we keep this code path so the contract is
  // exercised. Without STRIPE_SECRET we cannot instantiate the SDK; surface that as a 400
  // (configuration error) rather than letting it bypass verification silently.
  const secret = STRIPE_WEBHOOK_SECRET || '';
  const stripe = getStripe();
  if (!stripe) {
    return res.status(400).json({
      error: 'webhook_not_configured',
      message: 'STRIPE_SECRET missing; cannot verify signature'
    });
  }
  if (!secret) {
    return res.status(400).json({
      error: 'webhook_secret_missing',
      message: 'STRIPE_WEBHOOK_SECRET missing; cannot verify signature'
    });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error(`[stripe webhook] signature_failed msg=${String(err.message || err).slice(0, 200)}`);
    return res.status(400).json({ error: 'invalid_signature', message: String(err.message || err).slice(0, 200) });
  }
  // Minimal event router — extend as subscriptions / invoices arrive.
  switch (event.type) {
    case 'checkout.session.completed':
      console.error(`[stripe webhook] checkout.session.completed id=${event.data && event.data.object && event.data.object.id}`);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      console.error(`[stripe webhook] ${event.type} id=${event.data && event.data.object && event.data.object.id}`);
      break;
    default:
      console.error(`[stripe webhook] unhandled_type=${event.type}`);
  }
  return res.json({ received: true, type: event.type });
});

// --- Account & Billing Portal (day 2) ---
// Demo-mode: IP doubles as user_id. When real auth lands, swap for req.user.id.
// Customer mapping (ip -> stripe customer) is not persisted yet; once the webhook
// stores customer IDs we'll hydrate these endpoints from that table.

// GET /api/account — returns plan + quota usage + (optional) stripe customer id.
app.get('/api/account', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip || req.socket.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const { loadQuota } = require('./quota');
  const db = loadQuota();
  const entry = db[ip] || { date: today, count: 0 };
  const used = entry.date === today ? entry.count : 0;
  // Demo: no real Stripe customer bound yet (webhook will populate once shipped).
  res.json({
    user_id: ip,
    customer_id: null,
    plan: 'free',
    quota_used: used,
    quota_limit: 50
  });
});

// POST /api/portal — opens Stripe Billing Portal for the current customer.
// Without STRIPE_SECRET, returns a stub URL so the UI flow is testable in dev.
app.post('/api/portal', async (req, res) => {
  try {
    const customer = (req.body && req.body.customer_id) || null;
    const stripe = getStripe();
    if (!stripe) {
      return res.json({
        url: `https://billing.stripe.com/test_portal_stub?customer=${encodeURIComponent(customer || 'anonymous')}`,
        stub: true,
        message: 'STRIPE_SECRET not configured; returning stub URL.'
      });
    }
    if (!customer) {
      return res.status(400).json({
        error: 'no_customer',
        message: 'No Stripe customer bound to this session yet.'
      });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${SITE_URL}/?portal=return`
    });
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    const rawType = err && err.type ? String(err.type) : 'stripe_error';
    console.error(`[stripe portal] type=${rawType} status=${status} msg=${String(err.message || err).slice(0, 200)}`);
    return res.status(status).json({ error: 'portal_create_failed', type: rawType });
  }
});

app.listen(PORT, () => {
  console.log(`hallucination-checker listening on http://localhost:${PORT}`);
});
