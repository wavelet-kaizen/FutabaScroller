import { main, ScriptInstance } from './main';

declare global {
    interface Window {
        __FUTABA_SCROLLER__?: ScriptInstance;
    }
}

(function run(): void {
    if (window.__FUTABA_SCROLLER__) {
        window.__FUTABA_SCROLLER__.controller.stop();
        window.__FUTABA_SCROLLER__.updateManager.stop();
    }

    const instance = main();
    if (instance) {
        window.__FUTABA_SCROLLER__ = instance;
    }
})();
