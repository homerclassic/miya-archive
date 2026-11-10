// Standalone build: produces a self-contained folder that runs by
// double-clicking, with no server, no terminal and no Node.js needed at
// run time.
//
// How it works:
// - The ES modules are bundled + minified (esbuild), so no module imports
//   are left for the browser to block over file://.
// - The CSS is concatenated in cascade order, minified and inlined.
// - data/tweets.md is embedded as a data: URL, so the app's fetch(DATA_URL)
//   call succeeds over file:// with no source changes.
// - Everything else the page references (photos, avatar, header, favicon)
//   is copied into standalone/ next to the HTML, because the HTML lives
//   one level deeper than the source index.html and root data/ and
//   assets/ paths would otherwise resolve inside standalone/ and 404.
//   tweets.md is not copied: it is already embedded, so it would be dead
//   weight. Zip the contents of standalone/ for the release.
// Output: standalone/ (miya-archive-standalone.html + data/ + assets/)
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const OUT_DIR = 'standalone';
const OUT_FILE = 'miya-archive-standalone.html';

// 0. Start clean so stale media from an older build never lingers.
fs.rmSync(OUT_DIR, { recursive: true, force: true });

// 1. Bundle the app (same entry + settings as the production build).
const js = await build({
  entryPoints: ['js/main.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  write: false,
});
let bundle = js.outputFiles[0].text;

// 2. Embed the archive as a data: URL. The bundle contains exactly one quoted
//    occurrence of the data path (the DATA_URL constant); the error message
//    in app.js mentions it unquoted and is left alone.
const tweets = fs.readFileSync('data/tweets.md');
const dataUrl = 'data:text/markdown;base64,' + tweets.toString('base64');
const quoted = bundle.match(/(['"])data\/tweets\.md\1/g) || [];
if (quoted.length !== 1) {
  throw new Error(`Expected exactly 1 quoted 'data/tweets.md' in bundle, found ${quoted.length}`);
}
bundle = bundle.replace(/(['"])data\/tweets\.md\1/, JSON.stringify(dataUrl));

// 2b. Embed the avatar as a data: URL too. The screenshot feature draws the
//     post to a canvas, and a file:// image taints it, so toBlob throws and
//     every screenshot fails in the standalone. A data: URL image does not
//     taint. 32 KB, negligible next to the embedded archive. (Tweet media
//     stays as files; the screenshot drops it over file:// instead.)
const av = fs.readFileSync('data/miya.png');
const avUrl = 'data:image/png;base64,' + av.toString('base64');
const avQuoted = bundle.match(/(['"])data\/miya\.png\1/g) || [];
if (avQuoted.length === 0) {
  throw new Error(`Expected at least 1 quoted 'data/miya.png' in bundle, found 0`);
}
bundle = bundle.replace(/(['"])data\/miya\.png\1/g, JSON.stringify(avUrl));

// 3. Inline the bundle. A literal </script inside it would close the tag
//    early, so it is escaped with a backslash. The HTML parser only
//    terminates on the exact </script sequence, and a backslash-slash inside
//    a JS string literal evaluates to a plain slash, so runtime strings are
//    unchanged. (The replacement string needs a literal backslash in the
//    output, which is why it is written with a double backslash in source.)
if (bundle.includes('</script')) bundle = bundle.replaceAll('</script', '<\\\\/script');

// 4. CSS: same order as the <link> tags in index.html, same url() rewrite
//    as the production build (css/ -> root), minified, inlined.
let html = fs.readFileSync('index.html', 'utf8');
const sheets = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map((m) => m[1]);
const css = sheets.map((f) => fs.readFileSync(f, 'utf8').replaceAll('url(../', 'url(')).join('\n');
const cssMin = await build({ stdin: { contents: css, loader: 'css' }, minify: true, write: false, outfile: 'app.css' });
const cssText = cssMin.outputFiles[0].text;
if (cssText.includes('</style')) throw new Error('CSS contains </style>');

// 5. Rewrite the HTML: drop the data preload + modulepreload, inline the CSS,
//    inline the bundle. Replacements use functions, not strings: the bundle
//    and CSS can contain $& and similar sequences, which String.replace
//    would otherwise interpret as replacement patterns and substitute.
html = html
  .replace(/\s*<link rel="preload" href="data\/tweets\.md"[^>]*>/, '')
  .replace(/\s*<link rel="modulepreload" href="js\/main\.js">/, '')
  .replace(/(\s*<link rel="stylesheet" href="css\/[^"]+">)+/, () => `\n  <style>\n${cssText}\n  </style>`)
  .replace('<script type="module" src="js/main.js"></script>', () => `<script type="module">\n${bundle}\n</script>`);

// 6. Mark the output as generated, directly after the doctype (never before
//    it, where a comment could trip quirks mode in old browsers), so nobody
//    mistakes it for source to edit.
html = html.replace('<!doctype html>', () => `<!doctype html>\n<!-- Generated file — do not edit by hand. Rebuild with: npm run standalone -->`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, OUT_FILE);
fs.writeFileSync(outPath, html);
console.log(`${outPath} ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);

// 7. Copy the referenced media next to the HTML (see header). The release
//    zip is the contents of standalone/.
const copyDir = (src, dest, skip) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (entry === skip) continue;
    fs.cpSync(path.join(src, entry), path.join(dest, entry), { recursive: true });
  }
};
copyDir('data', path.join(OUT_DIR, 'data'), 'tweets.md');
copyDir('assets', path.join(OUT_DIR, 'assets'));
