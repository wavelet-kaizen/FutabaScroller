import { describe, expect, jest, test } from '@jest/globals';

import { captureResponses } from '../../src/dom/capture';

describe('captureResponses', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        (console.warn as jest.Mock).mockRestore();
    });

    test('ふたば本家形式のtableレスを取得する', () => {
        document.body.innerHTML = `
            <div class="wrapper">
                <div class="thre">
                    <table>
                        <tbody>
                            <tr>
                                <td><span class="cnw">24/11/02(土)12:34:56</span><span class="cno">No.1</span></td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <tr>
                                <td><span class="cnw">24/11/02(土)12:35:10</span><span class="cno">No.2</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(2);
        expect(responses[0].index).toBe(0);
        expect(responses[1].index).toBe(1);
        expect(responses[0].timestamp.getTime()).toBeLessThan(
            responses[1].timestamp.getTime(),
        );
    });

    test('Futafutaのスレ主投稿（非tableノード群）を取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                テキストノード
                <span class="cnw">24/11/02(土)12:40:00</span>
                <span class="cno">No.10</span>
                <blockquote>本文</blockquote>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(1);
        expect(responses[0].index).toBe(0);
        expect(responses[0].element).toBeInstanceOf(HTMLElement);
        expect(
            document.querySelector('.thre')?.textContent?.includes('テキストノード'),
        ).toBe(true);
    });

    test('ふたクロ形式のDIVラッパーを含むレスを取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                <div style="">
                    <table>
                        <tbody>
                            <tr>
                                <td><span class="cnw">24/11/02(土)12:45:00</span><span class="cno">No.30</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(1);
        expect(responses[0].element.tagName).toBe('DIV');
    });

    test('tsumanne形式のID付きタイムスタンプを取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">24/11/02(土)12:50:00 ID:abc</span><span class="cno">No.40</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(1);
        expect(responses[0].timestamp.toISOString()).toBe(
            new Date(2024, 10, 2, 12, 50, 0).toISOString(),
        );
    });

    test('混在形式でふたば本家とFutafutaを統合して取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">24/11/02(土)12:00:00</span><span class="cno">No.1</span></td>
                        </tr>
                    </tbody>
                </table>
                Futafutaスレ主
                <span class="cnw">24/11/02(土)12:01:00</span>
                <span class="cno">No.2</span>
                <blockquote>owner</blockquote>
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">24/11/02(土)12:02:00</span><span class="cno">No.3</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(3);
        expect(responses.map((r) => r.index)).toEqual([0, 1, 2]);
        expect(
            responses.map((r) => r.timestamp.getTime()).sort((a, b) => a - b),
        ).toEqual(responses.map((r) => r.timestamp.getTime()));
    });

    test('複数のFutafutaスレ主投稿を順番に取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                スレ主A
                <span class="cnw">24/11/02(土)12:10:00</span>
                <span class="cno">No.100</span>
                <blockquote>A</blockquote>
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">24/11/02(土)12:11:00</span><span class="cno">No.101</span></td>
                        </tr>
                    </tbody>
                </table>
                スレ主B
                <span class="cnw">24/11/02(土)12:12:00</span>
                <span class="cno">No.102</span>
                <blockquote>B</blockquote>
            </div>
        `;

        const responses = captureResponses();

        expect(responses.map((r) => r.index)).toEqual([0, 1, 2]);
        expect(responses[0].timestamp.toISOString()).toBe(
            new Date(2024, 10, 2, 12, 10, 0).toISOString(),
        );
        expect(responses[2].timestamp.toISOString()).toBe(
            new Date(2024, 10, 2, 12, 12, 0).toISOString(),
        );
    });

    test('解析に失敗したレスをスキップする', () => {
        document.body.innerHTML = `
            <div class="thre">
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">invalid</span><span class="cno">No.50</span></td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <tbody>
                        <tr>
                            <td><span class="cnw">24/11/02(土)12:36:00</span><span class="cno">No.51</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(1);
        expect(responses[0].index).toBe(1);
        expect(responses[0].timestamp.toISOString()).toBe(
            new Date(2024, 10, 2, 12, 36, 0).toISOString(),
        );
        expect(console.warn).toHaveBeenCalled();
    });
});
