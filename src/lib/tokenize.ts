import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function buildTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: "/dict" }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

export function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) tokenizerPromise = buildTokenizer();
  return tokenizerPromise;
}

export async function tokenize(text: string): Promise<IpadicFeatures[]> {
  const t = await getTokenizer();
  return t.tokenize(text);
}
