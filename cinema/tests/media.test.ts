import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMediaURL,
  playableURL,
  mediaSource,
  MAX_LOCAL_BYTES,
} from "../shared/media";
import {
  apply,
  createRoom,
  requestJoin,
  fileMetadataSchema,
} from "../shared/model";
test("providers normalize and legacy YouTube stays compatible", () => {
  assert.deepEqual(mediaSource({ videoId: "jfKfPfyJRdk" }), {
    kind: "youtube",
    videoId: "jfKfPfyJRdk",
  });
  for (const u of [
    "https://youtu.be/jfKfPfyJRdk",
    "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    "https://youtube.com/shorts/jfKfPfyJRdk",
    "https://music.youtube.com/watch?v=jfKfPfyJRdk&list=RD123",
    "https://www.youtube.com/live/jfKfPfyJRdk?si=test",
    "https://m.youtube.com/shorts/jfKfPfyJRdk/",
    "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk",
  ])
    assert.equal(parseMediaURL(u).videoId, "jfKfPfyJRdk");
  const drive = parseMediaURL(
    "https://drive.google.com/file/d/1TVTrleolsrLJUzch6QUHnhIdJ54klpBi/view?usp=sharing",
  );
  assert.equal(drive.source.kind, "drive");
  assert(
    playableURL(drive.source).includes("id=1TVTrleolsrLJUzch6QUHnhIdJ54klpBi"),
  );
  assert(
    playableURL(
      parseMediaURL(
        "https://drive.google.com/open?id=abcdefghijk&resourcekey=key-1",
      ).source,
    ).includes("resourcekey=key-1"),
  );
  assert.equal(
    playableURL(
      parseMediaURL("https://cdn.example.com/movie.webm?token=signed#fragment")
        .source,
    ),
    "https://cdn.example.com/movie.webm?token=signed",
  );
});
test("input rejects executable, private, malformed and unknown embed URLs", () => {
  for (const u of [
    "javascript:alert(1)",
    "http://cdn.example.com/a.mp4",
    "https://u:p@cdn.example.com/a.mp4",
    "https://127.0.0.1/a.mp4",
    "https://[::1]/a.mp4",
    "https://foo.local/a.mp4",
    "https://youtube.com.evil.test/watch?v=jfKfPfyJRdk",
    "https://drive.google.com/file/d/x/view",
    "https://vimeo.com/123",
    "https://cdn.example.com:8443/a.mp4",
  ])
    assert.throws(() => parseMediaURL(u), /INVALID_MEDIA_URL/);
});
test("mixed queue preserves timeline, source, role and generation guards", () => {
  const r = createRoom("h", "H", "Media", 3, 1000);
  requestJoin(r, "g", "G", 1000);
  apply(r, "h", { type: "accept", id: "g" }, 1000);
  const file = {
    fileId: crypto.randomUUID(),
    name: "test.webm",
    size: 100,
    mime: "video/webm" as const,
  };
  assert.throws(
    () =>
      apply(r, "g", { type: "file", file, mode: "start", generation: 0 }, 1000),
    /HOST_ONLY/,
  );
  apply(r, "h", { type: "file", file, mode: "start", generation: 0 }, 1000);
  assert.equal(mediaSource(r.current!).kind, "local");
  assert.equal(r.generation, 1);
  assert.equal(
    r.current?.source?.kind === "local" && r.current.source.ownerId,
    "h",
  );
  apply(
    r,
    "h",
    { type: "add", url: "https://drive.google.com/file/d/abcdefghijk/view" },
    2000,
  );
  apply(r, "h", { type: "add", url: "https://cdn.example.com/a.webm" }, 2000);
  assert.equal(r.position, 0);
  assert.equal(r.anchor, 1000);
  apply(r, "h", { type: "next", generation: 1 }, 3000);
  assert.equal(mediaSource(r.current!).kind, "drive");
  assert.throws(
    () => apply(r, "h", { type: "next", generation: 1 }, 3001),
    /STALE/,
  );
  apply(r, "h", { type: "next", generation: 2 }, 4000);
  assert.equal(mediaSource(r.current!).kind, "url");
  assert(
    !fileMetadataSchema.safeParse({ ...file, size: MAX_LOCAL_BYTES + 1 })
      .success,
  );
  assert(!fileMetadataSchema.safeParse({ ...file, mime: "text/html" }).success);
});
test("audio links, MOV and browser MIME aliases are accepted with bounded metadata", async () => {
  const { localMime, isAudio } = await import("../shared/media");
  for (const ext of ["mp3", "m4a", "wav", "mov"])
    assert.equal(
      parseMediaURL(`https://cdn.example.com/clip.${ext}?signature=x`).source
        .kind,
      "url",
    );
  assert.equal(localMime("song.mp3", "audio/mp3"), "audio/mpeg");
  assert.equal(localMime("movie.mov", ""), "video/quicktime");
  assert(isAudio(parseMediaURL("https://cdn.example.com/song.mp3").source));
});
test("finished files disappear from the serialized room rather than accumulating history", () => {
  const r = createRoom("h", "H", "Cleanup", 2, 0);
  const file = {
    fileId: crypto.randomUUID(),
    name: "private-song.mp3",
    size: 123,
    mime: "audio/mpeg" as const,
  };
  apply(r, "h", { type: "file", file, mode: "start", generation: 0 }, 1);
  assert(JSON.stringify(r).includes(file.fileId));
  apply(r, "h", { type: "next", generation: 1 }, 2000);
  assert.equal(r.current, null);
  assert.equal(r.queue.length, 0);
  assert(!JSON.stringify(r).includes(file.fileId));
  assert(!JSON.stringify(r).includes(file.name));
  assert.equal(r.playing, false);
});
test("relay frames preserve exact bytes and reject malformed or oversized buffers", async () => {
  const { packFileChunk, unpackFileChunk, CHUNK_BYTES } =
    await import("../shared/fileRelay");
  const header = {
    session: "epoch",
    fileId: crypto.randomUUID(),
    to: "guest",
    offset: 0,
  };
  const bytes = Uint8Array.from([0, 255, 17, 36]).buffer;
  const parsed = unpackFileChunk(packFileChunk(header, bytes));
  assert.deepEqual(parsed.header, header);
  assert.deepEqual(new Uint8Array(parsed.bytes), new Uint8Array(bytes));
  assert.throws(
    () => unpackFileChunk(new ArrayBuffer(0)),
    /INVALID_FILE_CHUNK/,
  );
  assert.throws(
    () => packFileChunk(header, new ArrayBuffer(CHUNK_BYTES + 1)),
    /INVALID_FILE_CHUNK/,
  );
  const corrupt = packFileChunk(header, bytes);
  new DataView(corrupt).setUint32(0, 999999);
  assert.throws(() => unpackFileChunk(corrupt), /INVALID_FILE_CHUNK/);
  assert.throws(
    () => unpackFileChunk(packFileChunk({ ...header, offset: -1 }, bytes)),
    /INVALID_FILE_CHUNK/,
  );
});
