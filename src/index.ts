import { main, ScriptInstance } from './main';

declare global {
    interface Window {
        __FUTABA_SCROLLER__?: ScriptInstance;
    }
}

(async function run(): Promise<void> {
    if (window.__FUTABA_SCROLLER__) {
        window.__FUTABA_SCROLLER__.controller.stop();
        window.__FUTABA_SCROLLER__.updateManager.stop();
    }

    const instance = await main();
    if (instance) {
        window.__FUTABA_SCROLLER__ = instance;
    }
})().catch((error: unknown) => {
    console.error('FutabaScroller起動エラー:', error);
});
