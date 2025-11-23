import { TimelineCalculator } from './domain/timeline';
import { ResponseUpdateManager } from './domain/response_update_manager';
import { mergeThreads } from './dom/merge';
import { resolveStartPosition } from './domain/start_position';
import { InputFormOverlay } from './ui/input_form';
import { LoadingOverlay } from './ui/loading_overlay';
import { ScrollController } from './ui/scroller';
import { ThreadSettings } from './types';

export class UserFacingError extends Error {}

export interface ScriptInstance {
    controller: ScrollController;
    updateManager: ResponseUpdateManager;
}

export async function main(): Promise<ScriptInstance | null> {
    const inputOverlay = new InputFormOverlay();
    const loadingOverlay = new LoadingOverlay();
    let controller: ScrollController | null = null;
    let updateManager: ResponseUpdateManager | null = null;

    try {
        updateManager = new ResponseUpdateManager({
            intervalMs: 10000, // 10秒
            onResponsesAdded: (newResponses) => {
                if (controller) {
                    controller.appendResponses(newResponses);
                }
            },
            onError: (error) => {
                console.error('レス更新エラー:', error);
            },
        });
        updateManager.start();

        const initialResponses = updateManager.getCurrentResponses();
        if (initialResponses.length === 0) {
            updateManager.stop();
            throw new UserFacingError('レスが見つかりませんでした。');
        }

        let settings: ThreadSettings | null = await inputOverlay.prompt(() =>
            updateManager ? updateManager.getCurrentResponses().length : initialResponses.length,
        );
        while (settings) {
            let mergedResponses = updateManager.getCurrentResponses();

            if (settings.additionalThreadUrls.length > 0) {
                try {
                    mergedResponses = await mergeThreads(
                        settings.additionalThreadUrls,
                        loadingOverlay,
                        updateManager,
                    );
                } catch (error) {
                    updateManager.stop();
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'スレッドの取得に失敗しました。';
                    throw new UserFacingError(message);
                }
            }

            if (mergedResponses.length === 0) {
                updateManager.stop();
                throw new UserFacingError('レスが見つかりませんでした。');
            }

            const startResolution = resolveStartPosition(
                settings,
                mergedResponses,
            );
            if (!startResolution.success) {
                settings = await inputOverlay.showWithError(
                    settings,
                    startResolution.error.message,
                    'startValue',
                );
                continue;
            }

            const calculator = new TimelineCalculator();

            // コントローラ生成前に更新されたレスがある可能性があるため、最新を取得
            const latestResponses = updateManager.getCurrentResponses();

            controller = new ScrollController(
                settings.additionalThreadUrls.length > 0
                    ? mergedResponses
                    : latestResponses,
                settings,
                calculator,
                undefined,
                (message) => window.alert(message),
            );

            controller.start({
                startPaused: true,
                startTime: startResolution.value,
            });
            return { controller, updateManager };
        }

        updateManager.stop();
        return null;
    } catch (error) {
        updateManager?.stop();
        if (error instanceof UserFacingError) {
            window.alert(error.message);
            return null;
        }

        console.error('予期しないエラーが発生しました。', error);
        window.alert('エラーが発生しました。コンソールを確認してください。');
        return null;
    }
}
