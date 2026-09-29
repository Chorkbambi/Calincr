#!/usr/bin/env node
/**
 * Generates src/ui/content/licenses.generated.ts: the open-source notices shown in
 * Settings → "Open-source licenses" (MIT, BSD and Apache-2.0 require shipping them).
 *
 * Packages listed = every npm package whose code ends up in the app's JavaScript bundle
 * (read from the source maps of `expo export`) + every direct runtime dependency (their
 * native code ships in the binary) + the bundled files of assets/ (MediaPipe, model, font).
 *
 * Run after adding, removing or updating a dependency:
 *   node scripts/generate-licenses.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'src/ui/content/licenses.generated.ts');

// 1. Packages inside the JS bundles (both platforms).
const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calincr-export-'));
execSync(`npx expo export --platform android --platform ios --source-maps --output-dir "${exportDir}"`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
});
const packageDirs = new Set();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.map')) {
      for (const source of JSON.parse(fs.readFileSync(full, 'utf8')).sources ?? []) {
        const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(source.replace(/\\/g, '/'));
        // Metro writes paths relative to the project root, with a leading slash ("/node_modules/…").
        if (match) packageDirs.add(path.join(root, match[1].replace(/^.*?(?=node_modules\/)/, '')));
      }
    }
  }
};
walk(exportDir);
fs.rmSync(exportDir, { recursive: true, force: true });

// 2. Direct runtime dependencies (native code).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const name of Object.keys(pkg.dependencies ?? {})) packageDirs.add(path.join(root, 'node_modules', name));

// 3. Read name, version, license and license/notice files.
const LICENSE_FILE = /^(licen[cs]e|copying)([._-][\w.-]*)?$/i;
const NOTICE_FILE = /^notice(\.(md|txt))?$/i;
const readFiles = (dir, pattern) =>
  fs
    .readdirSync(dir)
    .filter((f) => pattern.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8').trim());

const MIT = (holder) =>
  `MIT License\n\nCopyright (c) ${holder}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

/** Copyright holder of a package that ships no license file (from its package.json). */
function holder(p) {
  const author = typeof p.author === 'string' ? p.author.replace(/\s*[<(].*$/, '') : p.author?.name;
  if (author) return author;
  if (p.name.startsWith('@react-native/')) return 'Meta Platforms, Inc. and affiliates.';
  if (p.name.startsWith('@expo/') || p.name.startsWith('expo')) return '650 Industries, Inc. (aka Expo)';
  return `the ${p.name} authors`;
}

const entries = new Map();
for (const dir of packageDirs) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) continue;
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!p.name || p.name === pkg.name) continue;
  const license = typeof p.license === 'string' ? p.license : (p.license?.type ?? p.licenses?.map((l) => l.type).join(' OR ') ?? 'UNKNOWN');
  const texts = [...readFiles(dir, LICENSE_FILE), ...readFiles(dir, NOTICE_FILE)];
  if (texts.length === 0 && license === 'MIT') texts.push(MIT(holder(p)));
  const key = `${p.name}@${p.version}`;
  if (!entries.has(key)) entries.set(key, { name: p.name, version: p.version, license, text: texts.join('\n\n') });
}

// 4. Bundled files that are not npm packages.
const mediapipe = fs.readFileSync(path.join(root, 'assets/mediapipe/NOTICE.txt'), 'utf8').trim();
entries.set('mediapipe', {
  name: 'MediaPipe tasks-vision 1.0.1 and Pose Landmarker model (bundled in assets/mediapipe)',
  version: '1.0.1',
  license: 'Apache-2.0',
  text: `${mediapipe}\n\nCopyright Google LLC. Licensed under the Apache License, Version 2.0 (the "License"); you may not use these files except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`,
});

// Identical texts are stored once.
const texts = [];
const textIndex = new Map();
const list = [...entries.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((e) => {
    const text = e.text || `${e.license} license (no license file in the package).`;
    if (!textIndex.has(text)) {
      textIndex.set(text, texts.length);
      texts.push(text);
    }
    return { name: e.name, version: e.version, license: e.license, text: textIndex.get(text) };
  });

const missing = list.filter((e) => e.license === 'UNKNOWN').map((e) => e.name);
if (missing.length > 0) console.warn(`No license field: ${missing.join(', ')}`);

fs.writeFileSync(
  out,
  `// Generated by scripts/generate-licenses.cjs — do not edit by hand.\n` +
    `/* eslint-disable */\n` +
    `export const LICENSE_TEXTS: readonly string[] = ${JSON.stringify(texts)};\n\n` +
    `export const OPEN_SOURCE_PACKAGES: readonly { name: string; version: string; license: string; text: number }[] = ${JSON.stringify(list, null, 0)};\n`,
);
console.log(`${list.length} packages, ${texts.length} distinct license texts → ${path.relative(root, out)}`);
