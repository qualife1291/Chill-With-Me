import { parseMediaURL } from "./media";
export const MAX_IMPORT_ITEMS = 20,
  MAX_IMPORT_BYTES = 16384;
/** Static URL lists / extended M3U metadata. Never fetch a document or HLS segments. */
export function parsePlaylist(input: string | readonly string[]) {
  const text = typeof input === "string" ? input : input.join("\n");
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw Error("IMPORT_TOO_LARGE");
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((text, i) => ({ text: text.trim(), line: i + 1 }));
  if (lines.some((l) => l.text.startsWith("#EXT-X-")))
    throw Error("IMPORT_STREAM_PLAYLIST");
  const entries = lines.filter((l) => l.text && !l.text.startsWith("#"));
  if (!entries.length) throw Error("IMPORT_EMPTY");
  if (entries.length > MAX_IMPORT_ITEMS) throw Error("IMPORT_TOO_MANY");
  const seen = new Set<string>(),
    urls: string[] = [],
    items: ReturnType<typeof parseMediaURL>[] = [];
  let duplicates = 0;
  for (const entry of entries) {
    let parsed: ReturnType<typeof parseMediaURL>;
    try {
      if (entry.text.length > 2048 || /[\u0000-\u001f\u007f]/.test(entry.text))
        throw Error();
      parsed = parseMediaURL(entry.text);
    } catch {
      throw Error(`INVALID_MEDIA_LINE:${entry.line}`);
    }
    const key =
      parsed.source.kind === "drive"
        ? "drive:" + parsed.source.fileId
        : JSON.stringify(parsed.source);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    urls.push(entry.text);
    items.push(parsed);
  }
  return { urls, items, duplicates };
}
