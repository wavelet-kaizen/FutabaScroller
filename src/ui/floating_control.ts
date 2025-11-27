type DisplayMode = 'minimized' | 'status' | 'full';

const PANEL_Z_INDEX = 12000;
const PANEL_MARGIN = 12;
const MINIMIZED_SIZE = 48;
const PANEL_PADDING = 12;
const CONTAINER_TRANSITION =
    'background-color 0.15s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out';
const DRAG_ACTIVATION_THRESHOLD = 8;

export class FloatingControlPanel {
    private container: HTMLDivElement | null = null;
    private mainButton: HTMLButtonElement | null = null;
    private contentArea: HTMLDivElement | null = null;
    private statusArea: HTMLDivElement | null = null;
    private timeText: HTMLDivElement | null = null;
    private stateRow: HTMLDivElement | null = null;
    private speedText: HTMLSpanElement | null = null;
    private playStateText: HTMLSpanElement | null = null;
    private messageArea: HTMLDivElement | null = null;
    private controlsArea: HTMLDivElement | null = null;
    private playPauseButton: HTMLButtonElement | null = null;
    private speedUpButton: HTMLButtonElement | null = null;
    private speedDownButton: HTMLButtonElement | null = null;
    private isVisible = false;
    private displayMode: DisplayMode = 'full';
    private latestThreadTime: Date | null = null;
    private latestSpeed = 1;
    private latestPaused = false;
    private activeMessage: { text: string; isError: boolean } | null = null;
    private pointerDown = false;
    private isDragging = false;
    private dragMoved = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragWidth = 0;
    private dragHeight = 0;
    private position: { x: number; y: number } | null = null;
    private positionFrame: number | null = null;
    private boundMove: ((event: TouchEvent | MouseEvent) => void) | null = null;
    private boundEnd: ((event: TouchEvent | MouseEvent) => void) | null = null;

    constructor(
        private readonly onPlayPause: () => void,
        private readonly onSpeedUp: () => void,
        private readonly onSpeedDown: () => void,
    ) {}

    show(): void {
        this.isVisible = true;
        this.render();
    }

    hide(): void {
        this.isVisible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    destroy(): void {
        this.detachDragListeners();
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.mainButton = null;
        this.contentArea = null;
        this.statusArea = null;
        this.timeText = null;
        this.stateRow = null;
        this.speedText = null;
        this.playStateText = null;
        this.messageArea = null;
        this.controlsArea = null;
        this.playPauseButton = null;
        this.speedUpButton = null;
        this.speedDownButton = null;
        this.position = null;
        this.activeMessage = null;
        if (this.positionFrame !== null) {
            window.cancelAnimationFrame(this.positionFrame);
            this.positionFrame = null;
        }
        this.isVisible = false;
    }

    updateState(threadTime: Date | null, speed: number, paused: boolean): void {
        this.latestThreadTime = threadTime;
        this.latestSpeed = speed;
        this.latestPaused = paused;
        this.render();
    }

    showMessage(text: string, isError = false): void {
        this.activeMessage = { text, isError };
        if (this.displayMode === 'minimized') {
            this.displayMode = 'status';
        }
        this.show();
    }

    clearMessage(): void {
        this.activeMessage = null;
        this.render();
    }

    private render(): void {
        const container = this.ensureContainer();
        if (!container) {
            return;
        }

        if (!this.isVisible) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        this.updateLayout();
        this.updateTextContent();
        this.updateMessageContent();
        this.applyPosition();
    }

    private ensureContainer(): HTMLDivElement | null {
        if (this.container) {
            return this.container;
        }

        if (!document.body) {
            console.warn('document.body が見つかりません。');
            return null;
        }

        // コンテナ作成
        const container = document.createElement('div');
        container.dataset.role = 'floating-control';
        this.applyContainerStyles(container);

        // メインアイコンボタン
        const mainButton = document.createElement('button');
        mainButton.type = 'button';
        mainButton.dataset.role = 'display-toggle';
        mainButton.textContent = '⚡';
        this.applyMainButtonStyles(mainButton);
        mainButton.addEventListener('click', () => {
            if (this.dragMoved) {
                this.dragMoved = false;
                return;
            }
            this.cycleDisplayMode();
        });
        this.mainButton = mainButton;

        // コンテンツエリア（ステータス + メッセージ + コントロール）
        const contentArea = document.createElement('div');
        contentArea.dataset.role = 'content-area';
        this.applyContentAreaStyles(contentArea);
        this.contentArea = contentArea;

        // ステータスエリア
        const statusArea = document.createElement('div');
        statusArea.dataset.role = 'status-area';
        this.applyStatusAreaStyles(statusArea);
        this.statusArea = statusArea;

        // 日時テキスト
        const timeText = document.createElement('div');
        timeText.dataset.role = 'time-text';
        this.applyTimeTextStyles(timeText);
        this.timeText = timeText;

        // 状態行（速度 + 再生状態）
        const stateRow = document.createElement('div');
        stateRow.dataset.role = 'state-row';
        this.applyStateRowStyles(stateRow);
        this.stateRow = stateRow;

        // 速度テキスト
        const speedText = document.createElement('span');
        speedText.dataset.role = 'speed-text';
        this.speedText = speedText;

        // 再生状態テキスト
        const playStateText = document.createElement('span');
        playStateText.dataset.role = 'play-state-text';
        this.playStateText = playStateText;

        stateRow.appendChild(speedText);
        stateRow.appendChild(playStateText);
        statusArea.appendChild(timeText);
        statusArea.appendChild(stateRow);

        // メッセージエリア
        const messageArea = document.createElement('div');
        messageArea.dataset.role = 'message-area';
        this.applyMessageAreaStyles(messageArea);
        this.messageArea = messageArea;

        // コントロールエリア
        const controlsArea = document.createElement('div');
        controlsArea.dataset.role = 'controls-area';
        this.applyControlsAreaStyles(controlsArea);
        this.controlsArea = controlsArea;

        // 再生/一時停止ボタン
        const playPauseButton = document.createElement('button');
        playPauseButton.type = 'button';
        playPauseButton.dataset.role = 'play-pause';
        playPauseButton.textContent = '⏸';
        this.applyControlButtonStyles(playPauseButton);
        playPauseButton.addEventListener('click', () => {
            this.onPlayPause();
        });
        this.playPauseButton = playPauseButton;

        // 速度ダウンボタン
        const speedDownButton = document.createElement('button');
        speedDownButton.type = 'button';
        speedDownButton.dataset.role = 'speed-down';
        speedDownButton.textContent = '－';
        this.applyControlButtonStyles(speedDownButton);
        speedDownButton.addEventListener('click', () => {
            this.onSpeedDown();
        });
        this.speedDownButton = speedDownButton;

        // 速度アップボタン
        const speedUpButton = document.createElement('button');
        speedUpButton.type = 'button';
        speedUpButton.dataset.role = 'speed-up';
        speedUpButton.textContent = '＋';
        this.applyControlButtonStyles(speedUpButton);
        speedUpButton.addEventListener('click', () => {
            this.onSpeedUp();
        });
        this.speedUpButton = speedUpButton;

        controlsArea.appendChild(playPauseButton);
        controlsArea.appendChild(speedDownButton);
        controlsArea.appendChild(speedUpButton);

        contentArea.appendChild(statusArea);
        contentArea.appendChild(messageArea);
        contentArea.appendChild(controlsArea);

        container.appendChild(mainButton);
        container.appendChild(contentArea);

        // ドラッグイベント
        container.addEventListener('touchstart', (event) => this.handleDragStart(event), {
            passive: false,
        });
        container.addEventListener('mousedown', (event) => this.handleDragStart(event));

        document.body.appendChild(container);

        this.container = container;
        return container;
    }

    private applyContainerStyles(element: HTMLDivElement): void {
        element.style.position = 'fixed';
        element.style.display = 'flex';
        element.style.flexDirection = 'row';
        element.style.alignItems = 'center';
        element.style.gap = '8px';
        element.style.padding = `${PANEL_PADDING}px`;
        element.style.background = 'rgba(22, 24, 28, 0.95)';
        element.style.color = '#e8eaed';
        element.style.borderRadius = '12px';
        element.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        element.style.fontFamily =
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        element.style.zIndex = String(PANEL_Z_INDEX);
        element.style.userSelect = 'none';
        element.style.cursor = 'grab';
        element.style.transition = CONTAINER_TRANSITION;
    }

    private updateContainerTransition(enabled: boolean): void {
        if (!this.container) {
            return;
        }
        this.container.style.transition = enabled ? CONTAINER_TRANSITION : 'none';
    }

    private applyMainButtonStyles(button: HTMLButtonElement): void {
        button.style.width = `${MINIMIZED_SIZE}px`;
        button.style.height = `${MINIMIZED_SIZE}px`;
        button.style.flexShrink = '0';
        button.style.alignSelf = 'flex-start';
        button.style.borderRadius = '50%';
        button.style.border = 'none';
        button.style.background = 'rgba(76, 158, 255, 0.25)';
        button.style.color = '#4c9eff';
        button.style.fontSize = '20px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.15s ease';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(76, 158, 255, 0.35)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(76, 158, 255, 0.25)';
        });
    }

    private applyContentAreaStyles(element: HTMLDivElement): void {
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.gap = '8px';
        element.style.minWidth = '0';
    }

    private applyStatusAreaStyles(element: HTMLDivElement): void {
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.gap = '4px';
        element.style.fontSize = '13px';
        element.style.lineHeight = '1.4';
    }

    private applyTimeTextStyles(element: HTMLDivElement): void {
        element.style.color = '#e8eaed';
    }

    private applyStateRowStyles(element: HTMLDivElement): void {
        element.style.display = 'flex';
        element.style.flexDirection = 'row';
        element.style.gap = '12px';
        element.style.fontSize = '12px';
        element.style.color = '#9aa0a6';
    }

    private applyMessageAreaStyles(element: HTMLDivElement): void {
        element.style.display = 'none';
        element.style.fontSize = '12px';
        element.style.lineHeight = '1.4';
        element.style.padding = '8px';
        element.style.marginTop = '6px';
        element.style.borderRadius = '6px';
        element.style.background = 'rgba(255, 255, 255, 0.06)';
        element.style.color = '#e8eaed';
        element.style.whiteSpace = 'pre-line';
    }

    private applyControlsAreaStyles(element: HTMLDivElement): void {
        element.style.display = 'none';
        element.style.flexDirection = 'row';
        element.style.gap = '6px';
        element.style.alignItems = 'center';
        element.style.marginTop = '4px';
        element.style.paddingTop = '8px';
        element.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
    }

    private applyControlButtonStyles(button: HTMLButtonElement): void {
        button.style.width = '44px';
        button.style.height = '44px';
        button.style.borderRadius = '8px';
        button.style.border = 'none';
        button.style.background = 'rgba(76, 158, 255, 0.15)';
        button.style.color = '#4c9eff';
        button.style.fontSize = '18px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.15s ease';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(76, 158, 255, 0.25)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(76, 158, 255, 0.15)';
        });
    }

    private cycleDisplayMode(): void {
        if (this.displayMode === 'full') {
            this.displayMode = 'minimized';
        } else if (this.displayMode === 'minimized') {
            this.displayMode = 'status';
        } else {
            this.displayMode = 'full';
        }
        this.render();
    }

    private updateLayout(): void {
        if (!this.container || !this.contentArea || !this.controlsArea) {
            return;
        }

        if (this.displayMode === 'minimized') {
            // 最小化: アイコンのみ
            const minimizedWidth = MINIMIZED_SIZE + PANEL_PADDING;
            const minimizedHeight = MINIMIZED_SIZE + PANEL_PADDING;
            this.container.style.width = `${minimizedWidth}px`;
            this.container.style.minWidth = '';
            this.container.style.maxWidth = '';
            this.container.style.height = `${minimizedHeight}px`;
            this.container.style.padding = `${PANEL_PADDING}px 0 0 ${PANEL_PADDING}px`;
            this.container.style.justifyContent = 'flex-start';
            this.container.style.alignItems = 'flex-start';
            this.contentArea.style.display = 'none';
        } else {
            // ステータス or フル: コンテンツ表示
            this.container.style.width = 'fit-content';
            this.container.style.minWidth = '220px';
            this.container.style.maxWidth = 'none';
            this.container.style.height = 'auto';
            this.container.style.padding = `${PANEL_PADDING}px`;
            this.container.style.justifyContent = 'flex-start';
            this.container.style.alignItems = 'flex-start';
            this.contentArea.style.display = 'flex';

            // フルモード時のみコントロール表示
            if (this.displayMode === 'full') {
                this.controlsArea.style.display = 'flex';
            } else {
                this.controlsArea.style.display = 'none';
            }
        }
    }

    private updateTextContent(): void {
        // 日時
        if (this.timeText) {
            const formattedTime = this.latestThreadTime
                ? this.formatDate(this.latestThreadTime)
                : '----/--/-- --:--:--';
            this.timeText.textContent = formattedTime;
        }

        // 速度
        if (this.speedText) {
            this.speedText.textContent = `速度: ${this.latestSpeed.toFixed(1)}x`;
        }

        // 再生状態
        if (this.playStateText) {
            const icon = this.latestPaused ? '⏸' : '▶';
            const text = this.latestPaused ? '一時停止中' : '再生中';
            this.playStateText.textContent = `${icon} ${text}`;
        }

        // 再生/一時停止ボタン
        if (this.playPauseButton) {
            this.playPauseButton.textContent = this.latestPaused ? '▶' : '⏸';
        }
    }

    private updateMessageContent(): void {
        if (!this.messageArea) {
            return;
        }

        if (!this.activeMessage) {
            this.messageArea.style.display = 'none';
            return;
        }

        this.messageArea.style.display = 'block';
        this.messageArea.textContent = this.activeMessage.text;

        if (this.activeMessage.isError) {
            this.messageArea.style.background = 'rgba(255, 107, 107, 0.15)';
            this.messageArea.style.color = '#ff6b6b';
        } else {
            this.messageArea.style.background = 'rgba(255, 255, 255, 0.06)';
            this.messageArea.style.color = '#e8eaed';
        }
    }

    private handleDragStart(event: TouchEvent | MouseEvent): void {
        if (!this.container) {
            return;
        }

        if (event instanceof MouseEvent && event.button !== 0) {
            return;
        }

        const target = event.target;
        if (
            target instanceof HTMLButtonElement &&
            !target.matches('[data-role="display-toggle"]')
        ) {
            return;
        }

        const coords = this.getClientCoordinates(event);
        const rect = this.container.getBoundingClientRect();
        this.dragWidth = rect.width;
        this.dragHeight = rect.height;
        this.dragOffsetX = coords.x - rect.left;
        this.dragOffsetY = coords.y - rect.top;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;
        this.pointerDown = true;
        this.isDragging = false;
        this.dragMoved = false;

        this.bindDragListeners();
    }

    private handleDragMove(event: TouchEvent | MouseEvent): void {
        if (!this.pointerDown || !this.container) {
            return;
        }

        const coords = this.getClientCoordinates(event);

        if (!this.isDragging) {
            const deltaX = Math.abs(coords.x - this.dragStartX);
            const deltaY = Math.abs(coords.y - this.dragStartY);
            if (
                deltaX < DRAG_ACTIVATION_THRESHOLD &&
                deltaY < DRAG_ACTIVATION_THRESHOLD
            ) {
                return;
            }
            this.isDragging = true;
            this.updateContainerTransition(false);
            this.container.style.cursor = 'grabbing';
        }

        const width =
            this.dragWidth || this.container.getBoundingClientRect().width || MINIMIZED_SIZE;
        const height =
            this.dragHeight || this.container.getBoundingClientRect().height || MINIMIZED_SIZE;
        const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
        const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);

        let nextX = coords.x - this.dragOffsetX;
        let nextY = coords.y - this.dragOffsetY;
        nextX = Math.min(Math.max(PANEL_MARGIN, nextX), maxLeft);
        nextY = Math.min(Math.max(PANEL_MARGIN, nextY), maxTop);

        if (!this.position) {
            this.position = { x: nextX, y: nextY };
        } else {
            this.position.x = nextX;
            this.position.y = nextY;
        }

        this.dragMoved = true;
        this.schedulePositionApply();
        event.preventDefault();
    }

    private handleDragEnd(): void {
        if (!this.pointerDown && !this.isDragging) {
            return;
        }
        const wasDragging = this.isDragging;
        this.pointerDown = false;
        this.isDragging = false;
        this.detachDragListeners();
        if (wasDragging) {
            this.updateContainerTransition(true);
            if (this.container) {
                this.container.style.cursor = 'grab';
            }
        }
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragWidth = 0;
        this.dragHeight = 0;
    }

    private bindDragListeners(): void {
        this.detachDragListeners();
        this.boundMove = (event) => this.handleDragMove(event);
        this.boundEnd = () => this.handleDragEnd();

        window.addEventListener('touchmove', this.boundMove, { passive: false });
        window.addEventListener('touchend', this.boundEnd);
        window.addEventListener('touchcancel', this.boundEnd);
        window.addEventListener('mousemove', this.boundMove);
        window.addEventListener('mouseup', this.boundEnd);
    }

    private detachDragListeners(): void {
        if (this.boundMove) {
            window.removeEventListener('touchmove', this.boundMove);
            window.removeEventListener('mousemove', this.boundMove);
            this.boundMove = null;
        }
        if (this.boundEnd) {
            window.removeEventListener('touchend', this.boundEnd);
            window.removeEventListener('touchcancel', this.boundEnd);
            window.removeEventListener('mouseup', this.boundEnd);
            this.boundEnd = null;
        }
    }

    private schedulePositionApply(): void {
        if (this.positionFrame !== null) {
            return;
        }
        this.positionFrame = window.requestAnimationFrame(() => {
            this.positionFrame = null;
            this.applyPosition();
        });
    }

    private applyPosition(): void {
        if (!this.container) {
            return;
        }

        const width =
            this.dragWidth || this.container.getBoundingClientRect().width || MINIMIZED_SIZE;
        const height =
            this.dragHeight || this.container.getBoundingClientRect().height || MINIMIZED_SIZE;
        const defaultX = window.innerWidth - width - PANEL_MARGIN;
        const defaultY = window.innerHeight - height - PANEL_MARGIN;

        if (!this.position) {
            this.position = {
                x: Math.max(PANEL_MARGIN, defaultX),
                y: Math.max(PANEL_MARGIN, defaultY),
            };
        } else {
            const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
            const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
            this.position.x = Math.min(Math.max(PANEL_MARGIN, this.position.x), maxLeft);
            this.position.y = Math.min(Math.max(PANEL_MARGIN, this.position.y), maxTop);
        }

        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${this.position.y}px`;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear().toString().padStart(4, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
    }

    private getClientCoordinates(event: TouchEvent | MouseEvent): { x: number; y: number } {
        if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
            const touch = event.touches[0] ?? event.changedTouches[0];
            return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
        }
        const mouseEvent = event as MouseEvent;
        return { x: mouseEvent.clientX, y: mouseEvent.clientY };
    }
}
