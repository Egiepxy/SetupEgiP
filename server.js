const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
// A API de futuros/contratos da MEXC usa contract.mexc.com.
const MEXC_FUTURES_BASES = [
  'https://contract.mexc.com',
  // fallback mantido apenas para diagnóstico/compatibilidade futura
  'https://api.mexc.com'
];

function send(res, status, body, type='text/plain; charset=utf-8', extraHeaders={}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders
  });
  res.end(body);
}

function getText(target, timeoutMs=12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(target, {
      headers: {
        'User-Agent': 'SetupEgiP-V7/1.0',
        'Accept': 'application/json'
      }
    }, upstream => {
      let data = '';
      upstream.setEncoding('utf8');
      upstream.on('data', chunk => data += chunk);
      upstream.on('end', () => resolve({
        status: upstream.statusCode || 502,
        type: upstream.headers['content-type'] || 'application/json; charset=utf-8',
        data
      }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function validKlinePayload(text) {
  try {
    const j = JSON.parse(text);
    const d = j && j.data;
    return j && j.success !== false && d && Array.isArray(d.time) && d.time.length > 0;
  } catch (_) {
    return false;
  }
}

async function proxyKline(req, res, u) {
  const symbol = u.searchParams.get('symbol') || 'UKOIL_USDT';
  const interval = u.searchParams.get('interval') || 'Hour4';
  const start = u.searchParams.get('start') || '';
  const end = u.searchParams.get('end') || '';

  const allowedIntervals = new Set(['Min15','Min60','Hour4','Day1']);
  if (!/^[A-Z0-9_]+$/.test(symbol) || !allowedIntervals.has(interval)) {
    return send(res, 400, JSON.stringify({success:false,message:'Parâmetros inválidos'}), 'application/json; charset=utf-8');
  }

  const qs = new URLSearchParams({interval});
  if (start) qs.set('start', start);
  if (end) qs.set('end', end);

  const errors = [];
  for (const base of MEXC_FUTURES_BASES) {
    const target = `${base}/api/v1/contract/kline/${encodeURIComponent(symbol)}?${qs.toString()}`;
    try {
      const out = await getText(target);
      if (out.status >= 200 && out.status < 300 && validKlinePayload(out.data)) {
        return send(res, 200, out.data, out.type, {'X-SetupEgiP-Source': base});
      }
      errors.push(`${base}: HTTP ${out.status}${validKlinePayload(out.data) ? '' : ' / resposta sem candles'}`);
    } catch (err) {
      errors.push(`${base}: ${err.message}`);
    }
  }

  return send(res, 502, JSON.stringify({
    success:false,
    message:'Falha ao consultar histórico de futuros da MEXC',
    details:errors
  }), 'application/json; charset=utf-8');
}

function serveStatic(req, res, u) {
  let pathname = decodeURIComponent(u.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Acesso negado');

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Arquivo não encontrado');
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html':'text/html; charset=utf-8',
      '.js':'application/javascript; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.json':'application/json; charset=utf-8',
      '.png':'image/png',
      '.svg':'image/svg+xml'
    };
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (u.pathname === '/api/kline') return proxyKline(req, res, u);
  if (u.pathname === '/api/health') return send(res, 200, JSON.stringify({ok:true,app:'SetupEgiP V7'}), 'application/json; charset=utf-8');
  return serveStatic(req, res, u);
});

server.listen(PORT, () => {
  console.log(`SetupEgiP V7 ativo na porta ${PORT}`);
});
