/**
 * 文字列の簡易ハッシュ値を計算する（DJB2アルゴリズム）
 * レス同一性判定用の識別子として使用
 */
export function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

/**
 * DOM要素から本文のハッシュ値を計算する
 * タイムスタンプとDOM構造の組み合わせで一意性を確保
 */
export function computeContentHash(
    element: HTMLElement,
    timestamp: Date,
): string {
    const textContent = element.textContent || '';
    const timestampStr = timestamp.toISOString();
    const combined = `${timestampStr}:${textContent.substring(0, 200)}`;
    return simpleHash(combined);
}
