const DISPLAY_DURATION_MS = 2000;

export class SpeedOverlay {
    private container: HTMLDivElement | null = null;
    private hideTimer: number | null = null;

    show(multiplier: number): void {
        if (!this.container) {
            if (!document.body) {
                console.warn('document.body が見つかりません。');
                return;
            }
            this.container = this.createContainer();
            document.body.appendChild(this.container);
        }

        this.container.textContent = `倍速: ${multiplier.toFixed(1)}x`;
        this.container.style.display = 'block';

        if (this.hideTimer !== null) {
            window.clearTimeout(this.hideTimer);
        }

        this.hideTimer = window.setTimeout(() => {
            this.hideTimer = null;
            this.hide();
        }, DISPLAY_DURATION_MS);
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    destroy(): void {
        if (this.hideTimer !== null) {
            window.clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    private createContainer(): HTMLDivElement {
        const div = document.createElement('div');
        div.dataset.role = 'speed-overlay';
        div.style.position = 'fixed';
        div.style.top = '12px';
        div.style.left = '12px';
        div.style.padding = '8px 12px';
        div.style.background = 'rgba(0, 0, 0, 0.7)';
        div.style.color = '#fff';
        div.style.fontSize = '14px';
        div.style.fontFamily = 'sans-serif';
        div.style.borderRadius = '4px';
        div.style.zIndex = '9999';
        div.style.display = 'none';
        div.style.pointerEvents = 'none';
        return div;
    }
}
