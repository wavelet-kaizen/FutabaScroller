import { cloneNodeGroup, groupThreadResponses } from './response_nodes';

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

export async function fetchThreadHtml(url: string): Promise<Document> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`スレッド ${url} を取得できませんでした (status: ${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    const encoding = detectEncoding(buffer, response.headers.get('content-type'));
    let html: string;
    try {
        html = new TextDecoder(encoding).decode(buffer);
    } catch {
        html = new TextDecoder('utf-8').decode(buffer);
    }
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
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
): ResponseNodeGroup[] {
    switch (format) {
        case 'futaba':
            return extractFutabaResponses(doc);
        case 'futaclo':
            return extractFutacloResponses(doc);
        case 'tsumanne':
            return extractTsumanneResponses(doc);
        case 'futafuta':
            return extractFutafutaResponses(doc);
        default:
            return [];
    }
}

function extractFutabaResponses(doc: Document): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => cloneNodeGroup(group));
}

function extractFutacloResponses(doc: Document): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => cloneNodeGroup(group));
}

function extractTsumanneResponses(doc: Document): ResponseNodeGroup[] {
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
        cloned.forEach((node) => {
            if (node instanceof HTMLElement) {
                normalizeTsumanneTimestamp(node);
            }
        });
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

function extractFutafutaResponses(doc: Document): ResponseNodeGroup[] {
    const container = doc.querySelector('.thre');
    if (!container) {
        return [];
    }
    const groups = groupThreadResponses(container);
    return groups.map((group) => cloneNodeGroup(group));
}
