import { describe, expect, jest, test } from '@jest/globals';

import {
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

        const responses = extractResponses(doc, 'futaba');

        expect(responses).toHaveLength(2);
        expect(responses[0][0]).toBeInstanceOf(HTMLTableElement);
    });

    test('ふたクロ形式ではDIVラッパーごと返す', () => {
        const doc = parseHtml(FUTACLO_HTML);

        const responses = extractResponses(doc, 'futaclo');

        expect(responses).toHaveLength(1);
        expect(responses[0][0]).toBeInstanceOf(HTMLDivElement);
        expect(
            (responses[0][0] as HTMLElement).querySelector('table'),
        ).not.toBeNull();
    });

    test('tsumanne形式では削除レスを除外しIDを取り除く', () => {
        const doc = parseHtml(TSUMANNE_HTML);

        const responses = extractResponses(doc, 'tsumanne');

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

        const responses = extractResponses(doc, 'futafuta');

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

        const doc = await fetchThreadHtml('https://example.com/thread.htm');

        expect(mockFetch).toHaveBeenCalledWith('https://example.com/thread.htm');
        expect(doc.querySelector('.thre')).not.toBeNull();

        global.fetch = originalFetch;
    });

    test('Shift_JISのHTMLを自動検出してデコードする', async () => {
        const originalFetch = global.fetch;
        const mockFetch: jest.MockedFunction<typeof fetch> = jest.fn();
        const buffer = buildShiftJisHtml();
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers(),
            arrayBuffer: async () =>
                buffer.buffer.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + buffer.byteLength,
                ),
        } as Response);
        global.fetch = mockFetch;

        const doc = await fetchThreadHtml('https://example.com/thread-sjis.htm');

        expect(mockFetch).toHaveBeenCalled();
        expect(doc.querySelector('title')?.textContent).toBe('あ');

        global.fetch = originalFetch;
    });
});
