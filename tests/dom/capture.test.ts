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

    test('有効なレスのみを取得する', () => {
        document.body.innerHTML = `
            <div class="thre">
                <table>
                    <tbody>
                        <tr>
                            <td class="cnw">24/11/02(土)12:34:56</td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <tbody>
                        <tr>
                            <td class="cnw">24/11/02(土)12:35:10</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(2);
        expect(responses[0].index).toBe(1);
        expect(responses[1].index).toBe(2);
        expect(responses[0].timestamp.getTime()).toBeLessThan(
            responses[1].timestamp.getTime(),
        );
    });

    test('解析に失敗したレスをスキップする', () => {
        document.body.innerHTML = `
            <div class="thre">
                <table>
                    <tbody>
                        <tr>
                            <td class="cnw">invalid</td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <tbody>
                        <tr>
                            <td class="cnw">24/11/02(土)12:36:00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const responses = captureResponses();

        expect(responses).toHaveLength(1);
        expect(responses[0].index).toBe(2);
        expect(responses[0].timestamp.toISOString()).toBe(
            new Date(2024, 10, 2, 12, 36, 0).toISOString(),
        );
        expect(console.warn).toHaveBeenCalled();
    });
});
