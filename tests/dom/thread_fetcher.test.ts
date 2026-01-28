import { describe, expect, jest, test } from '@jest/globals';

import {
    convertRelativeUrls,
    detectLogFormat,
    extractResponses,
    fetchThreadHtml,
} from '../../src/dom/thread_fetcher';
import { TextDecoder as UtilTextDecoder } from 'util';

if (typeof global.TextDecoder === 'undefined') {
    // jsdom環境でTextDecoderが未定義の場合にNodeの実装を補う
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.TextDecoder = UtilTextDecoder as typeof TextDecoder;
}

function parseHtml(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
}

const FUTABA_HTML = `
<div class="thre">
  <table><tr><td><span class="cno">No.1</span><span class="cnw">24/11/02(土)12:00:00</span></td></tr></table>
  <table><tr><td><span class="cno">No.2</span><span class="cnw">24/11/02(土)12:01:00</span></td></tr></table>
</div>
`;

const FUTACLO_HTML = `
<div class="thre">
  <div style=""><table><tr><td><span class="cno">No.3</span><span class="cnw">24/11/02(土)12:02:00</span></td></tr></table></div>
</div>
`;

const TSUMANNE_HTML = `
<div class="thre">
  <table><tr><td><span class="cno">No.10</span><span class="cnw">24/11/02(土)12:03:00 ID:abc</span></td></tr></table>
  <table class="deleted" border="0"><tr><td>deleted</td></tr></table>
  <table><tr><td><span class="cno">No.11</span><span class="cnw">24/11/02(土)12:04:00</span></td></tr></table>
</div>
`;

const FUTAFUTA_HTML = `
<title>ログ | Futafuta</title>
<div class="thre">
  テキストノード
  <span class="cnw">24/11/02(土)12:05:00</span>
  <span class="cno">No.20</span>
  <blockquote>スレ主本文</blockquote>
  <table border="0"><tr><td><span class="cnw">24/11/02(土)12:06:00</span><span class="cno">No.21</span></td></tr></table>
</div>
`;

describe('detectLogFormat', () => {
    test('タイトルでFutafutaを判定する', () => {
        const doc = parseHtml(FUTAFUTA_HTML);

        expect(detectLogFormat(doc)).toBe('futafuta');
    });

    test('tsumanne.netのスクリプトを検出する', () => {
        const doc = parseHtml('<script src="https://tsumanne.net/foo.js"></script>');

        expect(detectLogFormat(doc)).toBe('tsumanne');
    });

    test('ID付きタイムスタンプでもtsumanneを判定する', () => {
        const doc = parseHtml(
            '<div class="thre"><table><tr><td><span class="cnw">24/11/02(土)12:00:00 ID:abc</span></td></tr></table></div>',
        );

        expect(detectLogFormat(doc)).toBe('tsumanne');
    });

    test('ふたクロのラッパーを検出する', () => {
        const doc = parseHtml(FUTACLO_HTML);

        expect(detectLogFormat(doc)).toBe('futaclo');
    });

    test('上記以外はふたば本家と判定する', () => {
        const doc = parseHtml(FUTABA_HTML);

        expect(detectLogFormat(doc)).toBe('futaba');
    });
});

describe('extractResponses', () => {
    test('ふたば本家のレスを抽出する', () => {
        const doc = parseHtml(FUTABA_HTML);

        const responses = extractResponses(doc, 'futaba', 'https://example.com/');

        expect(responses).toHaveLength(2);
        expect(responses[0][0]).toBeInstanceOf(HTMLTableElement);
    });

    test('ふたクロ形式ではDIVラッパーごと返す', () => {
        const doc = parseHtml(FUTACLO_HTML);

        const responses = extractResponses(doc, 'futaclo', 'https://example.com/');

        expect(responses).toHaveLength(1);
        expect(responses[0][0]).toBeInstanceOf(HTMLDivElement);
        expect(
            (responses[0][0] as HTMLElement).querySelector('table'),
        ).not.toBeNull();
    });

    test('tsumanne形式では削除レスを除外しIDを取り除く', () => {
        const doc = parseHtml(TSUMANNE_HTML);

        const responses = extractResponses(doc, 'tsumanne', 'https://example.com/');

        expect(responses).toHaveLength(2);
        expect(
            (responses[0][0] as HTMLElement)
                .querySelector('.cnw')
                ?.textContent?.includes('ID:'),
        ).toBe(false);
        expect(
            (responses[0][0] as HTMLElement).querySelector('.cnw')
                ?.textContent,
        ).toBe('24/11/02(土)12:03:00');
    });

    test('Futafuta形式ではスレ主の非tableノード群と返信tableを抽出する', () => {
        const doc = parseHtml(FUTAFUTA_HTML);

        const responses = extractResponses(doc, 'futafuta', 'https://example.com/');

        expect(responses).toHaveLength(2);
        expect(responses[0].length).toBeGreaterThan(1);
        expect(responses[0].some((node) => node.nodeType === Node.TEXT_NODE)).toBe(
            true,
        );
        expect(
            (responses[1][0] as HTMLElement).querySelector('.cno')?.textContent,
        ).toBe('No.21');
    });
});

function buildShiftJisHtml(): Uint8Array {
    const prefix = Buffer.from(
        '<!DOCTYPE html><meta charset="Shift_JIS"><title>',
        'ascii',
    );
    const sjisText = Uint8Array.from([0x82, 0xa0]); // "あ" in Shift_JIS
    const suffix = Buffer.from(
        '</title><div class="thre"><table><tr><td><span class="cnw">24/11/02(土)12:00:00</span></td></tr></table></div>',
        'ascii',
    );
    return new Uint8Array([
        ...prefix,
        ...sjisText,
        ...suffix,
    ]);
}

describe('fetchThreadHtml', () => {
    test('fetchしたHTMLをDocumentに変換する', async () => {
        const originalFetch = global.fetch;
        const mockFetch: jest.MockedFunction<typeof fetch> = jest.fn();
        const utf8Buffer = Buffer.from(FUTABA_HTML, 'utf-8');
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            url: 'https://example.com/thread.htm',
            headers: new Headers({
                'content-type': 'text/html; charset=utf-8',
            }),
            arrayBuffer: async () =>
                utf8Buffer.buffer.slice(
                    utf8Buffer.byteOffset,
                    utf8Buffer.byteOffset + utf8Buffer.byteLength,
                ),
        } as Response);
        global.fetch = mockFetch;

        const { doc, finalUrl } = await fetchThreadHtml('https://example.com/thread.htm');

        expect(mockFetch).toHaveBeenCalledWith('https://example.com/thread.htm');
        expect(doc.querySelector('.thre')).not.toBeNull();
        expect(finalUrl).toBe('https://example.com/thread.htm');

        global.fetch = originalFetch;
    });

    test('Shift_JISのHTMLを自動検出してデコードする', async () => {
        const originalFetch = global.fetch;
        const mockFetch: jest.MockedFunction<typeof fetch> = jest.fn();
        const buffer = buildShiftJisHtml();
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            url: 'https://example.com/thread-sjis.htm',
            headers: new Headers(),
            arrayBuffer: async () =>
                buffer.buffer.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + buffer.byteLength,
                ),
        } as Response);
        global.fetch = mockFetch;

        const { doc } = await fetchThreadHtml('https://example.com/thread-sjis.htm');

        expect(mockFetch).toHaveBeenCalled();
        expect(doc.querySelector('title')?.textContent).toBe('あ');

        global.fetch = originalFetch;
    });
});

describe('convertRelativeUrls', () => {
    const BASE = 'https://tsumanne.net/si/data/2025/01/01/1234567/index.htm';

    function makeNodes(html: string): Node[] {
        const doc = new DOMParser().parseFromString(
            `<div>${html}</div>`,
            'text/html',
        );
        return Array.from(doc.body.firstElementChild!.childNodes).map(
            (n) => document.importNode(n, true),
        );
    }

    test('ファイル名のみ相対URLを絶対URLに変換する', () => {
        const nodes = makeNodes('<a href="1761814517439.jpg">img</a>');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'https://tsumanne.net/si/data/2025/01/01/1234567/1761814517439.jpg',
        );
    });

    test('ルート相対パスを変換する', () => {
        const base = 'https://may.2chan.net/b/res/1368544718.htm';
        const nodes = makeNodes('<a href="/b/res/1373518198.htm">link</a>');
        convertRelativeUrls(nodes, base);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'https://may.2chan.net/b/res/1373518198.htm',
        );
    });

    test('プロトコル相対URLを変換する', () => {
        const base = 'https://may.2chan.net/b/res/1234567890.htm';
        const nodes = makeNodes('<a href="//dec.2chan.net/85/futaba.htm">link</a>');
        convertRelativeUrls(nodes, base);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'https://dec.2chan.net/85/futaba.htm',
        );
    });

    test('絶対URLはそのまま保持される', () => {
        const nodes = makeNodes('<a href="https://example.com/page.html">link</a>');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'https://example.com/page.html',
        );
    });

    test('フラグメントのみのリンクは変換しない', () => {
        const nodes = makeNodes('<a href="#r5">anchor</a>');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('href')).toBe('#r5');
    });

    test('特殊スキームは変換しない', () => {
        const nodes = makeNodes(
            '<a href="javascript:void(0)">js</a><a href="mailto:user@example.com">mail</a>',
        );
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'javascript:void(0)',
        );
        expect((nodes[1] as Element).getAttribute('href')).toBe(
            'mailto:user@example.com',
        );
    });

    test('URL解決で例外が出てもエラーにならない', () => {
        const nodes = makeNodes('<a href="http://[invalid">link</a>');
        expect(() => convertRelativeUrls(nodes, BASE)).not.toThrow();
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'http://[invalid',
        );
    });

    test('ネストした要素も変換される', () => {
        const nodes = makeNodes(
            '<div><div><a href="foo.htm">link</a><img src="bar.jpg"></div></div>',
        );
        convertRelativeUrls(nodes, BASE);
        const a = (nodes[0] as Element).querySelector('a');
        const img = (nodes[0] as Element).querySelector('img');
        expect(a?.getAttribute('href')).toBe(
            'https://tsumanne.net/si/data/2025/01/01/1234567/foo.htm',
        );
        expect(img?.getAttribute('src')).toBe(
            'https://tsumanne.net/si/data/2025/01/01/1234567/bar.jpg',
        );
    });

    test('ルートノード自体が対象要素の場合も変換される', () => {
        const nodes = makeNodes('<a href="page.htm">link</a>');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('href')).toBe(
            'https://tsumanne.net/si/data/2025/01/01/1234567/page.htm',
        );
    });

    test('対象外要素は変換しない', () => {
        const nodes = makeNodes(
            '<form action="submit.php"></form><iframe src="frame.htm"></iframe>',
        );
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('action')).toBe('submit.php');
        expect((nodes[1] as Element).getAttribute('src')).toBe('frame.htm');
    });

    test('srcset属性は変換しない', () => {
        const nodes = makeNodes('<img src="img.jpg" srcset="small.jpg 1x, large.jpg 2x">');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('srcset')).toBe(
            'small.jpg 1x, large.jpg 2x',
        );
        expect((nodes[0] as Element).getAttribute('src')).toBe(
            'https://tsumanne.net/si/data/2025/01/01/1234567/img.jpg',
        );
    });

    test('データURIは変換しない', () => {
        const nodes = makeNodes('<img src="data:image/png;base64,iVBORw0KG">');
        convertRelativeUrls(nodes, BASE);
        expect((nodes[0] as Element).getAttribute('src')).toBe(
            'data:image/png;base64,iVBORw0KG',
        );
    });
});
