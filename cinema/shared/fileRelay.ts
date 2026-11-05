export const MAX_RELAY_BYTES = 25 * 1024 * 1024;
export const CHUNK_BYTES = 16384;
export type RelayHeader = {
  session: string;
  fileId: string;
  to?: string;
  from?: string;
  offset: number;
};
export function packFileChunk(header: RelayHeader, bytes: ArrayBuffer) {
  const json = new TextEncoder().encode(JSON.stringify(header));
  if (json.length > 512 || bytes.byteLength > CHUNK_BYTES)
    throw Error("INVALID_FILE_CHUNK");
  const packet = new Uint8Array(4 + json.length + bytes.byteLength);
  new DataView(packet.buffer).setUint32(0, json.length);
  packet.set(json, 4);
  packet.set(new Uint8Array(bytes), 4 + json.length);
  return packet.buffer;
}
export function unpackFileChunk(packet: ArrayBuffer): {
  header: RelayHeader;
  bytes: ArrayBuffer;
} {
  if (packet.byteLength < 6 || packet.byteLength > CHUNK_BYTES + 516)
    throw Error("INVALID_FILE_CHUNK");
  const length = new DataView(packet).getUint32(0);
  if (
    length > 512 ||
    length + 4 >= packet.byteLength ||
    packet.byteLength - length - 4 > CHUNK_BYTES
  )
    throw Error("INVALID_FILE_CHUNK");
  const h = JSON.parse(new TextDecoder().decode(packet.slice(4, 4 + length)));
  if (
    !h ||
    typeof h.session !== "string" ||
    typeof h.fileId !== "string" ||
    !Number.isSafeInteger(h.offset) ||
    h.offset < 0 ||
    (h.to !== undefined && (typeof h.to !== "string" || h.to.length > 100)) ||
    (h.from !== undefined &&
      (typeof h.from !== "string" || h.from.length > 100))
  )
    throw Error("INVALID_FILE_CHUNK");
  return { header: h, bytes: packet.slice(4 + length) };
}
