import { parseTimestamp } from '../parsers/timestamp';
import { ResponseEntry } from '../types';
import { computeContentHash, simpleHash } from '../utils/hash';
import {
    findElementInNodes,
    findThreadContainer,
    groupThreadResponses,
} from './response_nodes';

export function captureResponses(doc: Document = document): ResponseEntry[] {
    const container = findThreadContainer(doc);
    if (!container) {
        console.warn('スレッドコンテナが見つかりません');
        return [];
    }

    const groups = groupThreadResponses(container);
    const responses: ResponseEntry[] = [];

    groups.forEach((nodes, idx) => {
        const rawTimestampText = findElementInNodes(nodes, '.cnw')?.textContent;
        const timestampText = rawTimestampText
            ? normalizeTimestampText(rawTimestampText)
            : null;
        if (!timestampText) {
            console.warn(`レス#${idx + 1}: タイムスタンプが空です`);
            return;
        }

        const timestamp = parseTimestamp(timestampText);
        if (!timestamp) {
            console.warn(
                `レス#${idx + 1}: タイムスタンプ解析に失敗: "${timestampText}"`,
            );
            return;
        }

        const anchor = findAnchorElement(nodes);
        if (!anchor) {
            console.warn(`レス#${idx + 1}: アンカー要素が見つかりません`);
            return;
        }

        responses.push({
            timestamp,
            element: anchor,
            index: idx + 1,
            contentHash: computeGroupHash(nodes, timestamp, anchor),
            allNodes: nodes,
        });
    });

    return responses;
}

function findAnchorElement(nodes: Node[]): HTMLElement | null {
    for (const node of nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            return node as HTMLElement;
        }
    }
    const fallback = findElementInNodes(nodes, '.cnw, .cno');
    return fallback ? (fallback as HTMLElement) : null;
}

function computeGroupHash(
    nodes: Node[],
    timestamp: Date,
    anchor: HTMLElement,
): string {
    if (nodes.length === 1 && nodes[0] instanceof HTMLElement) {
        return computeContentHash(anchor, timestamp);
    }
    const combinedText = buildGroupText(nodes);
    const timestampStr = timestamp.toISOString();
    return simpleHash(`${timestampStr}:${combinedText}`);
}

function buildGroupText(nodes: Node[]): string {
    const texts = nodes
        .map((node) => node.textContent ?? '')
        .join('|')
        .slice(0, 200);
    return texts;
}

function normalizeTimestampText(text: string): string {
    const trimmed = text.trim();
    if (trimmed.includes('ID:')) {
        return trimmed.split('ID:')[0].trim();
    }
    return trimmed;
}
