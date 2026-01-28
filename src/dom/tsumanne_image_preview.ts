const TSUMANNE_MARKER_ATTR = 'data-fs-tsumanne';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function stripFragment(href: string): string {
    const hashIndex = href.indexOf('#');
    return hashIndex >= 0 ? href.slice(0, hashIndex) : href;
}

function normalizeForExtension(href: string): string {
    const withoutFragment = stripFragment(href);
    const queryIndex = withoutFragment.indexOf('?');
    const withoutQuery =
        queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;
    return withoutQuery.toLowerCase();
}

function isImageHref(href: string): boolean {
    const normalized = normalizeForExtension(href);
    return IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

function findBlockquotes(nodes: Node[]): HTMLElement[] {
    const results = new Set<HTMLElement>();
    nodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        if (node.matches('blockquote')) {
            results.add(node);
        }
        node.querySelectorAll<HTMLElement>('blockquote').forEach((quote) => {
            results.add(quote);
        });
    });
    return Array.from(results);
}

function hasExistingImage(blockquote: HTMLElement): boolean {
    return blockquote.querySelector('img') !== null;
}

function resolveImageSrc(href: string): string {
    return stripFragment(href);
}

function shouldSkipAnchor(anchor: HTMLAnchorElement): boolean {
    return anchor.closest('#attachment') !== null;
}

function insertPreviewAfterLink(anchor: HTMLAnchorElement, src: string): void {
    const doc = anchor.ownerDocument ?? document;
    const br = doc.createElement('br');
    const img = doc.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    img.style.maxWidth = '250px';
    img.style.height = 'auto';
    anchor.insertAdjacentElement('afterend', br);
    br.insertAdjacentElement('afterend', img);
}

export function markTsumanneNodes(nodes: Node[]): void {
    nodes.forEach((node) => {
        if (node instanceof HTMLElement) {
            node.setAttribute(TSUMANNE_MARKER_ATTR, '1');
        }
    });
}

export function isTsumanneNodeGroup(nodes: Node[]): boolean {
    return nodes.some((node) => {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        if (node.hasAttribute(TSUMANNE_MARKER_ATTR)) {
            return true;
        }
        return node.querySelector(`[${TSUMANNE_MARKER_ATTR}]`) !== null;
    });
}

export function applyTsumanneImagePreviewsToGroup(nodes: Node[]): void {
    const blockquotes = findBlockquotes(nodes);
    blockquotes.forEach((blockquote) => {
        if (blockquote.closest('#attachment')) {
            return;
        }
        if (hasExistingImage(blockquote)) {
            return;
        }
        const anchors = Array.from(
            blockquote.querySelectorAll<HTMLAnchorElement>('a[href]'),
        );
        anchors.forEach((anchor) => {
            if (shouldSkipAnchor(anchor)) {
                return;
            }
            const href = anchor.getAttribute('href') ?? '';
            if (!href || !isImageHref(href)) {
                return;
            }
            insertPreviewAfterLink(anchor, resolveImageSrc(href));
        });
    });
}

export function applyTsumanneImagePreviewsToGroups(
    groups: Node[][],
    isTsumanneDocument: boolean,
): void {
    const hasMarkers = groups.some((nodes) => isTsumanneNodeGroup(nodes));
    const shouldMarkAll = isTsumanneDocument && !hasMarkers;

    if (shouldMarkAll) {
        groups.forEach((nodes) => markTsumanneNodes(nodes));
    }

    groups.forEach((nodes) => {
        if (shouldMarkAll || isTsumanneNodeGroup(nodes)) {
            applyTsumanneImagePreviewsToGroup(nodes);
        }
    });
}
