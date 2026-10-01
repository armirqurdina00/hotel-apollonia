import "server-only";

/**
 * Free machine translation through MyMemory (https://mymemory.translated.net):
 * no account or key. Anonymous use allows 5,000 characters a day; setting
 * MYMEMORY_EMAIL raises that to 50,000.
 */

// MyMemory accepts at most 500 bytes per request.
const MAX_BYTES = 450;

export class TranslateError extends Error {
  constructor(readonly reason: "quota" | "failed") {
    super(reason);
  }
}

/** Splits text into pieces under MAX_BYTES, at sentence ends where possible. */
function chunks(text: string) {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const out: string[] = [];
  let cur = "";
  for (const sentence of text.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [text]) {
    if (cur && bytes(cur + sentence) > MAX_BYTES) {
      out.push(cur);
      cur = "";
    }
    // A single sentence that is still too long is cut at spaces.
    let s = sentence;
    while (bytes(s) > MAX_BYTES) {
      // Half the byte limit in characters stays under it even if every letter takes two bytes (ë, ç).
      const space = s.lastIndexOf(" ", Math.floor(MAX_BYTES / 2));
      const cut = space > 0 ? space : Math.floor(MAX_BYTES / 2);
      out.push(s.slice(0, cut));
      s = s.slice(cut);
    }
    cur += s;
  }
  if (cur) out.push(cur);
  return out;
}

async function translatePiece(text: string, from: string, to: string) {
  if (!text.trim()) return text;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.trim());
  url.searchParams.set("langpair", `${from}|${to}`);
  if (process.env.MYMEMORY_EMAIL) url.searchParams.set("de", process.env.MYMEMORY_EMAIL);

  let json: { responseStatus?: number | string; responseData?: { translatedText?: string }; quotaFinished?: boolean };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    json = await res.json();
  } catch {
    throw new TranslateError("failed");
  }
  if (json.quotaFinished || Number(json.responseStatus) === 429) throw new TranslateError("quota");
  const out = json.responseData?.translatedText;
  // Errors come back as a 4xx status with an upper-case warning in place of the text.
  if (Number(json.responseStatus) !== 200 || !out || /^MYMEMORY WARNING|^QUERY LENGTH LIMIT/.test(out)) throw new TranslateError("failed");
  // Keep the spacing around the piece so joined chunks read naturally.
  return text.match(/^\s*/)![0] + out + text.match(/\s*$/)![0];
}

/** Translates plain text, e.g. from "sq" to "en". */
export async function translate(text: string, from: string, to: string) {
  if (!text.trim()) return "";
  const parts: string[] = [];
  for (const piece of chunks(text)) parts.push(await translatePiece(piece, from, to));
  return parts.join("").trim();
}
