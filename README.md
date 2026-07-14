# ユースフル YouTube 動画一覧

[ユースフル / 実務変革のプロ](https://www.youtube.com/channel/UCRpRQ48LGfMpYojZo7Srabg) の動画を、Microsoft 365 製品カテゴリ別に一覧表示します。

## 機能

- **製品カテゴリ分け**: Excel / Word / PowerPoint / Outlook / Teams / Copilot / Power Automate など
- **「最新」バッジ**: 公開から **24時間以内** の動画に表示
- **自動取り込み**: 起動後、約 **5分ごと** に YouTube RSS を確認して新着を反映
- **手動取り込み**: 画面の「今すぐ取り込み」ボタン

## 使い方

```bash
npm start
```

ブラウザで http://localhost:3456 を開きます。

初回起動時にチャンネル動画を一括取得し、以降は RSS（最新約15本）で差分を素早く取り込みます。

### 同期だけ実行

```bash
npm run sync
```

### 環境変数

| 変数 | 意味 | 既定 |
|------|------|------|
| `PORT` | 待ち受けポート | `3456` |
| `SYNC_INTERVAL_MS` | 自動同期間隔（ミリ秒） | `300000`（5分） |

## データの場所

- `data/videos.json` … 取得済み動画（ローカルに蓄積）
