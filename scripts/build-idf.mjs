#!/usr/bin/env node
// livedoor ニュースコーパスから IDF テーブルを構築
// 実行: node scripts/build-idf.mjs
// 出力: public/idf/ja-news.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_DIR = path.join(ROOT, "scripts", "corpus", "text");
const DICT_DIR = path.join(ROOT, "node_modules", "kuromoji", "dict");
const OUT_FILE = path.join(ROOT, "public", "idf", "ja-news.json");

const INCLUDE_POS = new Set(["名詞", "動詞", "形容詞", "副詞"]);
const EXCLUDE_DETAIL = new Set(["非自立", "接尾", "数", "代名詞"]);
const MIN_DF = 5;

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_DIR }).build((err, t) => {
      if (err) reject(err);
      else resolve(t);
    });
  });
}

function normalize(t) {
  if (t.pos === "動詞" || t.pos === "形容詞") {
    return t.basic_form !== "*" ? t.basic_form : t.surface_form;
  }
  return t.surface_form;
}

function isContentWord(t) {
  return INCLUDE_POS.has(t.pos) && !EXCLUDE_DETAIL.has(t.pos_detail_1);
}

function collectArticles() {
  const files = [];
  for (const cat of fs.readdirSync(CORPUS_DIR)) {
    const catDir = path.join(CORPUS_DIR, cat);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const name of fs.readdirSync(catDir)) {
      if (!name.endsWith(".txt")) continue;
      if (["CHANGES.txt", "README.txt", "LICENSE.txt"].includes(name)) continue;
      files.push(path.join(catDir, name));
    }
  }
  return files;
}

function readArticleBody(filePath) {
  // 1行目: URL, 2行目: 日付, 3行目以降: タイトル+本文
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  return lines.slice(2).join("\n");
}

async function main() {
  const t0 = Date.now();
  console.log("[build-idf] loading tokenizer...");
  const tokenizer = await buildTokenizer();

  const files = collectArticles();
  console.log(`[build-idf] ${files.length} articles found`);

  const df = new Map();
  let N = 0;

  for (let i = 0; i < files.length; i++) {
    const body = readArticleBody(files[i]);
    const tokens = tokenizer.tokenize(body);
    const terms = new Set();
    for (const t of tokens) {
      if (!isContentWord(t)) continue;
      terms.add(normalize(t));
    }
    for (const term of terms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
    N++;
    if ((i + 1) % 500 === 0) {
      console.log(`[build-idf] processed ${i + 1}/${files.length}`);
    }
  }

  const filtered = {};
  let kept = 0;
  for (const [term, count] of df.entries()) {
    if (count >= MIN_DF) {
      filtered[term] = count;
      kept++;
    }
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ N, df: filtered }));
  const sizeKb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(
    `[build-idf] done in ${((Date.now() - t0) / 1000).toFixed(1)}s: N=${N}, terms=${df.size} -> kept ${kept} (df>=${MIN_DF}), ${sizeKb}KB`
  );
  console.log(`[build-idf] output: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
