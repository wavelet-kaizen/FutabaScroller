import { validateSpeedMultiplier, validateUrl } from '../domain/validation';
import { Result, ThreadSettings } from '../types';

type ErrorField = 'startValue' | 'speedMultiplier' | 'urls';
type FormResult = Result<ThreadSettings, { message: string; field: ErrorField }>;

const OVERLAY_Z_INDEX = 10000;
const CARD_WIDTH = '420px';
const INPUT_BORDER = '1px solid #444';

export class InputFormOverlay {
    private container: HTMLDivElement | null = null;
    private resolveFn: ((settings: ThreadSettings | null) => void) | null = null;
    private lastSettings: ThreadSettings | null = null;

    async prompt(
        getResponsesCount: () => number,
    ): Promise<ThreadSettings | null> {
        // 呼び出し側とシグネチャを合わせるために取得だけ行う（値は保持しない）
        getResponsesCount();
        const initialSettings =
            this.lastSettings ?? this.getDefaultSettings();
        return this.render(initialSettings);
    }

    async showWithError(
        settings: ThreadSettings,
        errorMessage: string,
        errorField: ErrorField,
    ): Promise<ThreadSettings | null> {
        return this.render(settings, { message: errorMessage, field: errorField });
    }

    destroy(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.resolveFn = null;
    }

    private async render(
        initialSettings: ThreadSettings,
        errorInfo?: { message: string; field: ErrorField },
    ): Promise<ThreadSettings | null> {
        this.destroy();

        if (!document.body) {
            return null;
        }

        this.lastSettings = initialSettings;
        const { overlay, form, errorBox } = this.createOverlay(initialSettings);
        document.body.appendChild(overlay);

        if (errorInfo) {
            this.showError(form, errorBox, errorInfo.message, errorInfo.field);
        }

        return new Promise<ThreadSettings | null>((resolve) => {
            this.resolveFn = resolve;
        });
    }

    private getDefaultSettings(): ThreadSettings {
        return {
            startMode: 'index',
            startValue: 0,
            startResponseIndex: 0,
            speedMultiplier: 1,
            additionalThreadUrls: [],
            uiMode: 'persistent',
        };
    }

    private createOverlay(
        initialSettings: ThreadSettings,
    ): {
        overlay: HTMLDivElement;
        form: HTMLFormElement;
        errorBox: HTMLDivElement;
    } {
        const overlay = document.createElement('div');
        overlay.dataset.role = 'input-form-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = String(OVERLAY_Z_INDEX);

        const card = document.createElement('div');
        card.dataset.role = 'input-form-card';
        card.style.background = '#222';
        card.style.color = '#fff';
        card.style.padding = '20px';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
        card.style.width = CARD_WIDTH;
        card.style.fontFamily = 'sans-serif';
        card.style.boxSizing = 'border-box';

        const title = document.createElement('h2');
        title.textContent = 'Futaba Scroller 設定';
        title.style.margin = '0 0 12px';
        title.style.fontSize = '18px';

        const description = document.createElement('p');
        description.textContent = '開始位置、速度、追加スレッドURLを入力してください。';
        description.style.margin = '0 0 16px';
        description.style.fontSize = '13px';
        description.style.color = '#ddd';

        const form = document.createElement('form');
        form.dataset.role = 'input-form';
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '12px';

        const startModeField = this.createStartModeField(
            initialSettings.startMode,
        );
        const startValueField = this.createStartValueField(initialSettings);
        const speedField = this.createSpeedField(initialSettings.speedMultiplier);
        const uiModeField = this.createUiModeField(initialSettings.uiMode);
        const additionalField = this.createAdditionalUrlField(
            initialSettings.additionalThreadUrls,
        );
        const errorBox = this.createErrorBox();
        const actionButtons = this.createActionButtons();

        form.appendChild(startModeField);
        form.appendChild(startValueField);
        form.appendChild(speedField);
        form.appendChild(uiModeField);
        form.appendChild(additionalField);
        form.appendChild(errorBox);
        form.appendChild(actionButtons);

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.resetErrorStyles(form, errorBox);
            const result = this.collectSettings(form);
            if (!result.success) {
                this.showError(
                    form,
                    errorBox,
                    result.error.message,
                    result.error.field,
                );
                return;
            }

            this.lastSettings = result.value;
            this.resolve(result.value);
        });

        const cancelButton = actionButtons.querySelector<HTMLButtonElement>(
            '[data-role="cancel-button"]',
        );
        cancelButton?.addEventListener('click', (event) => {
            event.preventDefault();
            this.resolve(null);
        });

        const startModeRadios = form.querySelectorAll<HTMLInputElement>(
            'input[name="startMode"]',
        );
        const startValueInput =
            form.querySelector<HTMLInputElement>('[data-role="start-value"]');
        startModeRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (!startValueInput) {
                    return;
                }
                startValueInput.value = this.getStartValueDefault(
                    radio.value as ThreadSettings['startMode'],
                );
                startValueInput.placeholder = this.getStartValuePlaceholder(
                    radio.value as ThreadSettings['startMode'],
                );
            });
        });

        overlay.appendChild(card);
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(form);

        this.container = overlay;

        return { overlay, form, errorBox };
    }

    private createStartModeField(
        selected: ThreadSettings['startMode'],
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '6px';

        const label = document.createElement('div');
        label.textContent = '開始位置の指定方法';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '14px';

        const options = document.createElement('div');
        options.style.display = 'flex';
        options.style.gap = '12px';

        const modes: { value: ThreadSettings['startMode']; label: string }[] = [
            { value: 'index', label: 'レス番号' },
            { value: 'timestamp', label: '日時' },
            { value: 'no', label: 'No.' },
        ];

        modes.forEach((mode) => {
            const option = document.createElement('label');
            option.style.display = 'flex';
            option.style.alignItems = 'center';
            option.style.gap = '6px';
            option.style.fontSize = '13px';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'startMode';
            input.value = mode.value;
            input.checked = mode.value === selected;

            option.appendChild(input);
            option.appendChild(document.createTextNode(mode.label));

            options.appendChild(option);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(options);
        return wrapper;
    }

    private createStartValueField(
        initialSettings: ThreadSettings,
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '6px';

        const label = document.createElement('label');
        label.textContent = '開始位置の値';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '14px';

        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.role = 'start-value';
        input.value = this.getStartValueString(initialSettings);
        input.placeholder = this.getStartValuePlaceholder(
            initialSettings.startMode,
        );
        input.style.padding = '8px';
        input.style.borderRadius = '4px';
        input.style.border = INPUT_BORDER;
        input.style.background = '#111';
        input.style.color = '#fff';
        input.style.fontSize = '14px';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    private createSpeedField(initialSpeed: number): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '6px';

        const label = document.createElement('label');
        label.textContent = '速度倍率';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '14px';

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.min = '0.1';
        input.value = String(initialSpeed);
        input.dataset.role = 'speed';
        input.style.padding = '8px';
        input.style.borderRadius = '4px';
        input.style.border = INPUT_BORDER;
        input.style.background = '#111';
        input.style.color = '#fff';
        input.style.fontSize = '14px';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    private createUiModeField(selected: ThreadSettings['uiMode']): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '6px';

        const label = document.createElement('div');
        label.textContent = 'UI表示モード';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '14px';

        const options = document.createElement('div');
        options.style.display = 'flex';
        options.style.gap = '12px';

        const modes: { value: ThreadSettings['uiMode']; label: string }[] = [
            { value: 'auto-hide', label: '自動非表示（従来）' },
            { value: 'persistent', label: '常駐表示（スマホ向け）' },
        ];

        modes.forEach((mode) => {
            const option = document.createElement('label');
            option.style.display = 'flex';
            option.style.alignItems = 'center';
            option.style.gap = '6px';
            option.style.fontSize = '13px';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'uiMode';
            input.value = mode.value;
            input.checked = mode.value === selected;

            option.appendChild(input);
            option.appendChild(document.createTextNode(mode.label));
            options.appendChild(option);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(options);
        return wrapper;
    }

    private createAdditionalUrlField(urls: string[]): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '6px';

        const label = document.createElement('label');
        label.textContent = '追加スレッドURL（改行区切り、任意）';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '14px';

        const textarea = document.createElement('textarea');
        textarea.rows = 4;
        textarea.dataset.role = 'additional-urls';
        textarea.placeholder = 'https://may.2chan.net/b/res/1234567890.htm';
        textarea.value = urls.join('\n');
        textarea.style.padding = '8px';
        textarea.style.borderRadius = '4px';
        textarea.style.border = INPUT_BORDER;
        textarea.style.background = '#111';
        textarea.style.color = '#fff';
        textarea.style.fontSize = '13px';
        textarea.style.resize = 'vertical';

        wrapper.appendChild(label);
        wrapper.appendChild(textarea);
        return wrapper;
    }

    private createErrorBox(): HTMLDivElement {
        const div = document.createElement('div');
        div.dataset.role = 'input-error';
        div.style.display = 'none';
        div.style.background = 'rgba(255, 87, 87, 0.1)';
        div.style.color = '#ff8787';
        div.style.border = '1px solid rgba(255, 87, 87, 0.4)';
        div.style.padding = '8px';
        div.style.borderRadius = '4px';
        div.style.fontSize = '13px';
        return div;
    }

    private createActionButtons(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'flex-end';
        wrapper.style.gap = '12px';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'キャンセル';
        cancelButton.dataset.role = 'cancel-button';
        cancelButton.style.padding = '8px 12px';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.border = '1px solid #555';
        cancelButton.style.background = '#333';
        cancelButton.style.color = '#fff';
        cancelButton.style.cursor = 'pointer';

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = '開始';
        submitButton.dataset.role = 'submit-button';
        submitButton.style.padding = '8px 12px';
        submitButton.style.borderRadius = '4px';
        submitButton.style.border = '1px solid #5aa0ff';
        submitButton.style.background = '#2d6bff';
        submitButton.style.color = '#fff';
        submitButton.style.cursor = 'pointer';

        wrapper.appendChild(cancelButton);
        wrapper.appendChild(submitButton);
        return wrapper;
    }

    private collectSettings(form: HTMLFormElement): FormResult {
        const startModeControl = form.elements.namedItem('startMode');
        let startMode = 'index' as ThreadSettings['startMode'];
        if (startModeControl instanceof RadioNodeList) {
            startMode = (startModeControl.value ||
                'index') as ThreadSettings['startMode'];
        } else if (startModeControl instanceof HTMLInputElement) {
            startMode = (startModeControl.value ||
                'index') as ThreadSettings['startMode'];
        }

        const uiModeControl = form.elements.namedItem('uiMode');
        let uiMode = 'auto-hide' as ThreadSettings['uiMode'];
        if (uiModeControl instanceof RadioNodeList) {
            if (uiModeControl.value === 'persistent') {
                uiMode = 'persistent';
            }
        } else if (uiModeControl instanceof HTMLInputElement) {
            if (uiModeControl.value === 'persistent') {
                uiMode = 'persistent';
            }
        }

        const startValueInput = form.querySelector<HTMLInputElement>(
            '[data-role="start-value"]',
        );
        const speedInput = form.querySelector<HTMLInputElement>(
            '[data-role="speed"]',
        );
        const additionalInput = form.querySelector<HTMLTextAreaElement>(
            '[data-role="additional-urls"]',
        );

        if (!startValueInput || !speedInput || !additionalInput) {
            return {
                success: false,
                error: {
                    message: 'フォーム要素の取得に失敗しました。',
                    field: 'startValue',
                },
            };
        }

        const startValueRaw = startValueInput.value.trim();
        const speedRaw = Number(speedInput.value);
        const additionalUrlsRaw = additionalInput.value;

        const speedResult = validateSpeedMultiplier(speedRaw);
        if (!speedResult.success) {
            return {
                success: false,
                error: {
                    message: speedResult.error.message,
                    field: 'speedMultiplier',
                },
            };
        }

        let startResponseIndex = 0;
        let startValue: number | string = startValueRaw;

        if (startMode === 'index') {
            const numericValue = Number(startValueRaw);
            if (!Number.isInteger(numericValue) || numericValue < 0) {
                return {
                    success: false,
                    error: {
                        message: 'レス番号は0以上の整数で入力してください。',
                        field: 'startValue',
                    },
                };
            }
            startResponseIndex = numericValue;
            startValue = numericValue;
        } else if (startMode === 'timestamp') {
            if (startValueRaw.length === 0) {
                return {
                    success: false,
                    error: {
                        message: '日時を入力してください。',
                        field: 'startValue',
                    },
                };
            }
            startValue = startValueRaw;
        } else if (startMode === 'no') {
            if (startValueRaw.length === 0) {
                return {
                    success: false,
                    error: {
                        message: 'No.を入力してください。',
                        field: 'startValue',
                    },
                };
            }
            startValue = startValueRaw;
        }

        const additionalThreadUrls: string[] = [];
        const candidates = additionalUrlsRaw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        for (const candidate of candidates) {
            const urlResult = validateUrl(candidate);
            if (!urlResult.success) {
                return {
                    success: false,
                    error: {
                        message: urlResult.error.message,
                        field: 'urls',
                    },
                };
            }
            additionalThreadUrls.push(urlResult.value);
        }

        return {
            success: true,
            value: {
                startMode,
                startValue,
                startResponseIndex,
                speedMultiplier: speedResult.value,
                additionalThreadUrls,
                uiMode,
            },
        };
    }

    private showError(
        form: HTMLFormElement,
        container: HTMLDivElement,
        message: string,
        field: ErrorField,
    ): void {
        this.resetErrorStyles(form, container);
        const target = this.getFieldElement(form, field);
        if (target) {
            target.style.border = '1px solid #ff8787';
        }
        container.textContent = message;
        container.style.display = 'block';
    }

    private resetErrorStyles(
        form: HTMLFormElement,
        container: HTMLDivElement,
    ): void {
        container.style.display = 'none';
        container.textContent = '';

        const startValue = this.getFieldElement(form, 'startValue');
        const speed = this.getFieldElement(form, 'speedMultiplier');
        const urls = this.getFieldElement(form, 'urls');

        if (startValue) {
            startValue.style.border = INPUT_BORDER;
        }
        if (speed) {
            speed.style.border = INPUT_BORDER;
        }
        if (urls) {
            urls.style.border = INPUT_BORDER;
        }
    }

    private getFieldElement(
        form: HTMLFormElement,
        field: ErrorField,
    ): HTMLInputElement | HTMLTextAreaElement | null {
        if (field === 'startValue') {
            return form.querySelector<HTMLInputElement>('[data-role="start-value"]');
        }
        if (field === 'speedMultiplier') {
            return form.querySelector<HTMLInputElement>('[data-role="speed"]');
        }
        return form.querySelector<HTMLTextAreaElement>('[data-role="additional-urls"]');
    }

    private resolve(result: ThreadSettings | null): void {
        const handler = this.resolveFn;
        this.resolveFn = null;
        this.destroy();
        handler?.(result);
    }

    private getStartValueDefault(mode: ThreadSettings['startMode']): string {
        if (mode === 'timestamp') {
            return '';
        }
        if (mode === 'no') {
            return 'No.';
        }
        return '0';
    }

    private getStartValuePlaceholder(mode: ThreadSettings['startMode']): string {
        if (mode === 'timestamp') {
            return "25/11/16(日)22:48:03 または 2025/11/16 22:48:03";
        }
        if (mode === 'no') {
            return 'No.1373341055';
        }
        return '0';
    }

    private getStartValueString(settings: ThreadSettings): string {
        if (settings.startMode === 'index') {
            return String(
                typeof settings.startValue === 'number'
                    ? settings.startValue
                    : settings.startResponseIndex ?? 0,
            );
        }
        if (typeof settings.startValue === 'string') {
            return settings.startValue;
        }
        return '';
    }
}
