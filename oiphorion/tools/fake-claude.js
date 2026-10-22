// journey.js의 doc(path).get()/set(), user.id() 계약. 데이터는 Node 메모리에서 공유한다.
const path = require('path');
const fs = require('fs');
const localBrowsers = path.resolve(__dirname, '../node_modules/.playwright-browsers');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(localBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
const BASE = 'data/users/e2e-user/journey/';
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
function fixture(name) {
  name = (name || '').replace(/^F-/, '');
  const docs = { [BASE + 'meta/since']: { day: '2026-10-22' } };
  if (!name) return docs;
  const lines = { lose2: [2, 1, 2, 1, 1, 1], lose3: [1, 3, 3, 1, 1, 1], keep: [1, 1, 1, 1, 1, 1] }[name];
  if (!lines) throw new Error('Unknown fixture: ' + name);
  lines.forEach((line, i) => {
    const day = `2026-11-0${i + 2}`;
    docs[BASE + 'days/' + day] = { woke: line === 1 ? '07:30' : line === 2 ? '08:40' : '11:00', line, savedAt: Date.parse(day + 'T10:00:00+09:00') };
  });
  return docs;
}
function createFakeClaude(options = {}) {
  const documents = new Map(Object.entries({ ...fixture(options.fixture), ...clone(options.documents || {}) }));
  const writes = new Map(), history = [], installed = new WeakSet();
  const fullPath = p => p.startsWith('data/') ? p : BASE + p;
  return {
    documents, writes, history,
    get(p) { return clone(documents.get(fullPath(p))); },
    writeCount(p) { return p ? writes.get(fullPath(p)) || 0 : [...writes.values()].reduce((a, b) => a + b, 0); },
    async install(page) {
      if (installed.has(page)) return;
      installed.add(page);
      await page.exposeBinding('__fakeClaudeCall', async (_source, operation, p, value) => {
        if (operation === 'get') return { value: clone(documents.get(p)) ?? null, fromCache: !!options.fromCache };
        if (operation !== 'set') throw new Error('Unknown fake DB operation: ' + operation);
        documents.set(p, clone(value)); writes.set(p, (writes.get(p) || 0) + 1);
        history.push({ path: p, value: clone(value) });
      });
      await page.addInitScript(({ noDb }) => {
        const doc = p => ({
          async get() {
            const r = await window.__fakeClaudeCall('get', p);
            return { exists: r.value !== null, metadata: { fromCache: r.fromCache }, fromCache: r.fromCache, data: () => r.value };
          },
          set: value => window.__fakeClaudeCall('set', p, value),
        });
        const db = { doc, collection: p => ({ doc: id => doc(p + '/' + id) }) };
        window.claude = { async use(service) {
          if (service === 'db') return noDb ? null : db;
          if (service === 'user') return { id: async () => 'e2e-user' };
          throw new Error('Unexpected claude.use: ' + service);
        } };
      }, { noDb: options.db === null });
    },
  };
}
function fixedTime(iso) {
  const result = new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(iso) ? iso : iso + '+09:00');
  if (!Number.isFinite(result.getTime())) throw new Error('Invalid ISO time: ' + iso);
  return result;
}
module.exports = { createFakeClaude, fixture, fixedTime, BASE };
