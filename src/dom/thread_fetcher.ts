import { cloneNodeGroup, groupThreadResponses } from './response_nodes';
import {
    applyTsumanneImagePreviewsToGroup,
    markTsumanneNodes,
} from './tsumanne_image_preview';

export type LogFormat = 'futaba' | 'futaclo' | 'tsumanne' | 'futafuta';
export type ResponseNodeGroup = Node[];

function normalizeEncoding(charset: string | null): string {
    if (!charset) {
        return 'utf-8';
    }
    const lower = charset.trim().toLowerCase();
    if (
        lower === 'shift_jis' ||
        lower === 'shift-jis' ||
        lower === 'x-sjis' ||
        lower === 'x-shift-jis' ||
        lower === 'windows-31j'
    ) {
        return 'shift_jis';
    }
    return lower || 'utf-8';
}

function sniffCharsetFromHtml(htmlSnippet: string): string | null {
    const metaCharset = htmlSnippet.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i);
    if (metaCharset?.[1]) {
        return metaCharset[1];
    }
    const httpEquiv = htmlSnippet.match(
        /<meta[^>]+http-equiv=["']?content-type["']?[^>]*content=["'][^"']*charset=([^"'>\s]+)/i,
    );
    return httpEquiv?.[1] ?? null;
}

function detectEncoding(buffer: ArrayBuffer, contentType: string | null): string {
    const charsetFromHeader =
        contentType?.match(/charset=([^;]+)/i)?.[1] ?? null;
    if (charsetFromHeader) {
        return normalizeEncoding(charsetFromHeader);
    }

    const probeLength = Math.min(buffer.byteLength, 4096);
    const probeText = new TextDecoder('utf-8', { fatal: false }).decode(
        new Uint8Array(buffer, 0, probeLength),
    );
    const charsetFromMeta = sniffCharsetFromHtml(probeText);
    if (charsetFromMeta) {
        return normalizeEncoding(charsetFromMeta);
    }

    return 'utf-8';
}

export async function fetchThreadHtml(
    url: string,
): Promise<{ doc: Document; finalUrl: string }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`スレッド ${url} を取得できませんでした (status: ${response.status})`);
    }
    const finalUrl = response.url;
    const buffer = await response.arrayBuffer();
    const encoding = detectEncoding(buffer, response.headers.get('content-type'));
    let html: string;
    try {
        html = new TextDecoder(encoding).decode(buffer);
    } catch {
        html = new TextDecoder('utf-8').decode(buffer);
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return { doc, finalUrl };
}

const URL_ATTRIBUTES: { selector: string; attr: string }[] = [
    { selector: 'a[href]', attr: 'href' },
    { selector: 'img[src]', attr: 'src' },
    { selector: 'video[src]', attr: 'src' },
    { selector: 'video[poster]', attr: 'poster' },
    { selector: 'audio[src]', attr: 'src' },
    { selector: 'source[src]', attr: 'src' },
    { selector: 'area[href]', attr: 'href' },
    { selector: 'object[data]', attr: 'data' },
];

export function convertRelativeUrls(
    nodes: Node[],
    baseUrl: string,
): void {
    for (const node of nodes) {
        if (!(node instanceof Element)) {
            continue;
        }
        for (const { selector, attr } of URL_ATTRIBUTES) {
            if (node.matches(selector)) {
                resolveAttribute(node, attr, baseUrl);
            }
            for (const el of node.querySelectorAll(selector)) {
                resolveAttribute(el, attr, baseUrl);
            }
        }
    }
}

function resolveAttribute(
    element: Element,
    attr: string,
    baseUrl: string,
): void {
    const value = element.getAttribute(attr);
    if (!value) {
        return;
    }
    if (value.startsWith('#') || value.startsWith('data:')) {
        return;
    }
    try {
        const resolved = new URL(value, baseUrl);
        if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
            element.setAttribute(attr, resolved.href);
        }
    } catch {
        // 不正なURLはそのまま保持
    }
}

export function detectLogFormat(doc: Document): LogFormat {
    const titleText = doc.querySelector('title')?.textContent ?? '';
    if (titleText.toLowerCase().includes('futafuta')) {
        return 'futafuta';
    }

    const hasTsumanneScript = Array.from(
        doc.querySelectorAll<HTMLScriptElement>('script[src]'),
    ).some((script) => script.getAttribute('src')?.includes('tsumanne.net'));
    if (hasTsumanneScript) {
        return 'tsumanne';
    }

    const hasIdInTimestamp = Array.from(
        doc.querySelectorAll<HTMLElement>('.cnw'),
    ).some((node) => node.textContent?.includes('ID:'));
    if (hasIdInTimestamp) {
        return 'tsumanne';
    }

    const hasFutacloWrapper = doc.querySelector('.thre > div > table');
    if (hasFutacloWrapper) {
        return 'futaclo';
    }

    return 'futaba';
}

export function extractResponses(
    doc: Document,
    format: LogFormat,
    baseUrl: string,
): ResponseNodeGroup[] {
    switch (format) {
        case 'futaba':
            return extractFutabaResponses(doc, baseUrl);
        case 'futaclo':
            return extractFutacloResponses(doc, baseUrl);
        case 'tsumanne':
            return extractTsumanneResponses(doc, baseUrl);
        case 'futafuta':
            return extractFutafutaResponses(doc, baseUrl);
        default:
            return [];
    }
}

function extractFutabaResponses(
    doc: Document,
    baseUrl: string,
): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => {
        const cloned = cloneNodeGroup(group);
        convertRelativeUrls(cloned, baseUrl);
        return cloned;
    });
}

function extractFutacloResponses(
    doc: Document,
    baseUrl: string,
): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => {
        const cloned = cloneNodeGroup(group);
        convertRelativeUrls(cloned, baseUrl);
        return cloned;
    });
}

function extractTsumanneResponses(
    doc: Document,
    baseUrl: string,
): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container).filter((nodes) => {
        const table = nodes.find(
            (node) => node instanceof HTMLElement && node.tagName === 'TABLE',
        );
        return !(table instanceof HTMLElement && table.classList.contains('deleted'));
    });
    const normalized = groups.map((group) => {
        const cloned = cloneNodeGroup(group);
        convertRelativeUrls(cloned, baseUrl);
        cloned.forEach((node) => {
            if (node instanceof HTMLElement) {
                normalizeTsumanneTimestamp(node);
            }
        });
        markTsumanneNodes(cloned);
        applyTsumanneImagePreviewsToGroup(cloned);
        return cloned;
    });
    return normalized;
}

function normalizeTsumanneTimestamp(element: HTMLElement): void {
    const timestampNodes = element.querySelectorAll<HTMLElement>('.cnw');
    timestampNodes.forEach((node) => {
        const text = node.textContent ?? '';
        if (!text.includes('ID:')) {
            return;
        }
        const trimmed = text.split('ID:')[0].trim();
        node.textContent = trimmed;
    });
}

function extractFutafutaResponses(
    doc: Document,
    baseUrl: string,
): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => {
        const cloned = cloneNodeGroup(group);
        convertRelativeUrls(cloned, baseUrl);
        return cloned;
    });
}
