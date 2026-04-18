// IDF テーブルのロードと IDF 値算出
// コーパス: livedoor ニュース 7,367 記事を scripts/build-idf.mjs で集計
// 出力形式: { N: number, df: { [term: string]: number } }

export interface IdfTable {
  N: number;
  df: Record<string, number>;
}

let cache: IdfTable | null = null;
let loadingPromise: Promise<IdfTable> | null = null;

export function loadIdf(): Promise<IdfTable> {
  if (cache) return Promise.resolve(cache);
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch("/idf/ja-news.json")
    .then((res) => {
      if (!res.ok) throw new Error(`failed to load idf: ${res.status}`);
      return res.json() as Promise<IdfTable>;
    })
    .then((data) => {
      cache = data;
      console.log(`[versky] idf loaded: N=${data.N}, terms=${Object.keys(data.df).length}`);
      return data;
    });
  return loadingPromise;
}

// Smooth IDF: log((N + 1) / (df + 1)) + 1
// 未知語（df[term] undefined）は df = 0 として扱い、最大級の IDF を返す
export function idf(term: string, table: IdfTable): number {
  const df = table.df[term] ?? 0;
  return Math.log((table.N + 1) / (df + 1)) + 1;
}
