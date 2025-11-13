import { captureResponses } from '../dom/capture';
import { ResponseEntry } from '../types';

const DEFAULT_INTERVAL_MS = 10000; // 10秒
const TAIL_COMPARISON_COUNT = 5; // 末尾5件を比較

export interface ResponseUpdateOptions {
    /** 更新間隔（ミリ秒）デフォルト: 10000 */
    intervalMs?: number;
    /** 新規レス追加時のコールバック */
    onResponsesAdded?: (newResponses: ResponseEntry[]) => void;
    /** エラー発生時のコールバック */
    onError?: (error: Error) => void;
}

/**
 * レスの定期更新を管理するクラス
 *
 * タイムスタンプ＋ハッシュで差分を検出し、
 * 新規レスが追加された際にコールバックで通知する
 */
export class ResponseUpdateManager {
    private intervalId: number | null = null;
    private currentResponses: ResponseEntry[] = [];
    private readonly options: Required<ResponseUpdateOptions>;

    constructor(options: ResponseUpdateOptions = {}) {
        this.options = {
            intervalMs: options.intervalMs ?? DEFAULT_INTERVAL_MS,
            onResponsesAdded: options.onResponsesAdded ?? (() => undefined),
            onError: options.onError ?? ((error) => console.error(error)),
        };
    }

    /**
     * 定期更新を開始する
     * 開始時に最新のDOMを取得する
     */
    start(): void {
        if (this.intervalId !== null) {
            console.warn('ResponseUpdateManager is already running');
            return;
        }

        // 初回取得
        try {
            this.currentResponses = captureResponses();
        } catch (error) {
            this.options.onError(
                error instanceof Error
                    ? error
                    : new Error('Failed to capture initial responses'),
            );
            return;
        }

        // 定期更新開始
        this.intervalId = window.setInterval(
            () => this.update(),
            this.options.intervalMs,
        );
    }

    /**
     * 定期更新を停止する
     * 多重呼び出しでも安全
     */
    stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * 現在のレス配列を取得する
     */
    getCurrentResponses(): ResponseEntry[] {
        return [...this.currentResponses];
    }

    /**
     * レスを更新して差分を検出する
     * @private
     */
    private update(): void {
        try {
            const newResponses = captureResponses();
            const added = this.detectAddedResponses(
                this.currentResponses,
                newResponses,
            );

            if (added.length > 0) {
                this.currentResponses = newResponses;
                this.options.onResponsesAdded(added);
            }
        } catch (error) {
            this.options.onError(
                error instanceof Error
                    ? error
                    : new Error('Failed to update responses'),
            );
        }
    }

    /**
     * 新規追加されたレスを検出する
     *
     * アルゴリズム:
     * 1. 長さが増えていなければ追加なし
     * 2. 末尾数件をタイムスタンプ＋ハッシュで照合
     * 3. 一致しない部分を新規追加と判定
     *
     * @param previous 前回のレス配列
     * @param current 今回のレス配列
     * @returns 新規追加されたレス配列
     * @private
     */
    private detectAddedResponses(
        previous: ResponseEntry[],
        current: ResponseEntry[],
    ): ResponseEntry[] {
        // 長さが増えていなければ追加なし
        if (current.length <= previous.length) {
            return [];
        }

        // 前回の末尾数件のハッシュセットを作成
        const tailSize = Math.min(TAIL_COMPARISON_COUNT, previous.length);
        const previousTailHashes = new Set(
            previous
                .slice(-tailSize)
                .map((r) => this.makeIdentifier(r)),
        );

        // 今回の配列から前回の最終レス以降を探す
        const potentialNewStart = Math.max(0, previous.length - tailSize);
        const candidateResponses = current.slice(potentialNewStart);

        // 前回の末尾と一致しない部分を見つける
        let addedStartIndex = -1;
        for (let i = 0; i < candidateResponses.length; i++) {
            const identifier = this.makeIdentifier(candidateResponses[i]);
            if (!previousTailHashes.has(identifier)) {
                // 前回の配列に存在しない = 新規追加の開始位置
                addedStartIndex = potentialNewStart + i;
                break;
            }
        }

        if (addedStartIndex === -1 || addedStartIndex >= current.length) {
            // 一致する部分が見つからない = 単純な末尾追加
            return current.slice(previous.length);
        }

        // 新規追加部分を返す
        // ただし、前回の最後のレスより後ろのみを返す
        const safeStartIndex = Math.max(addedStartIndex, previous.length);
        return current.slice(safeStartIndex);
    }

    /**
     * レスの識別子を生成する（タイムスタンプ + ハッシュ）
     * @private
     */
    private makeIdentifier(response: ResponseEntry): string {
        return `${response.timestamp.getTime()}-${response.contentHash}`;
    }
}
