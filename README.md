# インターン情報デイリーダイジェスト (Gmail → LINE)

`kenji.naito050409@gmail.com` に届いたメールのうち、インターンシップの募集・締切に関するものを 1 日 1 回自動でまとめて、LINE 公式アカウントから自分にプッシュ通知する Google Apps Script。

## 仕組み

1. 毎朝 7:00 JST に GAS の時刻トリガーで `dailyDigest()` が実行される
2. Gmail の過去 24 時間 × キーワード検索で候補メールを取得
3. Claude API (`claude-haiku-4-5-20251001`) に 1 件ずつ渡して「インターン関連か」を判定し、企業・職種・締切・要約を抽出
4. 締切が近い順に整形して LINE Messaging API で push 送信

## ファイル構成

```
appsscript.json           GAS マニフェスト (タイムゾーン/スコープ)
src/Main.gs               エントリポイント (dailyDigest / setupTrigger / testRun)
src/Config.gs             Script Properties からのシークレット読み込み
src/GmailFetcher.gs       Gmail 検索 + 既処理メールの除外
src/Classifier.gs         Claude API でのインターン分類 + 情報抽出
src/DigestFormatter.gs    ダイジェスト文の整形 (緊急度ソート, 5000 字分割)
src/LineNotifier.gs       LINE Messaging API で push 送信
```

## セットアップ手順

### 1. GAS プロジェクト作成

1. <https://script.google.com> で「新しいプロジェクト」を作成
2. 左サイドバーの歯車 (プロジェクトの設定) → 「appsscript.json マニフェスト ファイルをエディタで表示する」にチェック
3. このリポジトリの `appsscript.json` / `src/*.gs` の内容をそれぞれ対応ファイルにコピペ (GAS 上では拡張子 `.gs` は自動で付与される)

### 2. Claude API キーの準備

1. <https://console.anthropic.com> で API キーを発行
2. GAS エディタ → 歯車 (プロジェクトの設定) → 「スクリプト プロパティ」に追加:
   - `ANTHROPIC_API_KEY` = 発行したキー

### 3. LINE 公式アカウントの準備

LINE Notify はサービス終了 (2025年3月) のため、Messaging API を使う。

1. <https://developers.line.biz/ja/> で「Messaging API」チャネルを作成
2. 自分のスマホの LINE アプリで、その公式アカウントを **友だち追加** する
3. チャネル設定 → 「Messaging API 設定」タブ → **チャネルアクセストークン (長期)** を発行
4. 同じタブ内の **「あなたのユーザー ID」** (`U` で始まる 33 文字) を控える
5. スクリプト プロパティに追加:
   - `LINE_CHANNEL_ACCESS_TOKEN` = 3. で発行したトークン
   - `LINE_USER_ID` = 4. のユーザー ID

> 注: Webhook は ON にしなくても push 送信は動作します。

### 4. 権限認可と動作確認

1. GAS エディタで関数選択プルダウンから `testRun` を選び「実行」
2. Gmail / 外部 URL 取得の権限認可ダイアログが出るので許可
3. 実行ログに Gmail ヒット件数・分類結果・整形後メッセージが表示されることを確認
4. 次に `dailyDigest` を実行 → LINE に通知が届くことを確認

### 5. 自動実行トリガーの登録

1. GAS エディタで関数選択 `setupTrigger` → 実行
2. 左サイドバーの「トリガー」 (時計アイコン) で `dailyDigest` が daily 7:00 に登録されていることを確認

## 任意設定 (Script Properties)

| キー | デフォルト | 説明 |
|---|---|---|
| `CLAUDE_MODEL` | `claude-haiku-4-5-20251001` | 使用する Claude モデル |
| `DIGEST_HOUR_JST` | `7` | ダイジェスト送信時刻 (0-23) |
| `NOTIFY_WHEN_EMPTY` | `true` | 該当 0 件の日にも「該当なし」通知を送るか |

変更後は `setupTrigger` を再実行するとトリガー時刻が反映されます。

## カスタマイズ

- 検索キーワードの調整: `src/GmailFetcher.gs` の `SEARCH_QUERY`
- メッセージのフォーマット: `src/DigestFormatter.gs` の `formatOneBlock_`
- 判定プロンプト: `src/Classifier.gs` の `systemPrompt` / `userContent`

## トラブルシューティング

- **「Script Properties が未設定です」**: 上記 3 項目のいずれかが未設定。GAS 設定画面で追加
- **LINE に届かない**: 公式アカウントを友だち追加していない / ユーザー ID を取り違えている ことが多い
- **Claude API が 401/403**: API キーの貼り付けミス、または利用枠切れ
- **Gmail のヒットが多すぎ・少なすぎ**: `SEARCH_QUERY` のキーワードを調整
- **同じメールが翌日も通知される**: `PROCESSED_MESSAGE_IDS` に保存されるが、`newer_than:1d` の範囲外になれば自然に消える
