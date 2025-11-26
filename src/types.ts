/** DOM要素参照を含むレスデータ。スクロール制御で使用する。 */
export interface ResponseEntry {
    timestamp: Date;
    element: HTMLElement;
    /** DOM上の出現順（0-indexed） */
    index: number;
    /** 本文のハッシュ値（レス同一性判定用） */
    contentHash: string;
    /** Futafutaのスレ主投稿など、複数ノードで構成されるレスの場合のノード集合（任意） */
    allNodes?: Node[];
}

/** タイムライン計算専用の軽量レスデータ。 */
export interface TimelineResponse {
    timestamp: Date;
    /** DOM上の出現順（0-indexed） */
    index: number;
}

/** ステータスUIの表示モード。 */
export type UiMode = 'auto-hide' | 'persistent';

/** ユーザーが選択した設定値。 */
export interface ThreadSettings {
    /** 再生開始に使用するモード。 */
    startMode: 'index' | 'timestamp' | 'no';
    /**
     * 再生開始の基準値。
     * - startMode=index: レス番号（0-indexed）
     * - startMode=timestamp: タイムスタンプ文字列
     * - startMode=no: DOM上の No. テキスト
     */
    startValue: number | string;
    /** startMode === 'index' の場合に使用するレス番号（0-indexed）。 */
    startResponseIndex: number;
    /** 再生速度倍率 (> 0)。 */
    speedMultiplier: number;
    /** 追加でマージするスレッドのURL一覧。 */
    additionalThreadUrls: string[];
    /** UIの表示モード。 */
    uiMode: UiMode;
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
        | 'SPEED_MULTIPLIER_NOT_FINITE'
        | 'TIMESTAMP_INVALID_FORMAT'
        | 'NO_INVALID_FORMAT'
        | 'URL_INVALID_FORMAT';
    message: string;
    input?: unknown;
}

export type Result<T, E = Error> =
    | { success: true; value: T }
    | { success: false; error: E };

export type StartPositionError =
    | {
          type: 'index_out_of_range';
          message: string;
          validRange: { min: number; max: number };
      }
    | { type: 'no_not_found'; message: string; searchedNo: string }
    | { type: 'timestamp_parse_error'; message: string; inputValue: string };

export type StartPositionResult = Result<Date, StartPositionError>;
