import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const homepageDuration  = new Trend('homepage_duration',  true);
const eventsDuration    = new Trend('events_duration',    true);
const errorRate         = new Rate('error_rate');
const totalRequests     = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '20s', target: 25  },  // ramp up to 25 users
    { duration: '30s', target: 50  },  // ramp to 50
    { duration: '30s', target: 50  },  // hold at 50
    { duration: '10s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration:  ['p(95)<3000'],  // 95% of requests under 3s
    http_req_failed:    ['rate<0.02'],   // less than 2% errors
    homepage_duration:  ['p(95)<3000'],
    events_duration:    ['p(95)<3000'],
  },
};

const BASE = 'https://www.useswitch.net';

export default function () {
  // ── Homepage ──
  const home = http.get(BASE + '/', {
    tags: { name: 'homepage' },
  });
  check(home, {
    'homepage 200':      (r) => r.status === 200,
    'homepage < 5s':     (r) => r.timings.duration < 5000,
  });
  homepageDuration.add(home.timings.duration);
  errorRate.add(home.status !== 200);
  totalRequests.add(1);

  sleep(1);

  // ── Events listing ──
  const events = http.get(BASE + '/events', {
    tags: { name: 'events' },
  });
  check(events, {
    'events 200':    (r) => r.status === 200,
    'events < 5s':   (r) => r.timings.duration < 5000,
  });
  eventsDuration.add(events.timings.duration);
  errorRate.add(events.status !== 200);
  totalRequests.add(1);

  sleep(1);
}
