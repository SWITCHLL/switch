/**
 * Stress test for useswitch.net
 * Zero dependencies — uses Node.js built-in https module
 *
 * Run: node stress-test.mjs
 */

import https from 'node:https';

const BASE_HOST = 'www.useswitch.net';

const ENDPOINTS = [
  { title: 'Homepage',       path: '/' },
  { title: 'Events listing', path: '/events' },
];

const CONCURRENT_USERS = 50;
const DURATION_MS      = 30_000; // 30 seconds per endpoint

function request(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(
      { host: BASE_HOST, path, headers: { 'user-agent': 'stress-test/1.0' } },
      (res) => {
        res.resume(); // drain body
        res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - start, error: null }));
      }
    );
    req.setTimeout(10_000, () => { req.destroy(); resolve({ status: 0, ms: 10_000, error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, ms: Date.now() - start, error: e.message }));
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function testEndpoint({ title, path }) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Testing: ${title}  →  https://${BASE_HOST}${path}`);
  console.log(`Concurrency: ${CONCURRENT_USERS} users | Duration: ${DURATION_MS / 1000}s`);
  console.log('─'.repeat(60));

  const results   = [];
  const endTime   = Date.now() + DURATION_MS;
  let   completed = 0;

  // Worker: keeps firing requests until time is up
  async function worker() {
    while (Date.now() < endTime) {
      const r = await request(path);
      results.push(r);
      completed++;
    }
  }

  // Spawn N concurrent workers
  process.stdout.write('Running');
  const ticker = setInterval(() => process.stdout.write('.'), 2000);
  await Promise.all(Array.from({ length: CONCURRENT_USERS }, worker));
  clearInterval(ticker);
  console.log(' done.\n');

  // Analyse
  const total    = results.length;
  const errors   = results.filter(r => r.error).length;
  const non2xx   = results.filter(r => !r.error && (r.status < 200 || r.status >= 300)).length;
  const latencies = results.filter(r => !r.error).map(r => r.ms).sort((a, b) => a - b);

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const rps = (total / (DURATION_MS / 1000)).toFixed(1);

  // Status code breakdown
  const statusMap = {};
  results.forEach(r => {
    const key = r.error ? 'error' : String(r.status);
    statusMap[key] = (statusMap[key] || 0) + 1;
  });

  console.log(`  Total requests  : ${total}`);
  console.log(`  Requests/sec    : ${rps}`);
  console.log(`  Latency avg     : ${avg}ms`);
  console.log(`  Latency p50     : ${p50}ms`);
  console.log(`  Latency p95     : ${p95}ms`);
  console.log(`  Latency p99     : ${p99}ms`);
  console.log(`  Errors          : ${errors}`);
  console.log(`  Non-2xx         : ${non2xx}`);
  console.log(`  Status codes    : ${JSON.stringify(statusMap)}`);

  let verdict;
  if (errors === 0 && non2xx === 0 && p95 < 2000) {
    verdict = `✅ HEALTHY   — p95 ${p95}ms, ${rps} RPS, zero errors`;
  } else if (errors + non2xx < total * 0.02 && p95 < 5000) {
    verdict = `⚠️  MARGINAL  — p95 ${p95}ms, ${errors + non2xx} bad responses`;
  } else {
    verdict = `❌ STRUGGLING — p95 ${p95}ms, ${errors} errors, ${non2xx} non-2xx`;
  }
  console.log(`\n  ${verdict}`);

  return { title, total, rps, p50, p95, p99, errors, non2xx };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       useswitch.net — Production Read-Only Stress Test   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Target  : https://${BASE_HOST}`);
  console.log(`Users   : ${CONCURRENT_USERS} concurrent`);
  console.log(`Duration: ${DURATION_MS / 1000}s per endpoint\n`);

  const summary = [];
  for (const ep of ENDPOINTS) {
    const r = await testEndpoint(ep);
    summary.push(r);
    if (ep !== ENDPOINTS.at(-1)) {
      process.stdout.write('\nPausing 3s before next endpoint...');
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  const h = (s, w) => s.toString().padEnd(w);
  console.log(`${h('Endpoint', 20)} ${h('RPS', 8)} ${h('p50', 8)} ${h('p95', 8)} ${h('p99', 8)} Errors`);
  console.log('─'.repeat(65));
  for (const r of summary) {
    console.log(`${h(r.title, 20)} ${h(r.rps, 8)} ${h(r.p50+'ms', 8)} ${h(r.p95+'ms', 8)} ${h(r.p99+'ms', 8)} ${r.errors + r.non2xx}`);
  }
  console.log('\nNote: This tests read-only pages. Write endpoints (reservations,');
  console.log('checkout) require the load-test bypass header to test safely.');
}

main().catch(console.error);
