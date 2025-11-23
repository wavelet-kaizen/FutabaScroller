const OVERLAY_Z_INDEX = 10001;
const SPINNER_SIZE = 32;
const SPIN_ANIMATION_NAME = 'fs-loading-spin';

let stylesInjected = false;

export class LoadingOverlay {
    private container: HTMLDivElement | null = null;
    private messageElement: HTMLDivElement | null = null;
    private errorElement: HTMLDivElement | null = null;
    private totalCount = 0;
    private currentCount = 0;

    show(totalCount: number): void {
        this.totalCount = totalCount;
        this.currentCount = 0;
        this.ensureStyles();

        if (!document.body) {
            console.warn('document.body が見つかりません。');
            return;
        }

        if (!this.container) {
            this.container = this.createContainer();
            document.body.appendChild(this.container);
        }

        this.updateMessage();
        this.container.style.display = 'flex';
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    destroy(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.messageElement = null;
        this.errorElement = null;
        this.totalCount = 0;
        this.currentCount = 0;
    }

    updateProgress(current: number, total?: number): void {
        if (Number.isFinite(total)) {
            this.totalCount = total as number;
        }
        this.currentCount = current;
        this.updateMessage();
    }

    showError(message: string): void {
        if (!this.container) {
            this.show(this.totalCount || 0);
        }
        if (this.container) {
            this.container.style.display = 'flex';
        }
        if (!this.errorElement) {
            return;
        }
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
    }

    private updateMessage(): void {
        if (!this.messageElement) {
            return;
        }
        const progressText =
            this.totalCount > 1 ? ` (${this.currentCount}/${this.totalCount})` : '';
        this.messageElement.textContent = `スレッド取得中...${progressText}`;
    }

    private createContainer(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.dataset.role = 'loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.display = 'none';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = String(OVERLAY_Z_INDEX);

        const card = document.createElement('div');
        card.style.background = '#222';
        card.style.color = '#fff';
        card.style.padding = '20px';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.gap = '12px';
        card.style.fontFamily = 'sans-serif';

        const spinner = document.createElement('div');
        spinner.dataset.role = 'loading-spinner';
        spinner.style.width = `${SPINNER_SIZE}px`;
        spinner.style.height = `${SPINNER_SIZE}px`;
        spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
        spinner.style.borderTop = '4px solid #5aa0ff';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = `${SPIN_ANIMATION_NAME} 1s linear infinite`;

        const message = document.createElement('div');
        message.dataset.role = 'loading-message';
        message.style.fontSize = '14px';
        message.style.textAlign = 'center';
        message.textContent = 'スレッド取得中...';
        this.messageElement = message;

        const error = document.createElement('div');
        error.dataset.role = 'loading-error';
        error.style.display = 'none';
        error.style.color = '#ff8787';
        error.style.fontSize = '13px';
        error.style.textAlign = 'center';
        error.style.maxWidth = '320px';
        this.errorElement = error;

        card.appendChild(spinner);
        card.appendChild(message);
        card.appendChild(error);
        overlay.appendChild(card);
        return overlay;
    }

    private ensureStyles(): void {
        if (stylesInjected) {
            return;
        }

        if (!document.head) {
            return;
        }

        const style = document.createElement('style');
        style.textContent = `
@keyframes ${SPIN_ANIMATION_NAME} {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}`;
        document.head.appendChild(style);
        stylesInjected = true;
    }
}
