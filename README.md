# ユースフル YouTube 動画一覧

[ユースフル / 実務変革のプロ](https://www.youtube.com/channel/UCRpRQ48LGfMpYojZo7Srabg) の動画を、Microsoft 365 製品カテゴリ別に一覧表示します。

## 公開サイト

**https://okajun777.github.io/youseful-youtube-catalog/**

GitHub Actions が約30分ごとに YouTube を確認し、サイトを更新します。

## 機能

- **製品カテゴリ分け**: Excel / Word / PowerPoint / Outlook / Teams / Copilot / Power Automate など
- **レベル別おすすめ**: 初心者 / 中級者 / 上級者向けのおすすめ順表示
- **「最新」バッジ**: 公開から **36時間以内** の動画に表示
- **自動更新（公開サイト）**: 約30分ごと
- **ローカル**: `npm start` で約5分ごとの取り込みも可能

## ローカルでの使い方

```bash
npm start
```

ブラウザで http://localhost:3456 を開きます。

### 同期だけ実行

```bash
npm run sync
```

### 環境変数

| 変数 | 意味 | 既定 |
|------|------|------|
| `PORT` | 待ち受けポート | `3456` |
| `SYNC_INTERVAL_MS` | ローカル自動同期間隔（ミリ秒） | `300000`（5分） |

## データの場所

- `public/data/videos.json` … 公開・表示用の取得済み動画データ
