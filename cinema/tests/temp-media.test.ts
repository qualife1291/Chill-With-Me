import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TempMediaCache,
  byteRange,
  CACHE_TTL,
  type CacheRecord,
} from "../worker/temp-media";
import { createRoom, apply, requestJoin } from "../shared/model";
function fixture() {
  const data = new Map<string, unknown>(),
    objects = new Map<string, Uint8Array>();
  let failDelete = false;
  const ledger = {
    async get<T>(key: string) {
      return structuredClone(data.get(key)) as T | undefined;
    },
    async put(key: string, v: unknown) {
      data.set(key, structuredClone(v));
    },
    async delete(key: string) {
      data.delete(key);
    },
    async list<T>() {
      return new Map([...data].map(([k, v]) => [k, structuredClone(v) as T]));
    },
  };
  const bucket = {
    async put(key: string, body: ReadableStream<Uint8Array>) {
      objects.set(key, new Uint8Array(await new Response(body).arrayBuffer()));
    },
    async get(
      key: string,
      options: { range: { offset: number; length: number } },
    ) {
      const v = objects.get(key);
      if (!v) return null;
      return {
        body: new Blob([
          v.slice(
            options.range.offset,
            options.range.offset + options.range.length,
          ),
        ]).stream(),
      };
    },
    async delete(key: string) {
      if (failDelete) throw Error("temporary");
      objects.delete(key);
    },
  };
  const room = createRoom("h", "Host", "Cache", 3, 0);
  requestJoin(room, "g", "Guest", 0);
  apply(room, "h", { type: "accept", id: "g" }, 0);
  const file = {
    fileId: crypto.randomUUID(),
    name: "clip.mp3",
    size: 4,
    mime: "audio/mpeg" as const,
  };
  apply(room, "h", { type: "file", file, mode: "start", generation: 0 }, 0);
  return {
    cache: new TempMediaCache(ledger, bucket, "slot-1"),
    room,
    file,
    data,
    objects,
    ledger,
    bucket,
    setFailure: (v: boolean) => {
      failDelete = v;
    },
  };
}
const stream = (bytes: number[]) => new Blob([new Uint8Array(bytes)]).stream();
test("temporary cache preserves bytes, supports private Range and rejects nonmembers", async () => {
  const f = fixture();
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 1);
  const r = await f.cache.read(f.room, "g", f.file.fileId, "bytes=1-2", 2);
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("content-range"), "bytes 1-2/4");
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [2, 3]);
  await assert.rejects(
    () => f.cache.read(f.room, "outsider", f.file.fileId, null, 2),
    /FORBIDDEN/,
  );
  assert.equal(
    (await f.cache.read(f.room, "g", f.file.fileId, "bytes=4-", 2)).status,
    416,
  );
});
test("only referenced owner uploads; duplicate and malformed-length uploads cannot accumulate objects", async () => {
  const f = fixture();
  await assert.rejects(
    () => f.cache.upload(f.room, "g", f.file.fileId, stream([1, 2, 3, 4]), 1),
    /FORBIDDEN/,
  );
  await assert.rejects(
    () => f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2]), 1),
    /INCOMPLETE/,
  );
  assert.equal(f.data.size, 0);
  assert.equal(f.objects.size, 0);
  await assert.rejects(
    () =>
      f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4, 5]), 2),
    /TOO_LARGE/,
  );
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 3);
  await assert.rejects(
    () => f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 4),
    /ALREADY_RESERVED/,
  );
});
test("reference removal revokes reads immediately and failed deletion persists a retry across coordinator restart", async () => {
  const f = fixture();
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 1);
  apply(f.room, "h", { type: "next", generation: 1 }, 2);
  assert.equal(
    (await f.cache.read(f.room, "g", f.file.fileId, null, 3)).status,
    404,
  );
  f.setFailure(true);
  await f.cache.collect(f.room, 3);
  assert.equal(f.data.size, 1);
  assert.equal(([...f.data.values()][0] as CacheRecord).status, "deleting");
  const wake = await f.cache.nextAlarm();
  assert(wake! > 3);
  f.setFailure(false);
  const restarted = new TempMediaCache(f.ledger, f.bucket, "slot-1");
  await restarted.collect(null, wake!);
  assert.equal(f.objects.size, 0);
  assert.equal(f.data.size, 0);
  assert.equal(await f.cache.nextAlarm(), null);
});
test("duplicate active references retain the object until the final reference is gone", async () => {
  const f = fixture();
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 1);
  f.room.queue.push({ ...f.room.current!, id: crypto.randomUUID() });
  apply(f.room, "h", { type: "next", generation: 1 }, 2);
  await f.cache.collect(f.room, 3);
  assert.equal(f.objects.size, 1);
  apply(f.room, "h", { type: "next", generation: 2 }, 4);
  await f.cache.collect(f.room, 5);
  assert.equal(f.objects.size, 0);
});
test("room epoch and membership deadlines revoke stale cached media", async () => {
  const f = fixture();
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 1);
  await assert.rejects(
    f.cache.read(f.room, "g", f.file.fileId, null, 20000),
    /FORBIDDEN/,
  ); // membership lease expired, rejected before reading
  assert.equal(
    (
      await f.cache.read(
        { ...f.room, session: crypto.randomUUID() },
        "g",
        f.file.fileId,
        null,
        2,
      )
    ).status,
    404,
  );
});
test("TTL removes even still-referenced objects and Range suffixes are bounded", async () => {
  const f = fixture();
  await f.cache.upload(f.room, "h", f.file.fileId, stream([1, 2, 3, 4]), 1);
  await f.cache.collect(f.room, CACHE_TTL + 1);
  assert.equal(f.objects.size, 0);
  assert.deepEqual(byteRange("bytes=-2", 4), {
    offset: 2,
    length: 2,
    partial: true,
  });
  assert.throws(() => byteRange("bytes=0-1,2-3", 4), /INVALID_RANGE/);
  assert.throws(() => byteRange("bytes=-0", 4), /INVALID_RANGE/);
});
