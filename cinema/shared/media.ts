export type RemoteMedia =
  | { kind: "youtube"; videoId: string }
  | { kind: "url"; url: string }
  | { kind: "drive"; fileId: string; resourceKey?: string };
export const supportedMimes = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
] as const;
export type MediaMime = (typeof supportedMimes)[number];
export const FILE_ACCEPT =
  ".mp4,.webm,.ogv,.ogg,.mov,.m4v,.mp3,.m4a,.wav,video/mp4,video/webm,video/ogg,video/quicktime,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm";
export function localMime(name: string, type: string): MediaMime | undefined {
  const aliases: Record<string, MediaMime> = {
    "audio/mp3": "audio/mpeg",
    "audio/x-wav": "audio/wav",
    "video/x-m4v": "video/mp4",
  };
  if (aliases[type]) return aliases[type];
  if (supportedMimes.includes(type as MediaMime)) return type as MediaMime;
  const ext = name.split(".").pop()?.toLowerCase();
  return (
    {
      mp4: "video/mp4",
      m4v: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      ogg: "audio/ogg",
      mov: "video/quicktime",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      wav: "audio/wav",
    } as Record<string, MediaMime>
  )[ext || ""];
}
export function isAudio(source: MediaSource) {
  return source.kind === "local"
    ? source.mime.startsWith("audio/")
    : source.kind === "url"
      ? /\.(mp3|m4a|wav|ogg)(?:$|\?)/i.test(new URL(source.url).pathname)
      : false;
}
export type LocalMedia = {
  kind: "local";
  fileId: string;
  ownerId: string;
  name: string;
  size: number;
  mime: MediaMime;
};
export type MediaSource = RemoteMedia | LocalMedia;
export const MAX_LOCAL_BYTES = 100 * 1024 * 1024;
/** Browser resource guard: streaming manifests must not introduce literal IP/localhost or HTTP loads. */
export function publicHTTPSURL(input: string): URL {
  const u = new URL(input),
    h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !h.includes(".") ||
    h.endsWith(".local") ||
    h.endsWith(".localhost") ||
    h === "localhost" ||
    h.startsWith("[") ||
    /^\d+(?:\.\d+){3}$/.test(h)
  )
    throw Error("INVALID_MEDIA_URL");
  return u;
}
export function isHlsURL(input: string) {
  try {
    return /\.m3u8$/i.test(new URL(input).pathname);
  } catch {
    return false;
  }
}
export function parseMediaURL(input: string): {
  videoId: string;
  source: RemoteMedia;
} {
  let u: URL;
  try {
    u = publicHTTPSURL(input);
  } catch {
    throw Error("INVALID_MEDIA_URL");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw Error("INVALID_MEDIA_URL");
  const h = u.hostname.toLowerCase();
  if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
      "youtu.be",
    ].includes(h)
  ) {
    const id =
      h === "youtu.be"
        ? u.pathname.slice(1)
        : u.pathname === "/watch"
          ? u.searchParams.get("v") || ""
          : u.pathname.match(
              /^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/,
            )?.[1] || "";
    if (!/^[\w-]{11}$/.test(id)) throw Error("INVALID_MEDIA_URL");
    return { videoId: id, source: { kind: "youtube", videoId: id } };
  }
  if (h === "drive.google.com") {
    const fileId =
      u.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ||
      (["/open", "/uc"].includes(u.pathname) ? u.searchParams.get("id") : null);
    const resourceKey = u.searchParams.get("resourcekey") || undefined;
    if (
      !fileId ||
      !/^[\w-]{10,200}$/.test(fileId) ||
      (resourceKey && !/^[\w-]{1,200}$/.test(resourceKey))
    )
      throw Error("INVALID_MEDIA_URL");
    return {
      videoId: "",
      source: {
        kind: "drive",
        fileId,
        ...(resourceKey ? { resourceKey } : {}),
      },
    };
  }
  // Public links only. They are loaded by browsers, never fetched by the Worker.
  if (
    !h.includes(".") ||
    h.endsWith(".local") ||
    h.endsWith(".localhost") ||
    h === "localhost" ||
    h.startsWith("[") ||
    /^\d+(?:\.\d+){3}$/.test(h)
  )
    throw Error("INVALID_MEDIA_URL");
  if (!/\.(mp4|webm|ogg|ogv|m4v|mov|mp3|m4a|wav|m3u8)$/i.test(u.pathname))
    throw Error("INVALID_MEDIA_URL");
  u.hash = "";
  return { videoId: "", source: { kind: "url", url: u.href } };
}
export function mediaSource(item: {
  videoId: string;
  source?: MediaSource;
}): MediaSource {
  return item.source || { kind: "youtube", videoId: item.videoId };
}
export function playableURL(source: MediaSource) {
  if (source.kind === "url") return source.url;
  if (source.kind === "drive") {
    const u = new URL("https://drive.usercontent.google.com/download");
    u.searchParams.set("id", source.fileId);
    u.searchParams.set("export", "download");
    u.searchParams.set("confirm", "t");
    if (source.resourceKey)
      u.searchParams.set("resourcekey", source.resourceKey);
    return u.href;
  }
  return "";
}
export function mediaLabel(
  item: { videoId: string; source?: MediaSource } | null,
) {
  if (!item) return "Chưa có video";
  const s = mediaSource(item);
  if (s.kind === "youtube") return s.videoId;
  if (s.kind === "local") return s.name;
  if (s.kind === "drive") return "Google Drive · " + s.fileId;
  try {
    return decodeURIComponent(
      new URL(s.url).pathname.split("/").pop() || "Video trực tiếp",
    );
  } catch {
    return "Video trực tiếp";
  }
}
