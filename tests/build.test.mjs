import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { build } from '../scripts/build.mjs';
import { fallback, releaseDate, translatedFeatures } from '../scripts/content.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('empty translation fields use English, preserving other translated fields', () => {
  assert.deepEqual(fallback({ a: 'English', b: { x: 'fallback', y: 4 }, c: ['en'] }, { a: ' ', b: { x: '한국어' }, c: [] }), { a: 'English', b: { x: '한국어', y: 4 }, c: ['en'] });
  assert.deepEqual(translatedFeatures('## First\n\nBody\n\n## Second\n\nMore', '## 첫째\n\n'), [{ title: '첫째', body: 'Body' }, { title: 'Second', body: 'More' }]);
});
test('release formats use KST calendar date and handle Pacific daylight saving', () => {
  assert.equal(releaseDate('2026-10-20T02:00:00+09:00'), 'October 20, 2026');
  assert.equal(releaseDate('2026-10-20T02:00:00+09:00', 'month'), 'October 2026');
  assert.equal(releaseDate('2026-10-20T02:00:00+09:00', 'year'), '2026');
  const fall = releaseDate('2026-10-20T02:00:00+09:00', 'datetime');
  assert.match(fall, /Oct 19, 2026.*10:00.*PDT/);
  assert.match(fall, /Oct 19, 2026.*17:00.*UTC/);
  assert.match(releaseDate('2026-12-20T02:00:00+09:00', 'datetime'), /Dec 19, 2026.*09:00.*PST/);
  assert.throws(() => releaseDate('2026-10-20'));
});
test('new Markdown-only games, missing translations, optional fields, assets, ZIP and subpath metadata', async () => {
  const cache = path.join(project, '.cache');
  await fs.mkdir(cache, { recursive: true });
  const root = await fs.mkdtemp(path.join(cache, 'build-test-'));
  try {
    await fs.cp(path.join(project, 'content'), path.join(root, 'content'), { recursive: true });
    await fs.cp(path.join(project, 'assets'), path.join(root, 'assets'), { recursive: true });
    await fs.copyFile(path.join(project, 'style.css'), path.join(root, 'style.css'));
    await fs.copyFile(path.join(project, 'site.js'), path.join(root, 'site.js'));
    await fs.writeFile(path.join(root, 'content/en/games/test-game.md'), `---\nslug: test-game\ntitle: Test Game\ndeveloper: ovov games\nhero: assets/test-game/hero.png\n---\n# One-line Description\n\nAn English fallback line.\n\n# Short Description\n\nTest game description.\n`);
    const generated = await build({ root });
    assert.equal(generated.length, 12);
    const read = route => fs.readFile(path.join(root, route), 'utf8');
    const testPage = await read('press/test-game/ko.html');
    assert.match(testPage, /An English fallback line/);
    for (const absent of ['<dt>가격</dt>', '<dt>출시일</dt>', '<dt>생성형 AI 사용처</dt>', '<h2>스크린샷</h2>', '<h2>트레일러</h2>', '<h2>주요 특징</h2>', 'press.zip']) assert.ok(!testPage.includes(absent), absent);
    assert.match(testPage, /https:\/\/ovovgames.github.io\/official\/press\/test-game\/ko.html/);
    assert.match(await read('games/ko.html'), /test-game\/ko.html/);
    const press = await read('press/just-pancake-simulator/ko.html');
    assert.match(press, /생성형 AI 사용처/);
    assert.match(press, /₩2,200/);
    assert.match(press, /screenshot_05.png/);
    assert.match(press, /data-copy="one-line"/);
    assert.match(press, /https:\/\/bsky.app\/profile\/ovovgames.bsky.social/);
    assert.equal((press.match(/href="[^\"]*press.zip"/g) || []).length, 2);
    const zip = unzipSync(new Uint8Array(await fs.readFile(path.join(root, 'assets/just-pancake-simulator/press.zip'))));
    for (const [file, bytes] of Object.entries(zip)) assert.deepEqual(Buffer.from(bytes), await fs.readFile(path.join(root, 'assets/just-pancake-simulator', file)));
    for (const file of generated) {
      const html = await read(file);
      assert.match(html, /rel="canonical"/);
      assert.match(html, /property="og:image"/);
      for (const match of html.matchAll(/(?:src|href|data-src|data-original)="([^\"]+)"/g)) {
        if (/^(https?:|mailto:|#)/.test(match[1])) continue;
        const target = path.resolve(path.dirname(path.join(root, file)), match[1].split(/[?#]/)[0]);
        assert.ok((await fs.stat(target)).isFile(), `${file}: ${match[1]}`);
      }
    }
    // Adding optional data must generate the sections without changing a template.
    await fs.appendFile(path.join(root, 'content/en/press/just-pancake-simulator.md'), '\n# Awards\n\nA test award.\n\n# Credits\n\nTest credit.\n');
    await fs.appendFile(path.join(root, 'content/ko/games/test-game.md'), '---\ntitle: ""\n---\n# One-line Description\n\n한국어 한 줄.\n');
    const fixtureGame = path.join(root, 'content/en/games/test-game.md');
    await fs.writeFile(fixtureGame, (await fs.readFile(fixtureGame, 'utf8')).replace('title: Test Game', 'title: Test Game\ntrailer: https://www.youtube.com/watch?v=abcdefghijk'));
    await fs.mkdir(path.join(root, 'assets/test-game/gifs'), { recursive: true });
    await fs.writeFile(path.join(root, 'assets/test-game/gifs/gameplay_00.gif'), Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    await fs.writeFile(path.join(root, 'assets/common/home_loop.webm'), Buffer.alloc(0));
    await build({ root });
    const translated = await read('press/test-game/ko.html');
    assert.match(translated, /한국어 한 줄/);
    assert.match(translated, /Test game description/);
    assert.match(await read('press/just-pancake-simulator/ko.html'), /A test award/);
    assert.match(translated, /data-video="abcdefghijk"/);
    assert.ok(!translated.includes('<iframe'), 'Videos must wait for a play action');
    assert.match(translated, /gif-toggle/);
    assert.match(translated, /thumbnails\/gameplay_00-still.png/);
    assert.match(await read('ko.html'), /data-src=".\/assets\/common\/home_loop.webm"/);
    assert.ok((await fs.stat(path.join(root, 'assets/test-game/thumbnails/gameplay_00-still.png'))).size > 0);
  } finally {
    const resolved = path.resolve(root);
    assert.ok(resolved.startsWith(path.resolve(cache) + path.sep) && path.basename(resolved).startsWith('build-test-'));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
