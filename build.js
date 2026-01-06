/**
 * Build script for WebTerm
 * Bundles client and server into a single executable JavaScript file
 * Embeds native pty.node binary for "single-file" deployment
 * Bundles required CSS (xterm.css) into the final bundle
 */

import * as fs from 'fs';
import * as path from 'path';

const outDir = 'dist';

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

console.log('🔨 Building WebTerm...\n');

// Find native pty.node
const ptyNodePath = path.resolve('node_modules/node-pty/build/Release/pty.node');
if (!fs.existsSync(ptyNodePath)) {
    console.error('❌ Could not find pty.node. Ensure node-pty is installed and compiled.');
    process.exit(1);
}

const ptyNodeBase64 = fs.readFileSync(ptyNodePath).toString('base64');
console.log(`   📦 Embedded pty.node (${(ptyNodeBase64.length / 1024 / 1024).toFixed(2)} MB)`);

// Find xterm.css (try new and old locations)
let xtermCssPath = path.resolve('node_modules/@xterm/xterm/css/xterm.css');
if (!fs.existsSync(xtermCssPath)) {
    xtermCssPath = path.resolve('node_modules/xterm/css/xterm.css');
}

if (!fs.existsSync(xtermCssPath)) {
    console.error('❌ Could not find xterm.css.');
    process.exit(1);
}

const xtermCss = fs.readFileSync(xtermCssPath, 'utf-8');
console.log(`   🎨 Embedded xterm.css`);

// Step 1: Bundle client TypeScript
console.log('\n1️⃣  Bundling client code...');
const clientBuild = await Bun.build({
    entrypoints: ['src/client/index.ts'],
    minify: true,
    target: 'browser',
    outdir: outDir
});

if (!clientBuild.success) {
    console.error('❌ Client build failed');
    for (const log of clientBuild.logs) {
        console.error(log);
    }
    process.exit(1);
}

const clientJsPath = clientBuild.outputs[0].path;
const clientJs = fs.readFileSync(clientJsPath, 'utf-8');
fs.unlinkSync(clientJsPath);

console.log('   ✅ Client bundle created\n');

// Step 3: Bundle server
console.log('3️⃣  Bundling server...');

const serverBuild = await Bun.build({
    entrypoints: ['src/server/index.ts'],
    minify: true,
    target: 'node',
    outdir: outDir,
    define: {
        '__CLIENT_SCRIPT__': JSON.stringify(clientJs),
        '__CLIENT_CSS__': JSON.stringify(xtermCss),
        '__PTY_BINARY__': JSON.stringify(ptyNodeBase64)
    }
});

if (!serverBuild.success) {
    console.error('❌ Server build failed');
    for (const log of serverBuild.logs) {
        console.error(log);
    }
    process.exit(1);
}

// Step 4: Make executable
const serverPath = serverBuild.outputs[0].path;
const finalServerPath = path.join(outDir, 'server.js');
const content = fs.readFileSync(serverPath, 'utf-8');

// Note: Node.js shebang
fs.writeFileSync(finalServerPath, '#!/usr/bin/env node\n' + content);

if (serverPath !== path.resolve(finalServerPath)) {
    fs.unlinkSync(serverPath);
}
fs.chmodSync(finalServerPath, '755');

console.log('✨ Build complete!\n');
console.log('📦 Output: dist/server.js');
console.log('🚀 Run with: bun run start\n');
