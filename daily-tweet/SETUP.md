# daily-tweet — 百人一首ポジティブ解釈の毎日自動ツイート

小倉百人一首のポジティブ解釈（情熱版）を、毎日1首ランダムに X(Twitter) へ自動投稿する
スタンドアロンスクリプトです。本文はWebアプリの「Xで共有」ボタンと同じ書式です。
歌データはリポジトリ直下の `../data.csv` を読み込みます。

---

## 1. 依存パッケージのインストール

```powershell
cd path\to\alt_hyakunin_isshu\daily-tweet
npm install
```

## 2. X API 認証情報を取得する

1. <https://developer.x.com/> で開発者アカウントを作成（無料 Free プランでOK）。
2. **Project** を作成し、その中に **App** を作成。
3. App の **User authentication settings** で権限を **Read and Write** に設定。
   - App type は「Web App / Automated App or Bot」でよい。Callback / Website URL は任意。
4. **Keys and tokens** タブで以下を発行・コピー:
   - **API Key** / **API Key Secret**（= Consumer Keys）
   - **Access Token** / **Access Token Secret**
     - ※権限を Read and Write にした **後**にトークンを発行/再発行すること
       （先に作ったトークンは Read 専用のままで投稿できない）。

> 無料 Free プランで `POST /2/tweets` は月1,500件まで可能。1日1件なら十分です。

## 3. 認証情報を .env に記入する

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` は `.gitignore` 済みでコミットされません。

## 4. 動作確認（投稿せずに本文だけ表示）

```powershell
npm run dry-run
# または: node post_daily_tweet.js --dry-run
```

選ばれた歌番号・本文・重み付き文字数が表示されます。何度か実行して、毎回ランダムに
変わること・前回と同じ番号が連続しないことを確認してください。

## 5. 試しに1回だけ実投稿

```powershell
npm run post
# または: node post_daily_tweet.js
```

X のタイムラインに表示されれば成功です。結果は `post.log` に記録されます。

## 6. 毎日 07:33 に自動実行（Windows タスクスケジューラー）

**PowerShell（管理者）** で実行するとタスクが登録されます。`$dir` は実際の `daily-tweet`
フォルダの絶対パスに置き換えてください。

```powershell
$dir  = "C:\path\to\alt_hyakunin_isshu\daily-tweet"
$node = (Get-Command node).Source
$action  = New-ScheduledTaskAction -Execute $node -Argument "post_daily_tweet.js" -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -Daily -At 7:33am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun
Register-ScheduledTask -TaskName "KarutaDailyTweet" -Action $action -Trigger $trigger -Settings $settings -Description "百人一首ポジティブ解釈の毎日自動ツイート"
```

- `-StartWhenAvailable`: 指定時刻にPCがオフだった場合、次回起動後できるだけ早く実行。
- `-WakeToRun`: スリープからの自動復帰を許可（電源設定によっては別途有効化が必要）。
- **PCが完全に電源OFFの時刻はその日スキップされます**（ローカル実行の制約）。

### 管理コマンド

```powershell
Start-ScheduledTask -TaskName "KarutaDailyTweet"   # 手動で即実行
Get-ScheduledTask   -TaskName "KarutaDailyTweet"   # 状態確認
Unregister-ScheduledTask -TaskName "KarutaDailyTweet" -Confirm:$false  # 削除
```

## ファイル構成

| ファイル | 役割 |
|---|---|
| `post_daily_tweet.js` | 本体。`../data.csv` 読込→ランダム選択→本文生成→X投稿 |
| `package.json` | 依存定義（csv-parse / dotenv / twitter-api-v2） |
| `.env.example` | 認証情報テンプレ（`.env` にコピーして使用） |
| `.gitignore` | `.env` `node_modules/` `last.json` `post.log` を除外 |
| `last.json` | 直近に投稿した歌番号（連続重複回避用、自動生成） |
| `post.log` | 投稿の成否ログ（自動生成） |

投稿時刻や、解釈を「おだやか版（`おだやかポジティブ現代語訳`）」に変えたい場合は
`post_daily_tweet.js` を調整してください。
