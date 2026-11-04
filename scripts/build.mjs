// Production build: bundles + minifies the ES modules, concatenates the CSS in cascade order and rewrites index.html.
// Output goes to dist/. The data/ folder is copied as is if it exists.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const OUT = 'dist';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/assets', { recursive: true });

// JavaScript
await build({ entryPoints: ['js/main.js'], bundle: true, minify: true, format: 'esm', target: 'es2022', outfile: OUT + '/app.js' });

// CSS: same order as the <link> tags in index.html
let html = fs.readFileSync('index.html', 'utf8');
const sheets = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map((m) => m[1]);
const css = sheets.map((f) => fs.readFileSync(f, 'utf8').replaceAll('url(../', 'url(')).join('\n');
const min = await build({ stdin: { contents: css, loader: 'css' }, minify: true, write: false, outfile: 'app.css' });
fs.writeFileSync(OUT + '/app.css', min.outputFiles[0].text);

// HTML
html = html
  .replace(/(\s*<link rel="stylesheet" href="css\/[^"]+">)+/, '\n  <link rel="stylesheet" href="app.css">')
  .replace('<link rel="modulepreload" href="js/main.js">', '<link rel="modulepreload" href="app.js">')
  .replace('<script type="module" src="js/main.js"></script>', '<script type="module" src="app.js"></script>');
fs.writeFileSync(OUT + '/index.html', html);
fs.copyFileSync('assets/favicon.jpg', OUT + '/assets/favicon.jpg');
if (fs.existsSync('data')) fs.cpSync('data', OUT + '/data', { recursive: true });

const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + ' kB';
console.log(`dist/app.js ${kb('app.js')}, dist/app.css ${kb('app.css')}`);
