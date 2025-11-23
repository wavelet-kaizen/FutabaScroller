export const SELECTORS = {
    threadContainer: 'body .thre',
    responseTimestamp: 'body > div.thre table .cnw',
} as const;

export type SelectorKey = keyof typeof SELECTORS;
