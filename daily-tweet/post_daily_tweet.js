import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'https://qurihara.github.io/alt_hyakunin_isshu/';
const HASHTAG = '#令和のポジティブ解釈百人一首';
const TWEET_LIMIT = 280;
const URL_WEIGHT = 23; // t.co でURLは一律23として数えられる

// data.csv はリポジトリのルートにある（このスクリプトは daily-tweet/ 配下）
const DATA_PATH = path.join(__dirname, '..', 'data.csv');
const LAST_PATH = path.join(__dirname, 'last.json');
const LOG_PATH = path.join(__dirname, 'post.log');

const isDryRun = process.argv.includes('--dry-run');

// X の重み付き文字数。基本ラテン等は1、それ以外（日本語含む）は2。
// 参考: Twitter weighted length。ざっくり ASCII/ラテン記号域を1、それ以外を2とする。
export function weightedLength(text) {
  let len = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const isLight =
      (cp >= 0x0000 && cp <= 0x10ff) ||
      (cp >= 0x2000 && cp <= 0x200d) ||
      (cp >= 0x2010 && cp <= 0x201f) ||
      (cp >= 0x2032 && cp <= 0x2037);
    len += isLight ? 1 : 2;
  }
  return len;
}

export function loadPoems() {
  const csv = fs.readFileSync(DATA_PATH, 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  return rows.map((r) => ({
    number: r['歌番号'],
    kajin: r['歌人'],
    waka: r['歌'],
    positive_x: r['情熱ポジティブ現代語訳'],
  }));
}

function readLast() {
  try {
    return JSON.parse(fs.readFileSync(LAST_PATH, 'utf8')).number;
  } catch {
    return null;
  }
}

function writeLast(number) {
  fs.writeFileSync(LAST_PATH, JSON.stringify({ number, at: new Date().toISOString() }, null, 2));
}

// 前回と同じ番号を避けてランダムに1首選ぶ
function pickPoem(poems, lastNumber) {
  const candidates =
    poems.length > 1 ? poems.filter((p) => p.number !== lastNumber) : poems;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 本家 updateTwitterLink() と同じテンプレ。URLぶん(23)を残して情熱解釈を切り詰める。
export function buildTweet(poem) {
  const wakaText = poem.waka.replace(/\n/g, ' ');
  const build = (interp) =>
    `【${poem.number}番】\n「${wakaText}」(${poem.kajin})\n\n【令和ポジティブ解釈】\n${interp}\n\n${HASHTAG}\n${SITE_URL}`;

  // URLは t.co で23固定。本文側の予算は TWEET_LIMIT - URL_WEIGHT。
  // build() 内に SITE_URL を実文字で含めているので、その重みぶんを差し引いて評価する。
  const urlActualWeight = weightedLength(SITE_URL);
  const budget = TWEET_LIMIT - URL_WEIGHT;

  let interp = poem.positive_x;
  let text = build(interp);
  // URL実重みを除いた本文重み
  let bodyWeight = weightedLength(text) - urlActualWeight;

  if (bodyWeight > budget) {
    const overhead = bodyWeight - weightedLength(interp); // 解釈以外の固定部
    let maxInterpWeight = budget - overhead - weightedLength('…');
    if (maxInterpWeight < 0) maxInterpWeight = 0;
    let trimmed = '';
    let w = 0;
    for (const ch of interp) {
      const cw = weightedLength(ch);
      if (w + cw > maxInterpWeight) break;
      trimmed += ch;
      w += cw;
    }
    interp = trimmed + '…';
    text = build(interp);
  }
  return text;
}

function log(line) {
  const entry = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(LOG_PATH, entry);
}

async function main() {
  const poems = loadPoems();
  if (poems.length !== 100) {
    console.warn(`warning: expected 100 poems, got ${poems.length}`);
  }
  const last = readLast();
  const poem = pickPoem(poems, last);
  const text = buildTweet(poem);
  const weighted = weightedLength(text) - weightedLength(SITE_URL) + URL_WEIGHT;

  if (isDryRun) {
    console.log('--- DRY RUN (投稿しません) ---');
    console.log(`選択: ${poem.number}番 / ${poem.kajin}（前回: ${last ?? 'なし'}）`);
    console.log(`重み付き長(URL=23換算): ${weighted} / ${TWEET_LIMIT}`);
    console.log('-----------------------------');
    console.log(text);
    console.log('-----------------------------');
    return;
  }

  const required = [
    'TWITTER_APP_KEY',
    'TWITTER_APP_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    const msg = `ERROR: .env に未設定の項目があります: ${missing.join(', ')}`;
    console.error(msg);
    log(msg);
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  try {
    const res = await client.v2.tweet(text);
    writeLast(poem.number);
    const msg = `OK posted ${poem.number}番 (${poem.kajin}) id=${res.data.id} weighted=${weighted}`;
    console.log(msg);
    log(msg);
  } catch (err) {
    const msg = `ERROR posting ${poem.number}番: ${err?.message || err}`;
    console.error(msg);
    log(msg);
    process.exit(1);
  }
}

// 直接実行された時のみ投稿処理を走らせる（import 時は実行しない）
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}
