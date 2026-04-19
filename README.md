# Versky

言葉を星座に変換する Web アプリ。形態素解析 + TF-IDF + 共起グラフ + Force-directed 配置 + MST 結線で、短文から「読み解ける星座」を生成する。

公開: https://versky.vercel.app

## 技術スタック

- Vite + React + TypeScript
- [kuromoji.js](https://github.com/takuyaa/kuromoji.js)（形態素解析、Apache 2.0）
- Canvas 2D API（描画）

## データ・ライセンス帰属

### IDF コーパス

本ツールの単語重要度スコア（TF-IDF）の IDF は、**livedoor ニュースコーパス**（7,367 記事）から `scripts/build-idf.mjs` で事前計算したものを使用しています。

- 提供: [株式会社ロンウイット](https://www.rondhuit.com/download.html)
- 原著作: NHN Japan 株式会社
- ライセンス: [CC BY-ND 2.1 JP](https://creativecommons.org/licenses/by-nd/2.1/jp/)

原本の記事本文はリポジトリに含まれていません（`.gitignore` で除外）。配布している `public/idf/ja-news.json` は単語頻度の統計値のみで、元記事の表現は復元できません。

### 形態素解析辞書

kuromoji.js に同梱の IPA 辞書を使用。

## 本プロジェクトのライセンス

ソースコード: MIT License
IDF JSON (`public/idf/ja-news.json`): CC BY-SA 4.0（継承ライセンス）
