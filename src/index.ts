import { ScrollController } from './ui/scroller';
import { main } from './main';

declare global {
    interface Window {
        __FUTABA_SCROLLER__?: ScrollController;
    }
}

(function run(): void {
    if (window.__FUTABA_SCROLLER__) {
        window.__FUTABA_SCROLLER__.stop();
    }

    const controller = main();
    if (controller) {
        window.__FUTABA_SCROLLER__ = controller;
    }
})();
