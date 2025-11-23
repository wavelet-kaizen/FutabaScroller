import { validateResponseIndex, validateSpeedMultiplier } from '../domain/validation';
import { ThreadSettings } from '../types';

const INPUT_MESSAGE =
    'レス番号と速度倍率を、カンマ区切りで入力してください。\n例: 123,1.5';
const DEFAULT_INPUT = '1,1';
const MAX_ATTEMPTS = 10;

export function promptUserForSettings(
    responsesCount: number,
    promptFn: (message: string, _default?: string) => string | null = window.prompt,
    alertFn: (message: string) => void = window.alert,
): ThreadSettings | null {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const userInput = promptFn(INPUT_MESSAGE, DEFAULT_INPUT);
        if (userInput === null) {
            alertFn('ブックマークレットをキャンセルしました。');
            return null;
        }

        const [responsePart, speedPart] = userInput.split(',').map((part) => part.trim());
        const responseNumber = Number(responsePart);
        const speedNumber = speedPart ? Number(speedPart) : 1;

        const responseResult = validateResponseIndex(responseNumber, responsesCount);
        if (!responseResult.success) {
            alertFn(responseResult.error.message);
            continue;
        }

        const speedResult = validateSpeedMultiplier(speedNumber);
        if (!speedResult.success) {
            alertFn(speedResult.error.message);
            continue;
        }

        return {
            startMode: 'index',
            startValue: responseResult.value,
            startResponseIndex: responseResult.value,
            speedMultiplier: speedResult.value,
            additionalThreadUrls: [],
        };
    }

    alertFn('入力が繰り返し失敗したため、ブックマークレットを終了します。');
    return null;
}
