import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { escape as e, plain, fallback, readContent, localized, markdown, translatedFeatures, releaseDate } from './content.mjs';

// Avoid holding source files open on Windows between builds and asset replacements.
sharp.cache(false);

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = async file => !!(await fs.stat(file).catch(() => null))?.isFile();
const href = value => /^https?:\/\//.test(value || '') ? e(value) : '';
const icons = {
  x: '<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9.1L.8 2h6.5l4.5 6.7L18.9 2ZM17.8 20h1.7L6.4 3.9H4.6L17.8 20Z"/>',
  youtube: '<path d="M23 7s-.3-2-1.1-2.9C20.8 3 19.6 3 19 2.9 15 2.6 12 2.6 12 2.6S9 2.6 5 2.9C4.4 3 3.2 3 2.1 4.1 1.3 5 1 7 1 7S.7 9.3.7 11.6v.8C.7 14.7 1 17 1 17s.3 2 1.1 2.9C3.2 21 4.7 21 5.3 21.1c3.3.3 6.7.3 6.7.3s3 0 7-.3c.6-.1 1.8-.1 2.9-1.2C22.7 19 23 17 23 17s.3-2.3.3-4.6v-.8C23.3 9.3 23 7 23 7ZM9.7 16.1V7.9l7.2 4.1-7.2 4.1Z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>',
  bluesky: '<path d="M5 3c3 2 6 6 7 8 1-2 4-6 7-8 2-1 4-1 4 2 0 1-1 7-2 8-1 2-4 2-6 1 4 1 5 4 2 6-3 3-4-1-5-3-1 2-2 6-5 3-3-2-2-5 2-6-2 1-5 1-6-1C2 12 1 6 1 5c0-3 2-3 4-2Z"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">${icons[name] || icons.x}</svg>`;

export async function build({ root = project, siteUrl = process.env.SITE_URL } = {}) {
  root = path.resolve(root);
  const englishSite = await readContent(root, 'en', 'site.md');
  const origin = new URL(siteUrl || englishSite.data.site_url);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('site_url must use https:// or http://');
  if (!origin.pathname.endsWith('/')) origin.pathname += '/';
  const localPath = relative => {
    if (!relative || typeof relative !== 'string' || relative.includes('\\') || relative.includes('..') || !relative.startsWith('assets/')) throw new Error(`Invalid asset path: ${relative}`);
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) throw new Error('Asset outside project');
    return target;
  };
  const dimensions = new Map();
  async function ensureImage(relative, width = 1920, height = 1080) {
    if (!relative) return '';
    const target = localPath(relative);
    if (!await exists(target)) {
      if (!/\.(png|jpe?g|webp)$/i.test(relative)) return '';
      await fs.mkdir(path.dirname(target), { recursive: true });
      await sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).toFile(target);
      console.log(`White placeholder: ${relative}`);
    }
    if (!dimensions.has(relative)) dimensions.set(relative, await sharp(target).metadata());
    return relative;
  }
  async function scan(directory) {
    const full = localPath(directory);
    const files = await fs.readdir(full).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
    return files.filter(file => /\.(png|jpe?g|webp|gif)$/i.test(file)).sort().map(file => `${directory}/${file}`);
  }
  async function mediaFor(game) {
    const media = {};
    for (const category of ['screenshots', 'gifs', 'keyart', 'logos']) {
      const values = game.media?.[category] ?? await scan(`assets/${game.slug}/${category}`);
      media[category] = [];
      for (const value of values) {
        const item = typeof value === 'string' ? { src: value } : value;
        if (!item?.src || !await ensureImage(item.src)) continue;
        let poster = '';
        if (/\.gif$/i.test(item.src)) {
          poster = `assets/${game.slug}/thumbnails/${path.basename(item.src, '.gif')}-still.png`;
          await fs.mkdir(path.dirname(localPath(poster)), { recursive: true });
          await sharp(localPath(item.src), { animated: false }).png().toFile(localPath(poster));
          await ensureImage(poster);
        }
        media[category].push({ ...item, poster });
      }
    }
    return media;
  }
  const filenames = (await fs.readdir(path.join(root, 'content/en/games'))).filter(f => f.endsWith('.md')).sort();
  const bases = [];
  for (const filename of filenames) {
    const base = await readContent(root, 'en', `games/${filename}`);
    const slug = base.data.slug || filename.slice(0, -3);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || filename !== `${slug}.md`) throw new Error(`Filename must match kebab-case slug: ${filename}`);
    base.data.slug = slug;
    if (!base.data.title) throw new Error(`Missing game title: ${filename}`);
    releaseDate(base.data.release_datetime, base.data.release_display);
    for (const key of ['hero', 'background', 'cover', 'og_image']) if (base.data[key]) await ensureImage(base.data[key], key === 'cover' ? 600 : 1920, key === 'cover' ? 900 : 1080);
    const media = await mediaFor(base.data);
    const pressSource = await readContent(root, 'en', `press/${filename}`);
    if (pressSource.data.trailer_thumbnail) await ensureImage(pressSource.data.trailer_thumbnail);
    if (base.data.press_zip) {
      if (!base.data.press_zip.endsWith('/press.zip')) throw new Error('press_zip must end with /press.zip');
      const raw = [...new Set([base.data.hero, base.data.background, base.data.cover, base.data.og_image, pressSource.data.trailer_download, ...Object.values(media).flat().map(m => m.src)].filter(Boolean))];
      const entries = {};
      for (const source of raw) {
        const relative = path.posix.relative(`assets/${slug}`, source);
        const archivePath = relative.startsWith('../') ? source : relative;
        if (await exists(localPath(source))) entries[archivePath] = [new Uint8Array(await fs.readFile(localPath(source))), { mtime: new Date('2026-01-01T00:00:00Z') }];
      }
      if (raw.length) {
        await fs.mkdir(path.dirname(localPath(base.data.press_zip)), { recursive: true });
        const zipPath = localPath(base.data.press_zip);
        await fs.writeFile(zipPath + '.tmp', zipSync(entries));
        await fs.rename(zipPath + '.tmp', zipPath);
      }
    }
    bases.push({ filename, base, media });
  }
  const generated = [];
  for (const lang of ['en', 'ko']) {
    const site = (await localized(root, lang, 'site.md')).data, ui = site.ui;
    const home = await localized(root, lang, 'home.md');
    const listing = await localized(root, lang, 'games.md');
    await ensureImage(site.logo, 1024, 512);
    await ensureImage(site.favicon, 512, 512);
    await ensureImage(site.og_image, 1024, 512);
    if (home.data.poster) await ensureImage(home.data.poster);
    const games = [];
    for (const entry of bases) {
      const translation = lang === 'en' ? { data: {}, sections: {} } : await readContent(root, lang, `games/${entry.filename}`);
      const content = fallback(entry.base, translation);
      // Shared facts belong exclusively to the English source; localized display text can override the rest.
      for (const field of ['slug', 'release_datetime', 'release_display', 'price', 'trailer', 'hero', 'background', 'cover', 'og_image', 'press_zip']) content.data[field] = entry.base.data[field];
      content.data.platforms = (entry.base.data.platforms || []).map((platform, i) => ({ ...platform, name: translation.data.platforms?.[i]?.name || platform.name }));
      const pressEn = await readContent(root, 'en', `press/${entry.filename}`);
      const pressLocal = lang === 'en' ? { data: {}, sections: {} } : await readContent(root, lang, `press/${entry.filename}`);
      const press = fallback(pressEn, pressLocal);
      const sections = fallback(content.sections, press.sections);
      const featureRows = translatedFeatures(pressEn.sections['Key Features'] || entry.base.sections['Key Features'], pressLocal.sections['Key Features'] || translation.sections['Key Features']);
      // Media filenames remain shared; translated captions are optional.
      const media = structuredClone(entry.media);
      for (const category of Object.keys(media)) media[category].forEach((item, i) => { item.alt = translation.data.media?.[category]?.[i]?.alt || item.alt; });
      games.push({ ...content.data, sections, press: press.data, media, featureRows });
    }

    async function page(route, title, description, og, render) {
      const prefix = '../'.repeat(route.split('/').filter(Boolean).length) || './';
      const asset = source => prefix + source;
      const link = target => prefix + target + (lang === 'ko' ? 'ko.html' : 'index.html');
      const languageLink = targetLang => prefix + route + (targetLang === 'ko' ? 'ko.html' : 'index.html');
      const canonical = new URL(route + (lang === 'ko' ? 'ko.html' : ''), origin).href;
      const img = (source, alt = '', cls = '', eager = false) => {
        if (!source) return '';
        const size = dimensions.get(source);
        if (!size) throw new Error(`Image metadata not loaded: ${source}`);
        return `<img src="${e(asset(source))}" alt="${e(alt)}" class="${e(cls)}" width="${size.width}" height="${size.pageHeight || size.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
      };
      const button = (url, text, outline = false, extra = '') => `<a class="button${outline ? ' button-outline' : ''}" href="${e(url)}" ${extra}>${e(text)}</a>`;
      const platforms = game => (game.platforms || []).filter(p => href(p.url)).map(p => button(p.url, p.name + ' ↗', false, 'target="_blank" rel="noopener"')).join('');
      const copy = (id, label = ui.copy) => `<button class="copy" data-copy="${e(id)}" data-copied="${e(ui.copied)}" data-failed="${e(ui.copy_failed)}">${e(label)}</button>`;
      const featureCards = game => game.featureRows.length ? `<div class="features" id="feature-list">${game.featureRows.map((f, i) => `<article class="feature"><span class="feature-num" data-copy-ignore aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${e(f.title)}</h3>${markdown(f.body)}</article>`).join('')}</div>` : '';
      const trailer = game => {
        if (!href(game.trailer)) return '';
        const url = new URL(game.trailer);
        const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : /(^|\.)youtube\.com$/.test(url.hostname) ? (url.searchParams.get('v') || url.pathname.split('/').pop()) : '';
        if (!/^[\w-]{11}$/.test(id)) return `<div class="trailer-link">${button(game.trailer, ui.watch_trailer + ' ↗', false, 'target="_blank" rel="noopener"')}</div>`;
        return `<div class="video-shell" data-video="${e(id)}" data-title="${e(game.title + ' — ' + ui.trailer)}"><button class="video-play" aria-label="${e(ui.play_video)}">${game.cover ? img(game.cover, '', 'video-poster') : ''}<span class="play-label"><span aria-hidden="true">▶</span> ${e(ui.play_video)}</span></button></div>`;
      };
      const assetTitle = (item, i, category) => item.alt || (category === 'screenshots' ? `${ui.screenshot} ${String(i + 1).padStart(2, '0')}` : item.src.includes('portrait') ? ui.portrait : item.src.includes('landscape') ? ui.landscape : item.src.includes('square') ? ui.square : category === 'logos' ? ui.logo : `${gameTitlePlaceholder(category, ui)} ${i + 1}`);
      const assetCard = (item, i, category) => {
        const label = assetTitle(item, i, category), source = item.poster || item.src;
        return `<figure class="asset"><button class="zoom" data-src="${e(asset(source))}" data-original="${e(asset(item.src))}" data-alt="${e(label)}" aria-label="${e(ui.enlarge + ': ' + label)}">${img(source, label)}</button><figcaption><span>${e(label)}</span><a href="${e(asset(item.src))}" download>${e(ui.original)} ↓</a></figcaption>${item.poster ? `<button class="gif-toggle" data-animated="${e(asset(item.src))}" data-still="${e(asset(item.poster))}" data-play="${e(ui.play_gif)}" data-pause="${e(ui.pause_gif)}" aria-pressed="false">${e(ui.play_gif)}</button>` : ''}</figure>`;
      };
      const gallery = (items, category) => items.length ? `<div class="assets-grid">${items.map((item, i) => assetCard(item, i, category)).join('')}</div>` : '';
      const logo = img(site.logo, site.name, 'brand-logo', false);
      const socials = key => (site.socials?.[key] || []).filter(s => href(s.url)).map(s => `<a href="${href(s.url)}" target="_blank" rel="noopener">${icon(s.icon)}<span>${e(s.name)}</span><span aria-hidden="true">↗</span></a>`).join('');
      const official = socials('studio'), developer = socials('developer');
      const footer = `<footer class="site-footer"><div class="wrap footer-top"><div class="footer-identity"><a class="footer-brand" href="${link('')}">${logo}</a><p class="footer-slogan">${e(home.data.slogan)}</p><p class="footer-note">${e(plain(home.sections.Introduction))}</p></div><div class="footer-contact"><h2>${e(ui.contact)}</h2><a class="footer-email" href="mailto:${e(site.email)}">${e(site.email)} <span aria-hidden="true">↗</span></a></div><div class="footer-socials">${official ? `<section><h2>${e(ui.studio)}</h2><div class="social-links">${official}</div></section>` : ''}${developer ? `<section><h2>${e(ui.developer)}</h2><div class="social-links">${developer}</div></section>` : ''}</div></div><div class="wrap footer-base"><span>© ${e(site.copyright_year)} ${e(site.name)}. ${e(ui.rights)}</span><a href="#top">${e(ui.back_top)} <span aria-hidden="true">↑</span></a></div></footer>`;
      const body = await render({ asset, link, img, button, platforms, copy, featureCards, trailer, gallery, assetCard });
      const ogImage = new URL(og || site.og_image, origin).href;
      const html = `<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}">
${['en','ko','x-default'].map(l => `<link rel="alternate" hreflang="${l}" href="${e(new URL(route + (l === 'ko' ? 'ko.html' : ''), origin).href)}">`).join('\n')}
<meta property="og:type" content="website"><meta property="og:site_name" content="${e(site.name)}"><meta property="og:locale" content="${lang === 'ko' ? 'ko_KR' : 'en_US'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${e(ogImage)}"><meta property="og:image:alt" content="${e(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${e(ogImage)}">
<link rel="icon" type="image/png" href="${e(asset(site.favicon))}"><link rel="stylesheet" href="${prefix}style.css"><script defer src="${prefix}site.js"></script>
</head><body id="top"><a class="skip-link" href="#main">${e(ui.skip)}</a>
<header><div class="header-inner"><a href="${link('')}" class="wordmark" aria-label="${e(site.name + ' — ' + ui.home)}">${img(site.logo, site.name, 'brand-logo', true)}</a><nav id="site-nav" aria-label="${e(ui.navigation)}"><a href="${link('')}"${route === '' ? ' class="active" aria-current="page"' : ''}>${e(ui.home)}</a><a href="${link('games/')}"${route.startsWith('games/') ? ' class="active"' : ''}>${e(ui.games)}</a></nav><button class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="${e(ui.menu)}"><span></span><span></span></button><div class="lang" aria-label="${e(ui.language)}">${['en','ko'].map(l => `<a href="${languageLink(l)}" lang="${l}" hreflang="${l}"${l === lang ? ' class="current" aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('<span aria-hidden="true">/</span>')}</div></div></header>
<main id="main" tabindex="-1">${body}</main>${footer.replace('<footer ', '<footer id="footer" ')}<p class="sr-only" role="status" aria-live="polite" id="site-status"></p></body></html>\n`;
      const output = path.join(root, route, lang === 'ko' ? 'ko.html' : 'index.html');
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, html);
      generated.push(path.relative(root, output).replaceAll('\\', '/'));
    }
    const slogan = () => home.data.slogan.split(',').map((v, i) => i ? `<br><em>${e(v.trim())}.</em>` : e(v + ',')).join('');
    await page('', home.data.title, home.data.description, site.og_image, async ({ asset, link, img }) => {
      const featured = games.find(g => g.slug === home.data.featured_slug) || games[0];
      const videoExists = home.data.video && await exists(localPath(home.data.video));
      return `<section class="home-hero">${home.data.poster ? img(home.data.poster, '', 'home-poster', true) : ''}${videoExists ? `<video class="home-video" muted loop playsinline preload="none" poster="${e(asset(home.data.poster))}" data-src="${e(asset(home.data.video))}" aria-hidden="true"></video><button class="motion-control" data-pause="${e(ui.pause_video)}" data-play="${e(ui.resume_video)}" hidden>${e(ui.pause_video)}</button>` : ''}<div class="home-overlay"></div><div class="home-copy wrap"><span class="eyebrow">${e(home.data.eyebrow)}</span><h1>${slogan()}</h1>${markdown(home.sections.Introduction)}<a href="${link('games/')}" class="text-link">${e(ui.explore)} ↗</a></div></section>${featured ? `<section class="home-feature wrap"><div class="section-label"><span>01 / ${e(home.data.featured_label)}</span></div><div class="feature-row"><div><span class="eyebrow">${e(home.data.featured_eyebrow)}</span><h2>${e(featured.title)}</h2>${markdown(featured.sections.Tagline || featured.sections['One-line Description'])}<a class="text-link" href="${link(`games/${featured.slug}/`)}">${e(ui.discover)} ↗</a></div>${featured.cover ? `<a class="feature-image" href="${link(`games/${featured.slug}/`)}">${img(featured.cover, featured.title)}</a>` : ''}</div></section>` : ''}`;
    });
    await page('games/', `${listing.data.title} | ${site.name}`, listing.data.description, site.og_image, ({ asset, link, img, button, platforms, trailer }) => `<section class="page-intro wrap"><span class="eyebrow">${e(site.name)} / ${String(games.length).padStart(2,'0')}</span><h1>${e(listing.data.title)}<span class="accent-dot">.</span></h1>${markdown(listing.sections.Introduction)}</section>${games.map((g, i) => `<section class="game-band"><div class="game-band-bg"${g.background ? ` style="--game-background:url('${e(asset(g.background))}')"` : ''}></div><div class="game-band-inner wrap"><div class="game-band-copy"><span class="eyebrow">${String(i + 1).padStart(2,'0')}${g.release_datetime ? ` / ${e(releaseDate(g.release_datetime, g.release_display === 'datetime' ? 'date' : g.release_display, lang))}` : ''}</span><h2>${e(g.title)}</h2>${markdown(g.sections['One-line Description'])}${markdown(g.sections['Short Description'])}<div class="actions">${button(link(`games/${g.slug}/`), ui.view_game)}${button(link(`press/${g.slug}/`), ui.press_kit + ' ↗', true)}${platforms(g)}</div></div>${g.trailer ? trailer(g) : g.cover ? `<a href="${link(`games/${g.slug}/`)}" class="game-card">${img(g.cover, g.title)}</a>` : ''}</div></section>`).join('')}`);
    for (const g of games) {
      const detailTrailer = { ...g, trailer: g.press.trailer || g.trailer, cover: g.press.trailer_thumbnail || g.hero || g.cover };
      await page(`games/${g.slug}/`, `${g.title} | ${site.name}`, plain(g.sections['One-line Description']), g.og_image, ({ asset, link, img, button, platforms, trailer, featureCards }) => `<section class="detail-hero"><div class="detail-bg"${g.background ? ` style="--game-background:url('${e(asset(g.background))}')"` : ''}></div><div class="wrap detail-inner"><div><span class="eyebrow">${e(site.name)} / ${e(ui.games)}</span><h1>${e(g.title)}</h1>${markdown(g.sections['One-line Description'])}<div class="actions">${platforms(g)}${button(link(`press/${g.slug}/`), ui.press_kit, true)}</div></div>${g.cover ? `<div class="detail-poster">${img(g.cover, g.title, '', true)}</div>` : ''}</div></section><section class="wrap detail-story"><div class="section-label"><span>${e(ui.about_game)}</span></div>${g.sections.Tagline ? `<h2>${e(plain(g.sections.Tagline))}</h2>` : ''}<div class="detail-description">${markdown(g.sections['Short Description'])}</div>${featureCards(g)}${detailTrailer.trailer ? `<section class="detail-trailer" id="trailer" aria-label="${e(ui.trailer)}">${trailer(detailTrailer)}</section>` : ''}${g.media.screenshots.length ? `<div class="screenshot-grid">${g.media.screenshots.map((m, i) => img(m.src, m.alt || `${g.title} — ${ui.screenshot} ${i + 1}`)).join('')}</div>` : ''}</section>`);
      await page(`press/${g.slug}/`, `${g.title} | Press Kit | ${site.name}`, g.press.description || plain(g.sections['Short Description']), g.og_image, async ({ asset, img, button, platforms, copy, featureCards, trailer, gallery }) => {
        const zip = g.press_zip && await exists(localPath(g.press_zip)) ? button(asset(g.press_zip), ui.download_kit + ' ↓', true, 'download') : '';
        const fact = (label, value, raw = false) => value ? `<div class="fact"><dt>${e(label)}</dt><dd>${raw ? value : e(value).replaceAll('\n', '<br>')}</dd></div>` : '';
        const platformFacts = (g.platforms || []).filter(p => href(p.url)).map(p => `<a href="${href(p.url)}" target="_blank" rel="noopener">${e(p.name)} ↗</a>`).join('<br>');
        const price = g.price?.[lang === 'ko' ? 'krw' : 'usd'] || g.price?.usd || g.price?.krw;
        const arts = [...g.media.keyart, ...g.media.logos];
        const pressTrailer = detailTrailer;
        const trailerDownload = g.press.trailer_download && await exists(localPath(g.press.trailer_download)) ? g.press.trailer_download : '';
        const hasTrailer = pressTrailer.trailer || trailerDownload;
        const hasMedia = hasTrailer || Object.values(g.media).some(items => items.length);
        return `${g.hero ? `<section class="press-hero"><div class="press-hero-image"><button class="zoom" data-src="${e(asset(g.hero))}" data-original="${e(asset(g.hero))}" data-alt="${e(g.title + ' — ' + ui.hero)}" aria-label="${e(ui.enlarge)}">${img(g.hero, g.title + ' — ' + ui.hero, '', true)}</button></div><div class="wrap hero-download"><a href="${e(asset(g.hero))}" download>${e(ui.original)} ↓</a></div></section>` : ''}<div class="wrap press-head"><div><span class="eyebrow">${e(site.name)} / ${e(ui.press_kit)}</span><h1>${e(g.title)}</h1>${g.sections['One-line Description'] ? `<div id="one-line" class="one-line">${markdown(g.sections['One-line Description'])}</div>${copy('one-line')}` : ''}</div><div class="actions">${platforms(g)}${hasTrailer ? button('#trailer', ui.watch_trailer, true) : ''}${zip}</div></div><div class="wrap press-columns"><div class="press-main">${g.sections['Short Description'] ? `<section class="press-section"><div class="section-label"><span>01 / ${e(ui.description)}</span></div><div class="copy-head"><h2>${e(ui.description)}</h2>${copy('short')}</div><div id="short" class="lead">${markdown(g.sections['Short Description'])}</div></section>` : ''}${g.featureRows.length ? `<section class="press-section"><div class="section-label"><span>02 / ${e(ui.features)}</span>${copy('feature-list', ui.copy_features)}</div><h2>${e(ui.features)}</h2>${featureCards(g)}</section>` : ''}</div><aside class="facts"><div class="facts-title"><span>${e(ui.fact_sheet)}</span><span aria-hidden="true">↘</span></div><dl>${fact(ui.title,g.title)}${fact(ui.developer_label,g.developer)}${fact(ui.release,releaseDate(g.release_datetime,g.release_display,lang))}${fact(ui.platforms,platformFacts,true)}${fact(ui.genres,g.genres?.join(', '))}${fact(ui.playtime,g.playtime)}${fact(ui.price,price)}${fact(ui.languages,g.languages?.join(', '))}${fact(ui.ai_usage,g.ai_usage)}</dl></aside></div>${hasMedia ? `<section class="wrap asset-section"><div class="section-label"><span>03 / ${e(ui.media)}</span></div>${hasTrailer ? `<section id="trailer"><h2>${e(ui.trailer)}</h2>${trailer(pressTrailer)}${trailerDownload ? `<div class="download-all">${button(asset(trailerDownload) + '?download=1', ui.download_trailer + ' (MP4) ↓', true, `download="${e(path.basename(trailerDownload))}" data-file-download`)}</div>` : ''}</section>` : ''}${g.media.gifs.length ? `<h2>${e(ui.gifs)}</h2>${gallery(g.media.gifs,'gifs')}` : ''}${g.media.screenshots.length ? `<h2>${e(ui.screenshots)}</h2>${gallery(g.media.screenshots,'screenshots')}` : ''}${arts.length ? `<h2>${e(ui.artwork)}</h2>${gallery(arts,'logos')}` : ''}${zip ? `<div class="download-all">${zip}</div>` : ''}</section>` : ''}${['Awards','Articles','Credits'].filter(key => plain(g.sections[key])).map(key => `<section class="wrap press-section external-info"><h2>${e(ui[key.toLowerCase()])}</h2>${markdown(g.sections[key])}</section>`).join('')}<section class="wrap studio-assets" id="studio-logos"><div class="section-label"><span>${e(ui.studio_logos)}</span></div><h2>${e(ui.studio_logos)}</h2>${gallery([{src:site.logo,alt:site.name+' — '+ui.studio_logo_landscape},{src:site.favicon,alt:site.name+' — '+ui.studio_logo_square}], 'logos')}<div class="press-contact"><h3>${e(ui.press_contact)}</h3><p>${e(site.name)} / <a href="mailto:${e(site.email)}">${e(site.email)} ↗</a></p></div></section><div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="${e(ui.preview)}"><button class="lightbox-close" aria-label="${e(ui.close)}">×</button><img alt=""><a class="button" download>${e(ui.original)} ↓</a></div>`;
      });
    }
  }
  console.log(`Built ${generated.length} pages for ${origin.href}`);
  return generated;
}
function gameTitlePlaceholder(category, ui) { return category === 'gifs' ? ui.gifs : ui.artwork; }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await build();
