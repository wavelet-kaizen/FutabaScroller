import { ResponseUpdateManager } from '../domain/response_update_manager';
import { ResponseEntry } from '../types';
import { captureResponses } from './capture';
import { LoadingOverlay } from '../ui/loading_overlay';
import {
    detectLogFormat,
    extractResponses,
    fetchThreadHtml,
    ResponseNodeGroup,
} from './thread_fetcher';
import {
    findElementInNodes,
    findThreadContainer,
    groupThreadResponses,
} from './response_nodes';

interface ResponseElement {
    nodes: ResponseNodeGroup;
    no: number | null;
}

export async function mergeThreads(
    urls: string[],
    loadingOverlay: LoadingOverlay,
    updateManager: ResponseUpdateManager,
): Promise<ResponseEntry[]> {
    if (urls.length === 0) {
        return updateManager.getCurrentResponses();
    }

    const wasRunning = updateManager.isRunning();
    updateManager.stop();

    loadingOverlay.show(urls.length);

    try {
        const fetchedElements = await fetchAllResponses(urls, loadingOverlay);
        mergeIntoDom(fetchedElements);
        const mergedResponses = captureResponses();
        if (wasRunning) {
            updateManager.start();
        }
        loadingOverlay.hide();
        return mergedResponses;
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'スレッド取得中にエラーが発生しました。';
        loadingOverlay.showError(message);
        loadingOverlay.hide();
        loadingOverlay.destroy();
        if (wasRunning) {
            updateManager.start();
        }
        throw error instanceof Error ? error : new Error(message);
    }
}

async function fetchAllResponses(
    urls: string[],
    loadingOverlay: LoadingOverlay,
): Promise<ResponseNodeGroup[]> {
    const results: ResponseNodeGroup[] = [];

    for (let index = 0; index < urls.length; index += 1) {
        const url = urls[index];
        const doc = await fetchThreadHtml(url);
        const format = detectLogFormat(doc);
        const responses = extractResponses(doc, format);
        results.push(...responses);
        loadingOverlay.updateProgress(index + 1, urls.length);
    }

    return results;
}

function mergeIntoDom(newResponses: ResponseNodeGroup[]): void {
    const container = findThreadContainer(document);
    if (!container) {
        throw new Error('スレッドコンテナが見つかりません。');
    }

    const existingGroups = groupThreadResponses(container);
    const seenNos = new Set<number>();
    const combined: ResponseElement[] = [];

    existingGroups.forEach((nodes) => {
        const no = extractNoFromNodes(nodes);
        if (no !== null) {
            seenNos.add(no);
        }
        combined.push({ nodes, no });
    });

    newResponses.forEach((response) => {
        const no = extractNoFromNodes(response);
        if (no !== null && seenNos.has(no)) {
            return;
        }
        if (no !== null) {
            seenNos.add(no);
        }
        combined.push({ nodes: response, no });
    });

    combined.sort((a, b) => {
        if (a.no === null && b.no === null) {
            return 0;
        }
        if (a.no === null) {
            return 1;
        }
        if (b.no === null) {
        return -1;
        }
        return a.no - b.no;
    });

    let nextResNumber = 0;
    combined.forEach((item) => {
        const currentResNo = extractResNo(item.nodes);
        const currentRsc = extractRscNumber(item.nodes);
        if (currentResNo !== null) {
            nextResNumber = currentResNo;
            return;
        }
        if (currentRsc !== null) {
            nextResNumber = currentRsc;
            injectResNo(item.nodes, currentRsc, true);
            return;
        }
        nextResNumber += 1;
        injectResNo(item.nodes, nextResNumber);
    });

    const sortedNodes = combined.flatMap((item) => item.nodes);
    container.replaceChildren(...sortedNodes);
}

function extractNoFromNodes(nodes: Node[]): number | null {
    const target = findElementInNodes(nodes, '.cno');
    const text = target?.textContent ?? '';
    const match = text.match(/No\.(\d+)/);
    if (!match) {
        return null;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
}

function extractResNo(nodes: Node[]): number | null {
    const target = findElementInNodes(nodes, '.res_no');
    if (!target) {
        return null;
    }
    const text = target.textContent ?? '';
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? null : value;
}

function extractRscNumber(nodes: Node[]): number | null {
    const target = findElementInNodes(nodes, '.rsc');
    if (!target) {
        return null;
    }
    const text = target.textContent ?? '';
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? null : value;
}

function injectResNo(nodes: Node[], value: number, hidden = false): void {
    const span = document.createElement('span');
    span.className = 'res_no';
    span.textContent = String(value);
    if (hidden) {
        span.style.display = 'none';
    }

    const rtd = findElementInNodes(nodes, '.rtd');
    if (rtd) {
        rtd.insertBefore(span, rtd.firstChild);
        return;
    }

    const anchor =
        findElementInNodes(nodes, '.cnw') ??
        findElementInNodes(nodes, '.cno');
    if (anchor && anchor.parentElement) {
        anchor.parentElement.insertBefore(span, anchor);
        return;
    }

    if (nodes.length > 0 && nodes[0] instanceof Element) {
        nodes[0].insertBefore(span, nodes[0].firstChild);
        return;
    }

    if (nodes.length > 0 && nodes[0].nodeType === Node.TEXT_NODE) {
        nodes.splice(1, 0, span);
        return;
    }

    nodes.unshift(span);
}
