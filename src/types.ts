/** DOM要素参照を含むレスデータ。スクロール制御で使用する。 */
export interface ResponseEntry {
    timestamp: Date;
    element: HTMLElement;
    /** DOM上の出現順（1-indexed） */
    index: number;
}

/** タイムライン計算専用の軽量レスデータ。 */
export interface TimelineResponse {
    timestamp: Date;
    /** DOM上の出現順（1-indexed） */
    index: number;
}

/** ユーザーが選択した設定値。 */
export interface ThreadSettings {
    /** 再生開始に使用するレス番号（1-indexed）。 */
    startResponseIndex: number;
    /** 再生速度倍率 (> 0)。 */
    speedMultiplier: number;
}

/** 再生中のタイムライン状態。 */
export interface TimelineState {
    /** スレッド内の基準時刻（選択したレスの投稿時刻）。 */
    threadStartTime: Date;
    /** ブックマークレット実行開始時の実時間タイムスタンプ（Date.now()）。 */
    executionStartMs: number;
    /** 再生速度倍率 (> 0)。 */
    speedMultiplier: number;
    /** 倍率変更時点までの累計スレッド時刻。 */
    baselineThreadTime?: Date;
}

export interface ValidationError {
    code:
        | 'RESPONSE_ARRAY_EMPTY'
        | 'RESPONSE_INDEX_OUT_OF_RANGE'
        | 'RESPONSE_INDEX_NOT_INTEGER'
        | 'SPEED_MULTIPLIER_NON_POSITIVE'
        | 'SPEED_MULTIPLIER_NOT_FINITE';
    message: string;
    input?: unknown;
}

export type Result<T, E = Error> =
    | { success: true; value: T }
    | { success: false; error: E };
