import { parseTimestamp } from '../parsers/timestamp';
import { ResponseEntry } from '../types';
import { SELECTORS } from './selectors';

export function captureResponses(doc: Document = document): ResponseEntry[] {
    const timestampNodes = doc.querySelectorAll(SELECTORS.responseTimestamp);
    const responses: ResponseEntry[] = [];

    timestampNodes.forEach((node, idx) => {
        const text = node.textContent?.trim();
        if (!text) {
            console.warn(`レス#${idx + 1}: タイムスタンプが空です`);
            return;
        }

        const timestamp = parseTimestamp(text);
        if (!timestamp) {
            console.warn(`レス#${idx + 1}: タイムスタンプ解析に失敗: "${text}"`);
            return;
        }

        const container = node.closest('table');
        if (!container || !(container instanceof HTMLElement)) {
            console.warn(`レス#${idx + 1}: table要素が見つかりません`);
            return;
        }

        responses.push({
            timestamp,
            element: container,
            index: idx + 1,
        });
    });

    return responses;
}
