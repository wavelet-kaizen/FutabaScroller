javascript: (function () {
    // レスのタイムスタンプとその要素を紐付ける配列
    let responses = [];

    // スレッドのスタート時刻と速度倍率を保存する変数
    let threadStartTime = null;
    let speedMultiplier = 1;

    // 実行開始時刻を後で設定
    let startTime = null;

    // 全てのレスを取得して、タイムスタンプをresponsesに保存する関数
    function captureResponses() {
        let responseElements = document.querySelectorAll(
            "body > div.thre table .cnw",
        ); // タイムスタンプが含まれる要素を指定
        console.log(responseElements.length + "件のレスが見つかりました");

        responseElements.forEach(function (el, index) {
            let timeText = el.innerText; // タイムスタンプのテキストを取得
            let timestamp = parseTimestamp(timeText);
            if (timestamp) {
                // タイムスタンプが正しくパースできた場合のみ追加
                responses.push({
                    timestamp: timestamp,
                    element: el.closest("table"), // タイムスタンプに関連するレス全体を取得
                });
                console.log(
                    "レス " + (index + 1) + ": タイムスタンプ = ",
                    timestamp.toLocaleString(),
                );
            } else {
                console.warn(
                    "レス " +
                        (index + 1) +
                        ": タイムスタンプのパースに失敗しました",
                    timeText,
                );
            }
        });

        // レスが古い順にソート
        responses.sort((a, b) => a.timestamp - b.timestamp);
        console.log(
            "キャプチャが完了しました。合計",
            responses.length,
            "件のレスが登録されました。",
        );
    }

    // タイムスタンプをパースしてDateオブジェクトに変換する関数
    function parseTimestamp(text) {
        let datePattern =
            /(\d{2})\/(\d{2})\/(\d{2})\(.\)(\d{2}):(\d{2}):(\d{2})/;
        let match = text.match(datePattern);
        if (match) {
            let year = "20" + match[1];
            let month = match[2] - 1; // 月は0ベース
            let day = match[3];
            let hour = match[4];
            let minute = match[5];
            let second = match[6];
            return new Date(year, month, day, hour, minute, second);
        }
        return null;
    }

    // ユーザーにレス番号と速度倍率を入力してもらい、スレッドのスタート時刻と倍率を設定する関数
    function promptUserForSettings() {
        let userInput = prompt(
            "レス番号と速度倍率を入力してください。\n形式: レス番号,倍率（例: 123,1.5）",
            "123,1",
        );
        if (userInput === null) {
            alert("ブックマークレットがキャンセルされました。");
            return false;
        }

        let parts = userInput.split(",");
        if (parts.length < 1) {
            alert("入力形式が正しくありません。例: 123,1.5");
            return false;
        }

        let responseNumber = parseInt(parts[0].trim(), 10);
        if (
            isNaN(responseNumber) ||
            responseNumber < 1 ||
            responseNumber > responses.length
        ) {
            alert(
                "有効なレス番号を入力してください。1から" +
                    responses.length +
                    "までの数字です。",
            );
            return false;
        }

        if (parts.length >= 2) {
            let multiplierInput = parseFloat(parts[1].trim());
            if (!isNaN(multiplierInput) && multiplierInput > 0) {
                speedMultiplier = multiplierInput;
            } else {
                alert(
                    "無効な倍率が入力されたため、デフォルトの1倍速が使用されます。",
                );
                speedMultiplier = 1;
            }
        } else {
            speedMultiplier = 1; // デフォルト値
        }

        let selectedResponse = responses[responseNumber - 1];
        threadStartTime = selectedResponse.timestamp;
        console.log(
            "選択されたレス番号: " +
                responseNumber +
                " (タイムスタンプ: " +
                threadStartTime.toLocaleString() +
                ")",
        );
        console.log("速度倍率: " + speedMultiplier + "倍");

        // 実行開始時刻をここで設定
        startTime = Date.now();
        console.log("実行開始時刻 = ", new Date(startTime).toLocaleString());

        return true;
    }

    // 最も近いレスまでスクロールする関数
    function scrollToClosestResponse(currentTime) {
        let closestResponse = null;
        let closestDiff = Infinity;

        console.log("現在のスレッド時刻: ", currentTime.toLocaleString());

        for (let i = 0; i < responses.length; i++) {
            let response = responses[i];
            let diff = currentTime - response.timestamp;
            if (diff >= 0 && diff < closestDiff) {
                closestDiff = diff;
                closestResponse = response;
            }
        }

        if (closestResponse) {
            // closestResponseがnullでない場合のみスクロール
            console.log(
                "最も近い過去のレスまでスクロールします: ",
                closestResponse.timestamp.toLocaleString(),
            );
            closestResponse.element.scrollIntoView({
                behavior: "smooth",
                block: "start",
            }); // スムーズスクロール
        } else {
            console.warn("該当するレスが見つかりませんでした");
        }
    }

    // 1秒ごとに実行されるループ処理
    function updateScroll() {
        let elapsed = Date.now() - startTime; // 経過時間を取得
        let adjustedElapsed = elapsed * speedMultiplier; // 速度倍率を適用
        let currentThreadTime = new Date(
            threadStartTime.getTime() + adjustedElapsed,
        ); // スレッドの現在時刻を算出
        console.log(
            "経過時間 (ms): ",
            elapsed,
            " 倍率適用後 (ms): ",
            adjustedElapsed,
            " 現在スレッド時刻: ",
            currentThreadTime.toLocaleString(),
        );
        scrollToClosestResponse(currentThreadTime);
    }

    // 初期化処理
    captureResponses();
    if (promptUserForSettings()) {
        updateScroll(); // 初回のスクロールを即時実行
        setInterval(updateScroll, 500); // その後0.5秒ごとに実行（精度向上のため）
    } else {
        console.error("初期化に失敗しました。ブックマークレットを終了します。");
    }
})();
