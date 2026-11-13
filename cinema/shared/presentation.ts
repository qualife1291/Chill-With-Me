import { z } from "zod";
import type { Room } from "./model";
import type { LocalMedia } from "./media";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 200;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const documentMimes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const DOCUMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";
export const documentMetadataSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  size: z.number().int().min(1).max(MAX_DOCUMENT_BYTES),
  mime: z.enum(documentMimes),
  pages: z.number().int().min(1).max(MAX_DOCUMENT_PAGES),
});
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type DocumentFile = DocumentMetadata & {
  kind: "document";
  ownerId: string;
};
export type Presentation = {
  source: DocumentFile;
  page: number;
  revision: number;
};
export type SharedFile = LocalMedia | DocumentFile;
export function documentMime(name: string, type: string) {
  if (documentMimes.includes(type as DocumentMetadata["mime"]))
    return type as DocumentMetadata["mime"];
  return (
    {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    } as Record<string, DocumentMetadata["mime"]>
  )[name.split(".").pop()?.toLowerCase() || ""];
}
/** Relay the displayed source only; cached movie Blobs remain local during a deck. */
export function sharedFile(
  room: Room | null,
  fileId: string,
): SharedFile | undefined {
  if (room?.presentation)
    return room.presentation.source.fileId === fileId
      ? room.presentation.source
      : undefined;
  const media = room?.current?.source;
  return media?.kind === "local" && media.fileId === fileId ? media : undefined;
}

/** Read raster dimensions before allocating a decoded bitmap (SVG/animation excluded). */
export function imageDimensions(
  bytes: Uint8Array,
  mime: DocumentMetadata["mime"],
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (mime === "image/png" && bytes.length >= 24) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (mime === "image/jpeg") {
    let i = 2;
    while (i + 4 < bytes.length) {
      if (bytes[i++] !== 255) break;
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (i + 2 > bytes.length) break;
      const length = view.getUint16(i);
      if (length < 2 || i + length > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      ) {
        height = view.getUint16(i + 3);
        width = view.getUint16(i + 5);
        break;
      }
      i += length;
    }
  } else if (mime === "image/webp") {
    const u24 = (p: number) =>
      bytes[p] + bytes[p + 1] * 256 + bytes[p + 2] * 65536;
    for (let i = 12; i + 8 <= bytes.length;) {
      const kind = String.fromCharCode(...bytes.subarray(i, i + 4)),
        length = view.getUint32(i + 4, true),
        p = i + 8;
      if (p + length > bytes.length) break;
      if (kind === "VP8X" && length >= 10) {
        if (bytes[p] & 2) throw Error("Hãy dùng WebP tĩnh để trình chiếu.");
        width = u24(p + 4) + 1;
        height = u24(p + 7) + 1;
        break;
      }
      if (
        kind === "VP8 " &&
        length >= 10 &&
        bytes[p + 3] === 157 &&
        bytes[p + 4] === 1 &&
        bytes[p + 5] === 42
      ) {
        width = view.getUint16(p + 6, true) & 16383;
        height = view.getUint16(p + 8, true) & 16383;
        break;
      }
      if (kind === "VP8L" && length >= 5 && bytes[p] === 47) {
        const bits = view.getUint32(p + 1, true);
        width = (bits & 16383) + 1;
        height = ((bits >>> 14) & 16383) + 1;
        break;
      }
      i = p + length + (length % 2);
    }
  }
  if (!width || !height || width * height > MAX_IMAGE_PIXELS)
    throw Error("Ảnh cần có kích thước hợp lệ, tối đa 16 triệu pixel.");
  return { width, height };
}

/** Bound both axes as well as area; extreme page aspect ratios must never allocate giant canvases. */
export function documentRasterSize(
  width: number,
  height: number,
  economical: boolean,
) {
  if (
    !Number.isFinite(width * height) ||
    width * height <= 0 ||
    width <= 0 ||
    height <= 0
  )
    throw Error("Kích thước trang không hợp lệ.");
  const edge = economical ? 1440 : 1920,
    pixels = economical ? 1_048_576 : 2_073_600;
  const scale = Math.min(
    edge / width,
    edge / height,
    Math.sqrt(pixels) / Math.sqrt(width * height),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
  };
}
