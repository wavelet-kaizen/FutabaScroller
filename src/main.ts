import { TimelineCalculator } from './domain/timeline';
import { ResponseUpdateManager } from './domain/response_update_manager';
import { promptUserForSettings } from './ui/prompt';
import { ScrollController } from './ui/scroller';

export class UserFacingError extends Error {}

export interface ScriptInstance {
    controller: ScrollController;
    updateManager: ResponseUpdateManager;
}

export function main(): ScriptInstance | null {
    try {
        // まず空の更新マネージャーを作成して初回取得
        let controller: ScrollController | null = null;

        const updateManager = new ResponseUpdateManager({
            intervalMs: 10000, // 10秒
            onResponsesAdded: (newResponses) => {
                console.log(`新規レス ${newResponses.length} 件を検出`);
                if (controller) {
                    controller.appendResponses(newResponses);
                }
            },
            onError: (error) => {
                console.error('レス更新エラー:', error);
            },
        });
        updateManager.start();

        const responses = updateManager.getCurrentResponses();
        if (responses.length === 0) {
            updateManager.stop();
            throw new UserFacingError('レスが見つかりませんでした。');
        }

        const settings = promptUserForSettings(responses.length);
        if (!settings) {
            updateManager.stop();
            return null;
        }

        const calculator = new TimelineCalculator();

        // コントローラ生成前に更新されたレスがある可能性があるため、最新を取得
        const latestResponses = updateManager.getCurrentResponses();

        controller = new ScrollController(
            latestResponses,
            settings,
            calculator,
            undefined,
            (message) => window.alert(message),
        );

        controller.start();
        return { controller, updateManager };
    } catch (error) {
        if (error instanceof UserFacingError) {
            window.alert(error.message);
            return null;
        }

        console.error('予期しないエラーが発生しました。', error);
        window.alert('エラーが発生しました。コンソールを確認してください。');
        return null;
    }
}
