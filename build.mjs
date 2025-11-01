import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.argv.includes('--dev');
const distDir = join(__dirname, 'dist');
const bundlePath = join(distDir, 'futaba_scroller.js');
const bookmarkletPath = join(distDir, 'futaba_scroller.bookmarklet.txt');

async function ensureDistDir() {
    await mkdir(distDir, { recursive: true });
}

async function bundle() {
    await build({
        entryPoints: [join('src', 'index.ts')],
        bundle: true,
        platform: 'browser',
        format: 'iife',
        target: 'es2020',
        treeShaking: true,
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        legalComments: 'none',
        charset: 'utf8',
        outfile: bundlePath,
    });
}

async function createBookmarklet() {
    let bundledCode = await readFile(bundlePath, 'utf8');

    // Remove inline sourcemap comments that break bookmarklet execution
    bundledCode = bundledCode.replace(/\/\/#[ ]?sourceMappingURL=.*$/gm, '');

    if (isDev) {
        // Collapse whitespace so the bookmarklet remains a single line
        bundledCode = bundledCode.replace(/\s+/g, ' ').trim();
    }

    const bookmarklet = `javascript:${encodeURIComponent(bundledCode)}`;
    await writeFile(bookmarkletPath, bookmarklet, 'utf8');
}

async function main() {
    await ensureDistDir();
    await bundle();
    await createBookmarklet();
    console.log('ビルド完了:');
    console.log(` - ${bundlePath}`);
    console.log(` - ${bookmarkletPath}`);
}

main().catch((error) => {
    console.error('ビルドに失敗しました:', error);
    process.exitCode = 1;
});
