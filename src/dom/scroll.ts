export function scrollResponseIntoView(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
