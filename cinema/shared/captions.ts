export const MAX_CAPTION_BYTES = 256 * 1024;
export const MAX_CAPTION_CUES = 2000;
function stamp(raw: string) {
  const m = /^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(raw);
  if (!m || Number(m[2]) > 59 || Number(m[3]) > 59) return NaN;
  return (
    Number(m[1] || 0) * 3600 +
    Number(m[2]) * 60 +
    Number(m[3]) +
    Number(m[4]) / 1000
  );
}
/** Bounded basic WebVTT. No STYLE/REGION/remote imports or HTML injection. */
export function validateCaptions(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CAPTION_BYTES)
    throw Error("Phụ đề phải có nội dung và không quá 256 KiB.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n");
  } catch {
    throw Error("Phụ đề cần dùng mã UTF-8.");
  }
  if (!/^WEBVTT(?:[ \t][^\n]*)?\n/.test(text) || text.includes("\0"))
    throw Error("File cần có tiêu đề WEBVTT hợp lệ.");
  const blocks = text.trimEnd().split(/\n[ \t]*\n/);
  let cues = 0,
    previous = -1;
  for (const block of blocks.slice(1)) {
    if (/^NOTE(?:[ \t\n]|$)/.test(block)) continue;
    const lines = block.split("\n"),
      index = lines[0].includes("-->") ? 0 : 1;
    const m = /^(\S+) --> (\S+)(?:[ \t]+(.*))?$/.exec(lines[index] || "");
    if (!m) throw Error("Có cue phụ đề sai cú pháp; chỉ hỗ trợ WebVTT cơ bản.");
    const start = stamp(m[1]),
      end = stamp(m[2]);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < previous ||
      end <= start ||
      end > 86400
    )
      throw Error(
        "Mốc phụ đề cần tăng dần, kết thúc sau bắt đầu và không quá 24 giờ.",
      );
    if (
      m[3] &&
      !m[3]
        .split(/\s+/)
        .every((s) =>
          /^(?:align:(?:start|center|end|left|right)|(?:position|size):(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%|line:(?:-?\d+|(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%)|vertical:(?:rl|lr))$/.test(
            s,
          ),
        )
    )
      throw Error("Thiết lập cue phụ đề chưa được hỗ trợ.");
    const content = lines.slice(index + 1).join("\n");
    if (!content.trim() || content.length > 2000)
      throw Error("Mỗi cue cần có nội dung, tối đa 2.000 ký tự.");
    previous = start;
    if (++cues > MAX_CAPTION_CUES)
      throw Error("Phụ đề vượt giới hạn 2.000 cue.");
  }
  if (!cues) throw Error("File chưa có cue phụ đề.");
  return { text, cues };
}
