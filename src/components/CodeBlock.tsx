import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/utils/cn";

const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except",
  "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "self", "cls",
]);
const PY_BUILTINS = new Set(["print", "len", "range", "float", "int", "str", "list", "dict", "bool", "sorted", "max", "min", "sum", "zip", "enumerate", "abs", "round", "isinstance", "next", "open", "any", "all", "tuple", "set", "super", "map", "filter", "np", "ee", "rasterio"]);

type Tok = { t: string; c: string };

/** Tiny Python / shell tokenizer — enough for readable highlighting without a 200 KB dependency. */
function tokenize(src: string, lang: "python" | "bash" | "json"): Tok[] {
  const out: Tok[] = [];
  const re =
    lang === "python"
      ? /("""[\s\S]*?"""|'''[\s\S]*?'''|#[^\n]*|f?r?"(?:\\.|[^"\\\n])*"|f?r?'(?:\\.|[^'\\\n])*'|@\w[\w.]*|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\b[A-Za-z_]\w*\b|[^\w\s]+|\s+)/g
      : lang === "bash"
        ? /(#[^\n]*|"(?:\\.|[^"\\\n])*"|'[^'\n]*'|--?[\w-]+|\b[A-Za-z_][\w.-]*\b|\d+|[^\w\s]+|\s+)/g
        : /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[^\w\s]+|\s+|\w+)/g;
  let m: RegExpExecArray | null;
  let prevWord = "";
  while ((m = re.exec(src))) {
    const t = m[0];
    let c = "text-slate-300";
    if (lang === "python") {
      if (t.startsWith('"""') || t.startsWith("'''")) c = "text-emerald-300/80 italic";
      else if (t.startsWith("#")) c = "text-slate-500 italic";
      else if (/^f?r?["']/.test(t)) c = "text-amber-300";
      else if (t.startsWith("@")) c = "text-fuchsia-300";
      else if (/^\d/.test(t)) c = "text-sky-300";
      else if (PY_KEYWORDS.has(t)) c = "text-violet-300 font-medium";
      else if (prevWord === "def" || prevWord === "class") c = "text-yellow-200 font-semibold";
      else if (PY_BUILTINS.has(t)) c = "text-cyan-300";
      else if (/^[A-Z][A-Z0-9_]{2,}$/.test(t)) c = "text-orange-300";
      else if (/^[A-Z]\w*$/.test(t)) c = "text-teal-200";
    } else if (lang === "bash") {
      if (t.startsWith("#")) c = "text-slate-500 italic";
      else if (t.startsWith("--") || t.startsWith("-")) c = "text-sky-300";
      else if (/^["']/.test(t)) c = "text-amber-300";
      else if (["python", "pip", "cd", "earthengine", "uvicorn"].includes(t)) c = "text-emerald-300 font-medium";
      else if (/^\d/.test(t)) c = "text-sky-300";
    } else {
      if (/^"/.test(t) && /:\s*$/.test(src.slice(m.index + t.length, m.index + t.length + 3))) c = "text-sky-300";
      else if (/^"/.test(t)) c = "text-amber-300";
      else if (/^-?\d/.test(t)) c = "text-emerald-300";
      else if (/^(true|false|null)$/.test(t)) c = "text-violet-300";
    }
    if (/\S/.test(t)) prevWord = t;
    out.push({ t, c });
  }
  return out;
}

export default function CodeBlock({ code, lang = "python", className, maxHeight = 520, title, lineNumbers = true }: {
  code: string; lang?: "python" | "bash" | "json"; className?: string; maxHeight?: number | string; title?: string; lineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => {
    const toks = tokenize(code, lang);
    const rows: Tok[][] = [[]];
    for (const tok of toks) {
      const parts = tok.t.split("\n");
      parts.forEach((p, i) => {
        if (i > 0) rows.push([]);
        if (p) rows[rows.length - 1].push({ t: p, c: tok.c });
      });
    }
    if (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return rows;
  }, [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/10 bg-[#070b16]", className)}>
      {(title || true) && (
        <div className="flex items-center justify-between border-b border-white/8 bg-white/3 px-3 py-1.5">
          <span className="font-mono text-[11px] text-slate-400">{title ?? lang}</span>
          <button onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-400 hover:bg-white/10 hover:text-white">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}{copied ? "copied" : "copy"}
          </button>
        </div>
      )}
      <pre className="overflow-auto p-3 font-mono text-[11.5px] leading-[1.55]" style={{ maxHeight }}>
        <code>
          {lines.map((row, i) => (
            <div key={i} className="flex">
              {lineNumbers && <span className="mr-4 w-8 shrink-0 select-none text-right text-slate-600">{i + 1}</span>}
              <span className="whitespace-pre">{row.map((tok, k) => <span key={k} className={tok.c}>{tok.t}</span>)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
