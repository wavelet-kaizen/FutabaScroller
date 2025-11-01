import { TimelineCalculator } from './domain/timeline';
import { captureResponses } from './dom/capture';
import { promptUserForSettings } from './ui/prompt';
import { ScrollController } from './ui/scroller';

export class UserFacingError extends Error {}

export function main(): ScrollController | null {
    try {
        const responses = captureResponses();
        if (responses.length === 0) {
            throw new UserFacingError('レスが見つかりませんでした。');
        }

        const settings = promptUserForSettings(responses.length);
        if (!settings) {
            return null;
        }

        const calculator = new TimelineCalculator();
        const controller = new ScrollController(
            responses,
            settings,
            calculator,
            undefined,
            (message) => window.alert(message),
        );
        controller.start();
        return controller;
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
