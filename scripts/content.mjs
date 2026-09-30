import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { marked, Renderer } from 'marked';

export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plain = value => String(value ?? '').replace(/<!--[^]*?-->/g, '').replace(/<[^>]*>/g, '').replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/[*_`]/g, '').trim();
const empty = value => value === undefined || value === null || value === '' || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
export function fallback(base, translated) {
  if (empty(translated)) return structuredClone(base);
  if (typeof base === 'object' && base && !Array.isArray(base) && typeof translated === 'object' && !Array.isArray(translated)) {
    return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(translated)])].map(k => [k, fallback(base[k], translated[k])]));
  }
  return structuredClone(translated);
}
export async function readContent(root, language, filename) {
  let source;
  try { source = await fs.readFile(path.join(root, 'content', language, filename), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return { data: {}, sections: {} }; throw error; }
  const front = source.match(/^\uFEFF?---\r?\n([^]*?)\r?\n---(?:\r?\n|$)/);
  const data = front ? YAML.parse(front[1]) || {} : {};
  const body = source.slice(front?.[0].length || 0).replace(/<!--[^]*?-->/g, '');
  const sections = {};
  const chunks = body.split(/^# (.+)\r?$/m);
  for (let i = 1; i < chunks.length; i += 2) sections[chunks[i].trim()] = chunks[i + 1].trim();
  return { data, sections };
}
export async function localized(root, lang, filename) {
  const english = await readContent(root, 'en', filename);
  return lang === 'en' ? english : fallback(english, await readContent(root, lang, filename));
}
const renderer = new Renderer();
renderer.html = () => '';
export const markdown = value => marked.parse(String(value || ''), { renderer });
export function features(value) {
  const chunks = String(value || '').split(/^## (.+)\r?$/m);
  const rows = [];
  for (let i = 1; i < chunks.length; i += 2) rows.push({ title: chunks[i].trim(), body: chunks[i + 1].trim() });
  return rows;
}
export function translatedFeatures(english, translated) {
  const base = features(english), local = features(translated);
  return Array.from({ length: Math.max(base.length, local.length) }, (_, i) => fallback(base[i] || {}, local[i]));
}
export function releaseDate(value, display = 'date', lang = 'en') {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`release_datetime must be ISO 8601 with +09:00: ${value}`);
  if (!['date', 'month', 'year', 'datetime'].includes(display)) throw new Error(`Unknown release_display: ${display}`);
  const date = new Date(value), locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  const options = { year: 'numeric', ...(display !== 'year' ? { month: 'long' } : {}), ...(['date', 'datetime'].includes(display) ? { day: 'numeric' } : {}) };
  if (display !== 'datetime') return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'Asia/Seoul' }).format(date);
  return [['KST', 'Asia/Seoul'], ['PT', 'America/Los_Angeles'], ['UTC', 'UTC']].map(([label, timeZone]) => {
    const day = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone }).format(date);
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
    const zone = label === 'PT' ? `PT (${new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(date).find(p => p.type === 'timeZoneName').value})` : label;
    return `${day} ${time} ${zone}`;
  }).join('\n');
}
