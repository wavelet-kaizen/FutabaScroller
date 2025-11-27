import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FloatingControlPanel } from '../../src/ui/floating_control';

describe('FloatingControlPanel', () => {
    let playPauseMock: jest.Mock;
    let speedUpMock: jest.Mock;
    let speedDownMock: jest.Mock;

    beforeEach(() => {
        playPauseMock = jest.fn();
        speedUpMock = jest.fn();
        speedDownMock = jest.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('表示モードを切り替え、フル表示時にコントロールを表示する', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);

        panel.show();

        const container = document.querySelector<HTMLElement>('[data-role="floating-control"]');
        const toggle = container?.querySelector<HTMLButtonElement>(
            '[data-role="display-toggle"]',
        );
        const controls = container?.querySelector<HTMLElement>('[data-role="controls-area"]');
        const content = container?.querySelector<HTMLElement>('[data-role="content-area"]');

        expect(container).not.toBeNull();
        // 初期はフル表示（fit-contentはjsdomで空文字列になるため、minWidthで確認）
        expect(container?.style.minWidth).toBe('220px');
        expect(container?.style.maxWidth).toBe('none');
        expect(content?.style.display).toBe('flex');
        expect(controls?.style.display).toBe('flex');

        // 最小化モード
        toggle?.click();
        expect(container?.style.width).toBe('60px');
        expect(content?.style.display).toBe('none');

        // ステータス表示モード
        toggle?.click();
        expect(container?.style.minWidth).toBe('220px');
        expect(container?.style.maxWidth).toBe('none');
        expect(content?.style.display).toBe('flex');
        expect(controls?.style.display).toBe('none');

        // フル表示モード
        toggle?.click();
        expect(container?.style.minWidth).toBe('220px');
        expect(controls?.style.display).toBe('flex');

        // 最小化モードへ戻る
        toggle?.click();
        expect(container?.style.width).toBe('60px');
        expect(content?.style.display).toBe('none');
    });

    test('操作ボタンでコールバックが呼ばれる', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();

        const playPause = document.querySelector<HTMLButtonElement>('[data-role="play-pause"]');
        const speedUp = document.querySelector<HTMLButtonElement>('[data-role="speed-up"]');
        const speedDown = document.querySelector<HTMLButtonElement>('[data-role="speed-down"]');

        playPause?.click();
        speedUp?.click();
        speedDown?.click();

        expect(playPauseMock).toHaveBeenCalledTimes(1);
        expect(speedUpMock).toHaveBeenCalledTimes(1);
        expect(speedDownMock).toHaveBeenCalledTimes(1);
    });

    test('updateStateでステータスとボタンラベルが更新される', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();

        const toggle = document.querySelector<HTMLButtonElement>(
            '[data-role="display-toggle"]',
        );
        toggle?.click();
        toggle?.click(); // ステータス表示

        panel.updateState(new Date(2024, 10, 2, 12, 34, 56), 1.4, true);

        const timeText = document.querySelector<HTMLElement>('[data-role="time-text"]');
        const speedText = document.querySelector<HTMLElement>('[data-role="speed-text"]');
        const playStateText = document.querySelector<HTMLElement>(
            '[data-role="play-state-text"]',
        );
        const playPause = document.querySelector<HTMLButtonElement>('[data-role="play-pause"]');

        expect(timeText?.textContent).toBe('2024/11/02 12:34:56');
        expect(speedText?.textContent).toBe('速度: 1.4x');
        expect(playStateText?.textContent).toContain('一時停止中');
        expect(playPause?.textContent).toBe('▶');

        panel.updateState(new Date(2024, 10, 2, 12, 34, 57), 0.9, false);
        expect(playStateText?.textContent).toContain('再生中');
        expect(playPause?.textContent).toBe('⏸');
    });

    test('メッセージが表示される（切り替えボタンは廃止）', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();
        panel.updateState(new Date(2024, 10, 2, 12, 0, 0), 1, true);

        // メッセージを表示
        panel.showMessage('テストメッセージ');

        const messageArea = document.querySelector<HTMLElement>('[data-role="message-area"]');
        const timeText = document.querySelector<HTMLElement>('[data-role="time-text"]');

        // メッセージが表示される
        expect(messageArea?.textContent).toBe('テストメッセージ');
        expect(messageArea?.style.display).toBe('block');

        // ステータスも同時に表示される
        expect(timeText?.style.display).not.toBe('none');
    });

    test('エラーメッセージが赤色で表示される', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();

        panel.showMessage('エラーが発生しました', true);

        const messageArea = document.querySelector<HTMLElement>('[data-role="message-area"]');

        expect(messageArea?.textContent).toBe('エラーが発生しました');
        expect(messageArea?.style.color).toBe('rgb(255, 107, 107)');
        expect(messageArea?.style.background).toContain('rgba(255, 107, 107');
    });

    test('メッセージ表示時、最小化モードならステータスモードに切り替わる', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();

        const container = document.querySelector<HTMLElement>('[data-role="floating-control"]');

        // 最初はフル表示（fit-contentはjsdomで空文字列になるため、minWidthで確認）
        expect(container?.style.minWidth).toBe('220px');

        // メッセージ表示
        const toggle = document.querySelector<HTMLButtonElement>(
            '[data-role="display-toggle"]',
        );
        toggle?.click(); // 最小化へ
        panel.showMessage('準備完了');

        // ステータスモードに切り替わる（fit-contentはjsdomで空文字列になるため、minWidthで確認）
        expect(container?.style.minWidth).toBe('220px');
    });

    test('destroyでイベントリスナーとDOMが破棄される', () => {
        const panel = new FloatingControlPanel(playPauseMock, speedUpMock, speedDownMock);
        panel.show();

        const addSpy = jest.spyOn(window, 'addEventListener');
        const removeSpy = jest.spyOn(window, 'removeEventListener');

        const toggle = document.querySelector<HTMLButtonElement>(
            '[data-role="display-toggle"]',
        );
        toggle?.dispatchEvent(
            new MouseEvent('mousedown', {
                clientX: 10,
                clientY: 10,
                button: 0,
                bubbles: true,
            }),
        );

        panel.destroy();

        expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(document.querySelector('[data-role="floating-control"]')).toBeNull();

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
