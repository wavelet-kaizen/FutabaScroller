import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { ResponseUpdateManager } from '../../src/domain/response_update_manager';
import { mergeThreads } from '../../src/dom/merge';
import * as threadFetcher from '../../src/dom/thread_fetcher';
import { LoadingOverlay } from '../../src/ui/loading_overlay';

jest.mock('../../src/dom/thread_fetcher');

const fetchThreadHtmlMock = threadFetcher
    .fetchThreadHtml as jest.MockedFunction<typeof threadFetcher.fetchThreadHtml>;
const detectLogFormatMock = threadFetcher
    .detectLogFormat as jest.MockedFunction<typeof threadFetcher.detectLogFormat>;
const extractResponsesMock = threadFetcher
    .extractResponses as jest.MockedFunction<typeof threadFetcher.extractResponses>;

function createResponse(no: number, timestamp: string): HTMLElement {
    const table = document.createElement('table');
    const cnw = document.createElement('span');
    cnw.className = 'cnw';
    cnw.textContent = timestamp;
    const cno = document.createElement('span');
    cno.className = 'cno';
    cno.textContent = `No.${no}`;
    table.append(cnw, cno);
    return table;
}

function createFutafutaOwner(no: number, timestamp: string): Node[] {
    const fileText = document.createTextNode('画像ファイル名：foo.jpg');
    const cnw = document.createElement('span');
    cnw.className = 'cnw';
    cnw.textContent = timestamp;
    const cno = document.createElement('span');
    cno.className = 'cno';
    cno.textContent = `No.${no}`;
    const blockquote = document.createElement('blockquote');
    blockquote.textContent = '本文';
    return [fileText, cnw, cno, blockquote];
}

afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
});

describe('mergeThreads', () => {
    test('No.重複を除外し昇順でDOMに挿入する', async () => {
        document.body.innerHTML = '<div class="thre"></div>';
        const container = document.querySelector('.thre');
        if (!container) {
            throw new Error('コンテナが見つかりません');
        }

        const existing = createResponse(2, '24/11/02(土)12:00:00');
        container.appendChild(existing);

        const newResponse1 = createResponse(1, '24/11/02(土)11:59:00');
        const newResponse2 = createResponse(3, '24/11/02(土)12:01:00');
        extractResponsesMock
            .mockReturnValueOnce([[newResponse1]])
            .mockReturnValueOnce([[newResponse2]]);
        detectLogFormatMock.mockReturnValue('futaba');
        fetchThreadHtmlMock.mockResolvedValue(new Document());

        const updateManager = {
            stop: jest.fn(),
            start: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        } as unknown as ResponseUpdateManager;

        const overlay = new LoadingOverlay();
        const responses = await mergeThreads(
            ['https://example.com/1', 'https://example.com/2'],
            overlay,
            updateManager,
        );

        const cnoTexts = Array.from(
            container.querySelectorAll<HTMLElement>('.cno'),
        ).map((node) => node.textContent);
        expect(cnoTexts).toEqual(['No.1', 'No.2', 'No.3']);
        expect(responses).toHaveLength(3);
        expect(updateManager.stop).toHaveBeenCalled();
        expect(updateManager.start).toHaveBeenCalled();
        overlay.destroy();
    });

    test('ふたクロのラッパーを保持したままマージする', async () => {
        document.body.innerHTML = '<div class="thre"></div>';
        const container = document.querySelector('.thre');
        if (!container) {
            throw new Error('コンテナが見つかりません');
        }

        const wrapper = document.createElement('div');
        wrapper.setAttribute('style', '');
        const table = createResponse(5, '24/11/02(土)12:05:00');
        wrapper.appendChild(table);

        extractResponsesMock.mockReturnValue([[wrapper]]);
        detectLogFormatMock.mockReturnValue('futaclo');
        fetchThreadHtmlMock.mockResolvedValue(new Document());

        const updateManager = {
            stop: jest.fn(),
            start: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        } as unknown as ResponseUpdateManager;

        const overlay = new LoadingOverlay();
        await mergeThreads(['https://example.com/1'], overlay, updateManager);

        const children = Array.from(container.children);
        expect(children[0].tagName).toBe('DIV');
        expect(children[0].querySelector('table')).not.toBeNull();
        overlay.destroy();
    });

    test('Futafutaスレ主投稿の非tableノード群をマージする', async () => {
        document.body.innerHTML = '<div class="thre"></div>';
        const container = document.querySelector('.thre');
        if (!container) {
            throw new Error('コンテナが見つかりません');
        }

        const ownerGroup = createFutafutaOwner(200, '24/11/02(土)12:20:00');
        extractResponsesMock.mockReturnValue([ownerGroup]);
        detectLogFormatMock.mockReturnValue('futafuta');
        fetchThreadHtmlMock.mockResolvedValue(new Document());

        const updateManager = {
            stop: jest.fn(),
            start: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        } as unknown as ResponseUpdateManager;

        const overlay = new LoadingOverlay();
        const responses = await mergeThreads(
            ['https://example.com/owner'],
            overlay,
            updateManager,
        );

        const childNodes = Array.from(container.childNodes);
        expect(
            childNodes[0].textContent?.includes('画像ファイル名：foo.jpg'),
        ).toBe(true);
        expect(container.querySelector('.cno')?.textContent).toBe('No.200');
        expect(responses).toHaveLength(1);
        expect(responses[0].index).toBe(0);
        overlay.destroy();
    });

    test('マージ後にレスポンスを再取得する', async () => {
        document.body.innerHTML = '<div class="thre"></div>';
        const container = document.querySelector('.thre');
        if (!container) {
            throw new Error('コンテナが見つかりません');
        }

        const newResponse = createResponse(10, '24/11/02(土)12:10:00');
        extractResponsesMock.mockReturnValue([[newResponse]]);
        detectLogFormatMock.mockReturnValue('futaba');
        fetchThreadHtmlMock.mockResolvedValue(new Document());

        const updateManager = {
            stop: jest.fn(),
            start: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        } as unknown as ResponseUpdateManager;

        const overlay = new LoadingOverlay();
        const responses = await mergeThreads(
            ['https://example.com/1'],
            overlay,
            updateManager,
        );

        expect(responses).toHaveLength(1);
        expect(responses[0].index).toBe(0);
        expect(responses[0].timestamp.getHours()).toBe(12);
        overlay.destroy();
    });

    test('取得失敗時にローディングオーバーレイを閉じる', async () => {
        document.body.innerHTML = '<div class="thre"></div>';

        fetchThreadHtmlMock.mockRejectedValue(new Error('fetch failed'));

        const updateManager = {
            stop: jest.fn(),
            start: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            getCurrentResponses: jest.fn().mockReturnValue([]),
        } as unknown as ResponseUpdateManager;

        const overlay = new LoadingOverlay();

        await expect(
            mergeThreads(['https://example.com/fail'], overlay, updateManager),
        ).rejects.toThrow('fetch failed');

        expect(updateManager.stop).toHaveBeenCalled();
        expect(updateManager.start).toHaveBeenCalled();
        expect(
            document.querySelector('[data-role="loading-overlay"]'),
        ).toBeNull();
    });
});
