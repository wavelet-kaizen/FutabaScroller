import { describe, expect, test } from '@jest/globals';

import { LoadingOverlay } from '../../src/ui/loading_overlay';

describe('LoadingOverlay', () => {
    test('表示と非表示ができる', () => {
        const overlay = new LoadingOverlay();
        overlay.show(1);

        const container = document.querySelector<HTMLDivElement>(
            '[data-role="loading-overlay"]',
        );
        expect(container).not.toBeNull();
        expect(container?.style.display).toBe('flex');

        overlay.hide();
        expect(container?.style.display).toBe('none');

        overlay.destroy();
        expect(document.querySelector('[data-role="loading-overlay"]')).toBeNull();
    });

    test('進捗を更新して表示する', () => {
        const overlay = new LoadingOverlay();
        overlay.show(3);

        overlay.updateProgress(2);

        const message = document.querySelector<HTMLDivElement>(
            '[data-role="loading-message"]',
        );
        expect(message?.textContent).toContain('2/3');
    });

    test('エラーを表示する', () => {
        const overlay = new LoadingOverlay();
        overlay.show(2);

        overlay.showError('取得に失敗しました');

        // @ts-expect-error テスト用にprivateプロパティへアクセス
        const error = overlay.errorElement as HTMLDivElement | undefined;
        expect(error?.style.display).toBe('block');
        expect(error?.textContent).toContain('取得に失敗しました');
    });
});
