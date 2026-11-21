// Server-side vertaling naar het Engels met hetzelfde woordenboek als de app (site/i18n/en.json).
// Engels is de standaard; Nederlands alleen voor wie dat zelf kiest.
let DICT = null, RX = null, T = 0;
const NUM = /[−+\-]?(?:€|\$)?\s?\d[\d.,]*(?:\s?(?:%|×|x\b|k\b|mln\b|mld\b))?/g;
const NUMNL = /(?<![\d.,:])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+)(?!\d|[.,]\d)/g;
const DAYS = { maandag: 'Monday', dinsdag: 'Tuesday', woensdag: 'Wednesday', donderdag: 'Thursday', vrijdag: 'Friday', zaterdag: 'Saturday', zondag: 'Sunday', ma: 'Mon', di: 'Tue', wo: 'Wed', do: 'Thu', vr: 'Fri', za: 'Sat', zo: 'Sun' };
const MONTHS = { januari: 'January', februari: 'February', maart: 'March', april: 'April', mei: 'May', juni: 'June', juli: 'July', augustus: 'August', september: 'September', oktober: 'October', november: 'November', december: 'December', jan: 'Jan', feb: 'Feb', mrt: 'Mar', apr: 'Apr', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', okt: 'Oct', nov: 'Nov', dec: 'Dec' };
const norm = t => t.replace(/\s+/g, ' ').trim();
const numfix = s => !/\d[.,]\d/.test(s) ? s : s.replace(NUMNL, m => m.replace(/[.,]/g, c => c === '.' ? ',' : '.')).replace(/€\s(?=[−+\-]?\d)/g, '€');
const dates = s => !/\d/.test(s) ? s : s.replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/g, m => DAYS[m]).replace(/\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/g, m => MONTHS[m]);
const units = s => s.replace(/(\d)\s?mld\b/g, '$1 bn').replace(/(\d)\s?mln\b/g, '$1 mn');

export async function loadDict(env) {
  if (DICT && Date.now() - T < 30 * 60e3) return DICT;
  try { const base = env.PUBLIC_URL || 'https://vantis.rijnstadmarketing.workers.dev'; const r = env.ASSETS ? await env.ASSETS.fetch(new Request(base + '/i18n/en.json')) : null; if (r && r.ok) { DICT = await r.json(); RX = (DICT.__rx || []).map(([p, x]) => [new RegExp(p), x]); T = Date.now(); } } catch (e) { }
  return DICT || {};
}
/* één regel of zin vertalen; onbekende tekst blijft staan */
function line(s) {
  if (!s || !DICT) return s; s = numfix(s); if (!/[a-zA-Zà-ü]/.test(s)) return s;
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = norm(s);
  if (DICT[core] != null) return lead + DICT[core] + tail;
  const nums = []; const k = core.replace(NUM, m => { nums.push(m); return '{}'; }); if (DICT[k] != null) { let i = 0; return lead + DICT[k].replace(/\{\}/g, () => nums[i++] ?? '') + tail; }
  for (const [re, r] of RX || []) if (re.test(core)) return lead + dates(core.replace(re, r)) + tail;
  const a = DICT.__acad && DICT.__acad[core]; if (a) return lead + a + tail;
  return lead + dates(core) + tail;
}
/* tekst met meerdere regels, opsommingstekens en **vet** */
export function en(s) {
  if (s == null || typeof s !== 'string' || !DICT) return s;
  return units(s.split('\n').map(L => { const m = L.match(/^(\s*(?:[•\-*]|\d+\.)\s+)?(\*\*)?(.*?)(\*\*)?(\s*)$/); if (!m) return line(L);
    const body = m[3]; if (!body) return L; let out = line(body);
    if (out === body && /[.!?] /.test(body)) out = body.split(/(?<=[.!?]) /).map(line).join(' '); // zin voor zin
    return (m[1] || '') + (m[2] || '') + out + (m[4] || '') + (m[5] || ''); }).join('\n'));
}
/* taal van een gebruiker uit de voorkeuren: Engels tenzij 'nl' gekozen */
export const langOf = settingsJson => { try { return (typeof settingsJson === 'string' ? JSON.parse(settingsJson || '{}') : settingsJson || {}).lang === 'nl' ? 'nl' : 'en'; } catch (e) { return 'en'; } };
export const tx = (lang, s) => lang === 'nl' ? s : en(s);
/* een Discord-bericht (content + embeds) vertalen */
export function enPayload(p) {
  if (!p) return p; const o = { ...p }; if (o.content) o.content = en(o.content);
  if (o.embeds) o.embeds = o.embeds.map(e => ({ ...e, title: e.title ? en(e.title) : e.title, description: e.description ? en(e.description) : e.description, footer: e.footer ? { ...e.footer, text: en(e.footer.text) } : e.footer, fields: e.fields ? e.fields.map(f => ({ ...f, name: en(f.name), value: en(f.value) })) : e.fields }));
  return o;
}
