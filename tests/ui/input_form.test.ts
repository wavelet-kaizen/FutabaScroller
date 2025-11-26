import { describe, expect, test } from '@jest/globals';

import { InputFormOverlay } from '../../src/ui/input_form';

describe('InputFormOverlay', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('フォームを表示してキャンセルできる', async () => {
        const overlay = new InputFormOverlay();
        const resultPromise = overlay.prompt(() => 5);

        const container = document.querySelector('[data-role="input-form-overlay"]');
        expect(container).not.toBeNull();

        const cancelButton = container?.querySelector<HTMLButtonElement>(
            '[data-role="cancel-button"]',
        );
        expect(cancelButton).not.toBeNull();
        cancelButton?.click();

        const result = await resultPromise;
        expect(result).toBeNull();
        expect(document.querySelector('[data-role="input-form-overlay"]')).toBeNull();
    });

    test('有効な入力を受け取りThreadSettingsを返す（indexモード）', async () => {
        const overlay = new InputFormOverlay();
        const resultPromise = overlay.prompt(() => 10);

        const startInput = document.querySelector<HTMLInputElement>(
            '[data-role="start-value"]',
        );
        const speedInput = document.querySelector<HTMLInputElement>(
            '[data-role="speed"]',
        );
        const additionalArea = document.querySelector<HTMLTextAreaElement>(
            '[data-role="additional-urls"]',
        );
        const form = document.querySelector<HTMLFormElement>('[data-role="input-form"]');

        if (!startInput || !speedInput || !additionalArea || !form) {
            throw new Error('フォーム要素が見つかりません');
        }

        startInput.value = '3';
        speedInput.value = '1.5';
        additionalArea.value =
            'https://example.com/thread1.htm\n\nhttps://example.com/thread2.htm';

        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const result = await resultPromise;
        expect(result).not.toBeNull();
        expect(result).toEqual({
            startMode: 'index',
            startValue: 3,
            startResponseIndex: 3,
            speedMultiplier: 1.5,
            additionalThreadUrls: [
                'https://example.com/thread1.htm',
                'https://example.com/thread2.htm',
            ],
            uiMode: 'auto-hide',
        });
    });

    test('UI表示モードはデフォルトで自動非表示が選択され、常駐表示も選択できる', async () => {
        const overlay = new InputFormOverlay();
        const resultPromise = overlay.prompt(() => 5);

        const autoHideRadio = document.querySelector<HTMLInputElement>(
            'input[name="uiMode"][value="auto-hide"]',
        );
        const persistentRadio = document.querySelector<HTMLInputElement>(
            'input[name="uiMode"][value="persistent"]',
        );
        const form = document.querySelector<HTMLFormElement>('[data-role="input-form"]');

        if (!autoHideRadio || !persistentRadio || !form) {
            throw new Error('UIモードの入力要素が見つかりません');
        }

        expect(autoHideRadio.checked).toBe(true);
        expect(persistentRadio.checked).toBe(false);

        persistentRadio.click();
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const result = await resultPromise;
        expect(result?.uiMode).toBe('persistent');
    });

    test('日時モードの入力を受け付ける', async () => {
        const overlay = new InputFormOverlay();
        const resultPromise = overlay.prompt(() => 5);

        const timestampRadio = document.querySelector<HTMLInputElement>(
            'input[name="startMode"][value="timestamp"]',
        );
        const startInput = document.querySelector<HTMLInputElement>(
            '[data-role="start-value"]',
        );
        const form = document.querySelector<HTMLFormElement>('[data-role="input-form"]');

        if (!timestampRadio || !startInput || !form) {
            throw new Error('フォーム要素が見つかりません');
        }

        timestampRadio.click();
        startInput.value = '2025/11/16 22:48:03';

        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const result = await resultPromise;
        expect(result).not.toBeNull();
        expect(result).toEqual({
            startMode: 'timestamp',
            startValue: '2025/11/16 22:48:03',
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'auto-hide',
        });
    });

    test('無効な入力の場合はエラーを表示して再入力を促す', async () => {
        const overlay = new InputFormOverlay();
        const resultPromise = overlay.prompt(() => 5);

        const speedInput = document.querySelector<HTMLInputElement>(
            '[data-role="speed"]',
        );
        const form = document.querySelector<HTMLFormElement>('[data-role="input-form"]');
        const errorBox = document.querySelector<HTMLDivElement>('[data-role="input-error"]');
        const cancelButton = document.querySelector<HTMLButtonElement>(
            '[data-role="cancel-button"]',
        );

        if (!speedInput || !form || !errorBox || !cancelButton) {
            throw new Error('フォーム要素が見つかりません');
        }

        speedInput.value = '-1';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(errorBox.style.display).toBe('block');
        expect(errorBox.textContent).toContain('再生速度');

        cancelButton.click();
        const result = await resultPromise;
        expect(result).toBeNull();
    });

    test('showWithError で直前の入力内容を復元し、エラーをハイライトする', async () => {
        const overlay = new InputFormOverlay();
        const settings = {
            startMode: 'timestamp' as const,
            startValue: '2024/01/01 00:00:00',
            startResponseIndex: 0,
            speedMultiplier: 2,
            additionalThreadUrls: ['https://example.com/thread.htm'],
            uiMode: 'auto-hide' as const,
        };

        const resultPromise = overlay.showWithError(
            settings,
            '日時形式が不正です',
            'startValue',
        );

        const startInput = document.querySelector<HTMLInputElement>(
            '[data-role="start-value"]',
        );
        const speedInput = document.querySelector<HTMLInputElement>(
            '[data-role="speed"]',
        );
        const urlsArea = document.querySelector<HTMLTextAreaElement>(
            '[data-role="additional-urls"]',
        );
        const errorBox = document.querySelector<HTMLDivElement>('[data-role="input-error"]');

        if (!startInput || !speedInput || !urlsArea || !errorBox) {
            throw new Error('フォーム要素が見つかりません');
        }

        expect(startInput.value).toBe('2024/01/01 00:00:00');
        expect(speedInput.value).toBe('2');
        expect(urlsArea.value).toContain('https://example.com/thread.htm');
        expect(errorBox.style.display).toBe('block');
        expect(errorBox.textContent).toContain('日時形式');
        expect(startInput.style.border).toContain('ff8787');

        // 入力を修正して送信
        startInput.value = '2024/01/02 00:00:00';
        const form = document.querySelector<HTMLFormElement>('[data-role="input-form"]');
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const result = await resultPromise;
        expect(result?.startValue).toBe('2024/01/02 00:00:00');
    });
});
