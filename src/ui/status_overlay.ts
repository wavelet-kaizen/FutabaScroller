const DEFAULT_STATUS_TEXT = '[再生中] ----/--/-- --:--:-- | 0.0x';
const OVERLAY_BOTTOM_OFFSET = '24px';
const OVERLAY_LEFT_OFFSET = '12px';
const STATUS_VISIBILITY_MS = 5000;

export class StatusOverlay {
    private container: HTMLDivElement | null = null;
    private hasWarnedAboutBody = false;
    private hideTimeoutId: number | null = null;
    private latestThreadTime: Date | null = null;
    private latestSpeed = 0;
    private latestPaused = false;

    updateState(threadTime: Date | null, speed: number, paused: boolean): void {
        this.latestThreadTime = threadTime;
        this.latestSpeed = speed;
        this.latestPaused = paused;

        const container = this.ensureContainer();
        if (!container) {
            return;
        }

        container.textContent = this.composeStatusText();
    }

    showTemporarily(): void {
        const container = this.ensureContainer();
        if (!container) {
            return;
        }

        container.textContent = this.composeStatusText();
        container.style.display = 'block';

        this.clearHideTimer();
        this.hideTimeoutId = window.setTimeout(() => {
            container.style.display = 'none';
            this.hideTimeoutId = null;
        }, STATUS_VISIBILITY_MS);
    }

    showMessage(text: string): void {
        const container = this.ensureContainer();
        if (!container) {
            return;
        }

        container.textContent = text;
        container.style.display = 'block';

        this.clearHideTimer();
        this.hideTimeoutId = window.setTimeout(() => {
            container.style.display = 'none';
            this.hideTimeoutId = null;
        }, STATUS_VISIBILITY_MS);
    }

    destroy(): void {
        this.clearHideTimer();
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.latestThreadTime = null;
        this.hasWarnedAboutBody = false;
    }

    private ensureContainer(): HTMLDivElement | null {
        if (!document.body) {
            if (!this.hasWarnedAboutBody) {
                console.warn('document.body が見つかりません');
                this.hasWarnedAboutBody = true;
            }
            return null;
        }

        if (!this.container) {
            this.container = this.createContainer();
            document.body.appendChild(this.container);
        }

        this.hasWarnedAboutBody = false;
        return this.container;
    }

    private createContainer(): HTMLDivElement {
        const div = document.createElement('div');
        div.dataset.role = 'status-overlay';
        div.style.position = 'fixed';
        div.style.bottom = OVERLAY_BOTTOM_OFFSET;
        div.style.left = OVERLAY_LEFT_OFFSET;
        div.style.padding = '8px 12px';
        div.style.background = 'rgba(0, 0, 0, 0.7)';
        div.style.color = '#fff';
        div.style.fontSize = '14px';
        div.style.fontFamily = 'sans-serif';
        div.style.borderRadius = '4px';
        div.style.zIndex = '9999';
        div.style.pointerEvents = 'none';
        div.style.display = 'none';
        div.textContent = DEFAULT_STATUS_TEXT;
        return div;
    }

    private composeStatusText(): string {
        const status = this.latestPaused ? '一時停止中' : '再生中';
        const formattedTime = this.latestThreadTime
            ? this.formatDate(this.latestThreadTime)
            : '----/--/-- --:--:--';
        return `[${status}] ${formattedTime} | ${this.latestSpeed.toFixed(1)}x`;
    }

    private clearHideTimer(): void {
        if (this.hideTimeoutId !== null) {
            window.clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
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
}
