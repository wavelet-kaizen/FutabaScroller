import { SELECTORS } from './selectors';

function asElement(node: Node | null | undefined): Element | null {
    if (!node) {
        return null;
    }
    return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
}

function isTableLikeNode(node: Node): boolean {
    const element = asElement(node);
    if (!element) {
        return false;
    }
    if (element.tagName === 'TABLE') {
        return true;
    }
    return element.tagName === 'DIV' && element.querySelector('table') !== null;
}

function hasMetadata(nodes: Node[]): boolean {
    return (
        findElementInNodes(nodes, '.cnw') !== null &&
        findElementInNodes(nodes, '.cno') !== null
    );
}

export function findElementInNodes(
    nodes: Node[],
    selector: string,
): Element | null {
    for (const node of nodes) {
        const element = asElement(node);
        if (!element) continue;

        if (element.matches(selector)) return element;

        const found = element.querySelector(selector);
        if (found) return found;
    }
    return null;
}

export function groupThreadResponses(container: ParentNode): Node[][] {
    const groups: Node[][] = [];
    let pending: Node[] = [];

    const flushPending = () => {
        if (pending.length === 0) {
            return;
        }
        if (hasMetadata(pending)) {
            groups.push(pending);
        }
        pending = [];
    };

    container.childNodes.forEach((node) => {
        if (isTableLikeNode(node)) {
            flushPending();
            if (hasMetadata([node])) {
                groups.push([node]);
            }
            return;
        }

        pending.push(node);
    });

    flushPending();

    return groups;
}

export function cloneNodeGroup(
    nodes: Node[],
    targetDocument: Document = document,
): Node[] {
    return nodes.map((node) => targetDocument.importNode(node, true));
}

export function findThreadContainer(doc: Document): HTMLElement | null {
    const direct = asElement(doc.querySelector(SELECTORS.threadContainer));
    if (direct) return direct as HTMLElement;

    const classMatch = asElement(doc.querySelector('.thre'));
    if (classMatch) return classMatch as HTMLElement;

    const dataRes = asElement(doc.querySelector('[data-res]'));
    if (dataRes) return dataRes as HTMLElement;

    const timestampNode = asElement(doc.querySelector('.cnw'));
    if (timestampNode) {
        const ancestorThre = asElement(timestampNode.closest('.thre'));
        if (ancestorThre) return ancestorThre as HTMLElement;

        const ancestorDiv = asElement(timestampNode.closest('body > div'));
        if (ancestorDiv) return ancestorDiv as HTMLElement;
    }

    return asElement(doc.body) as HTMLElement | null;
}
