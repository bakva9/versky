import { useEffect, useState } from "react";
import { ConstellationCanvas, saveCanvasAsPng } from "./components/ConstellationCanvas";
import { analyze, type ConstellationResult } from "./lib/analyze";
import "./App.css";

const CANVAS_W = 620;
const CANVAS_H = 460;
const MAX_CHARS = 140;
const APP_URL = "https://versky.vercel.app";

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ConstellationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await analyze(text);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      saveCanvasAsPng(canvas);
      showToast("画像を保存しました");
    }
  }

  function handleShare() {
    if (!result) return;
    // 画像を先に保存
    const canvas = document.querySelector("canvas");
    if (canvas) saveCanvasAsPng(canvas);

    // X Web Intent
    const body = `${result.myth}\n\n${APP_URL} #Versky`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    showToast("画像は保存済みです。投稿画面で添付してください");
  }

  function showToast(msg: string) {
    setToast(msg);
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const charCount = [...text].length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasResult = !!result && result.stars.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Versky</h1>
        <p className="app-subtitle">言葉が星座になる</p>
      </header>

      <main className="app-main">
        {/* キャンバス */}
        <div className="canvas-wrapper">
          <ConstellationCanvas
            stars={result?.stars ?? []}
            edges={result?.edges ?? []}
            width={CANVAS_W}
            height={CANVAS_H}
          />
        </div>

        {/* 神話テキスト */}
        <div className="myth-area">
          {result?.myth ? (
            <p className="myth-text">{result.myth}</p>
          ) : (
            <p className="myth-placeholder">—</p>
          )}
        </div>

        {/* 入力エリア */}
        <div className="input-area">
          <textarea
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="今日あったこと、思ったこと、詩、なんでも"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
            }}
          />
          <div className="input-footer">
            <span className={`char-count ${isOverLimit ? "over" : ""}`}>
              {charCount} / {MAX_CHARS}
            </span>
            <div className="buttons">
              <button
                className="btn-share"
                onClick={handleShare}
                disabled={!hasResult}
                title="X に投稿（画像は保存され、投稿画面で添付）"
              >
                Xで共有
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={!hasResult}
                title="PNG として保存"
              >
                保存
              </button>
              <button
                className="btn-generate"
                onClick={generate}
                disabled={loading || !text.trim() || isOverLimit}
              >
                {loading ? (
                  <span className="spinner-wrap">
                    <span className="spinner" />
                    生成中
                  </span>
                ) : (
                  "生成　→"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
