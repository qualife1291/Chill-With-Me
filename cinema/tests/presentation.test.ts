import { FileShare } from "../src/FileShare";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  commandSchema,
  createRoom,
  requestJoin,
  view,
  sweep,
} from "../shared/model";
import {
  documentMetadataSchema,
  imageDimensions,
  documentRasterSize,
  MAX_DOCUMENT_BYTES,
  sharedFile,
} from "../shared/presentation";
import {
  reactionChoices,
  reactionPreset,
  reactionVariants,
} from "../shared/reactions";
const file = {
  fileId: "00000000-0000-4000-8000-000000000001",
  name: "Bài chiếu.pdf",
  size: 4096,
  mime: "application/pdf" as const,
  pages: 3,
};
const setup = () => {
  const r = createRoom("h", "Host", "PDF", 3, 1000);
  r.current = { id: "movie", videoId: "jfKfPfyJRdk" };
  r.playing = true;
  r.position = 10;
  r.anchor = 1000;
  return r;
};
test("document metadata rejects oversized, unsupported and unbounded values", () => {
  for (const bad of [
    { size: 0 },
    { size: MAX_DOCUMENT_BYTES + 1 },
    { pages: 201 },
    { pages: 0 },
    { mime: "text/html" },
    { mime: "image/svg+xml" },
    { fileId: "not-a-uuid" },
    { pages: Infinity },
  ])
    assert.equal(
      documentMetadataSchema.safeParse({ ...file, ...bad }).success,
      false,
    );
  assert.equal(
    documentMetadataSchema.safeParse({
      ...file,
      pages: 200,
      size: MAX_DOCUMENT_BYTES,
    }).success,
    true,
  );
});
test("presentation pauses movie at current anchor without replacing source or generation", () => {
  const r = setup(),
    old = r.current;
  apply(
    r,
    "h",
    { type: "present", file, expectedRevision: 0, generation: 0 },
    3000,
  );
  assert.equal(r.current, old);
  assert.equal(r.generation, 0);
  assert.equal(r.position, 12);
  assert.equal(r.playing, false);
  assert.equal(r.presentation?.page, 1);
  assert.equal(r.presentation?.source.ownerId, "h");
});
test("document commands require approved host and fresh generation/revision", () => {
  const r = setup();
  r.members.push({ ...r.members[0], id: "v", name: "Guest", seat: 1 });
  const start = {
    type: "present" as const,
    file,
    expectedRevision: 0,
    generation: 0,
  };
  assert.throws(() => apply(r, "nobody", start, 2000), /FORBIDDEN/);
  assert.throws(() => apply(r, "v", start, 2000), /HOST_ONLY/);
  assert.throws(
    () => apply(r, "h", { ...start, generation: 1 }, 2000),
    /STALE_GENERATION/,
  );
  apply(r, "h", start, 2000);
  const p = r.presentation!;
  assert.throws(
    () =>
      apply(
        r,
        "v",
        {
          type: "slide",
          fileId: file.fileId,
          page: 2,
          expectedRevision: p.revision,
        },
        2001,
      ),
    /HOST_ONLY/,
  );
  apply(
    r,
    "h",
    {
      type: "slide",
      fileId: file.fileId,
      page: 2,
      expectedRevision: p.revision,
    },
    2002,
  );
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "slide", fileId: file.fileId, page: 3, expectedRevision: 1 },
        2003,
      ),
    /STALE_PRESENTATION/,
  );
  assert.equal(r.presentation?.page, 2);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "slide", fileId: file.fileId, page: 4, expectedRevision: 2 },
        2003,
      ),
    /INVALID_DOCUMENT_PAGE/,
  );
});
test("stop/start avoids ABA and late page commands cannot edit a replacement", () => {
  const r = setup();
  apply(
    r,
    "h",
    { type: "present", file, expectedRevision: 0, generation: 0 },
    2000,
  );
  apply(
    r,
    "h",
    { type: "stop-presentation", fileId: file.fileId, expectedRevision: 1 },
    2001,
  );
  assert.equal(r.presentation, undefined);
  assert.equal(r.playing, false);
  assert.equal(r.presentationRevision, 2);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "present", file, expectedRevision: 0, generation: 0 },
        2002,
      ),
    /STALE_PRESENTATION/,
  );
  const next = { ...file, fileId: "00000000-0000-4000-8000-000000000002" };
  apply(
    r,
    "h",
    { type: "present", file: next, expectedRevision: 2, generation: 0 },
    2003,
  );
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "stop-presentation", fileId: file.fileId, expectedRevision: 1 },
        2004,
      ),
    /STALE_PRESENTATION/,
  );
  assert.equal(structuredClone(r).presentation?.source.fileId, next.fileId);
});
test("returning to movie, Next and owner removal prune document metadata", () => {
  for (const end of ["play", "next"] as const) {
    const r = setup();
    apply(
      r,
      "h",
      { type: "present", file, expectedRevision: 0, generation: 0 },
      2000,
    );
    assert.throws(
      () => apply(r, "h", { type: end, generation: 0 }, 2001),
      /PRESENTATION_ACTIVE/,
    );
    apply(
      r,
      "h",
      {
        type: "stop-presentation",
        fileId: file.fileId,
        expectedRevision: r.presentation!.revision,
      },
      2002,
    );
    apply(r, "h", { type: end, generation: 0 }, 2003);
    assert.equal(r.presentation, undefined);
  }
  const r = setup();
  apply(
    r,
    "h",
    { type: "present", file, expectedRevision: 0, generation: 0 },
    2000,
  );
  r.members.push({
    ...r.members[0],
    id: "v",
    name: "Guest",
    seat: 1,
    connectionId: "live",
  });
  apply(r, "h", { type: "transfer", id: "v" }, 2001);
  apply(r, "h", { type: "leave" }, 2002);
  assert.equal(r.presentation, undefined);
  const dead = setup();
  apply(
    dead,
    "h",
    { type: "present", file, expectedRevision: 0, generation: 0 },
    2000,
  );
  dead.members[0].deadline = 2100;
  sweep(dead, 2200);
  assert.equal(dead.presentation, undefined);
});
test("pending DTOs hide filenames; media and document transfer capabilities remain distinct", () => {
  const r = setup();
  requestJoin(r, "v", "Guest", 2000);
  apply(
    r,
    "h",
    { type: "present", file, expectedRevision: 0, generation: 0 },
    2001,
  );
  assert.equal(JSON.stringify(view(r, "v")).includes(file.name), false);
  r.current!.source = {
    kind: "local",
    fileId: "movie-file",
    ownerId: "h",
    name: "movie.mp4",
    mime: "video/mp4",
    size: 100,
  };
  r.queue = [
    {
      id: "queued",
      videoId: "",
      source: { ...r.current!.source, fileId: "queued-file" },
    },
  ];
  assert.equal(sharedFile(r, file.fileId)?.kind, "document");
  assert.equal(sharedFile(r, "movie-file"), undefined);
  assert.equal(sharedFile(r, "queued-file"), undefined);
  apply(
    r,
    "h",
    {
      type: "stop-presentation",
      fileId: file.fileId,
      expectedRevision: r.presentation!.revision,
    },
    2003,
  );
  assert.equal(sharedFile(r, "movie-file")?.kind, "local");
  assert.equal(sharedFile(r, file.fileId), undefined);
});
test("raster dimensions reject pixel bombs and animated WebP before bitmap allocation", () => {
  const png = new Uint8Array(24),
    view = new DataView(png.buffer);
  view.setUint32(16, 320);
  view.setUint32(20, 180);
  assert.deepEqual(imageDimensions(png, "image/png"), {
    width: 320,
    height: 180,
  });
  view.setUint32(16, 100000);
  view.setUint32(20, 100000);
  assert.throws(() => imageDimensions(png, "image/png"), /16 triệu/);
  assert.throws(() => imageDimensions(new Uint8Array(2), "image/jpeg"));
  const webp = new Uint8Array(30);
  webp.set(new TextEncoder().encode("VP8X"), 12);
  new DataView(webp.buffer).setUint32(16, 10, true);
  webp[20] = 2;
  assert.throws(() => imageDimensions(webp, "image/webp"), /WebP tĩnh/);
});
test("all emotion variants preserve legacy wire kinds, validate pairing and anonymize DTOs", () => {
  assert.equal(reactionChoices.length, 9);
  for (const [variant, preset] of Object.entries(reactionVariants)) {
    const r = setup();
    const command = commandSchema.parse({
      type: "reaction",
      kind: preset.kind,
      variant,
    });
    apply(r, "h", command, 2000);
    const dto = view(r, "h");
    assert("room" in dto);
    const event = dto.room!.reaction!;
    assert.equal(event.variant, variant);
    assert.equal("memberId" in event, false);
    assert.equal("name" in event, false);
    assert.equal(
      reactionPreset(preset.kind, event.variant).label,
      preset.label,
    );
  }
  const r = setup();
  assert.throws(
    () =>
      apply(r, "h", { type: "reaction", kind: "sad", variant: "love" }, 2000),
    /INVALID_REACTION/,
  );
  assert.equal(
    commandSchema.safeParse({ type: "reaction", kind: "love" }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "reaction",
      kind: "sad",
      variant: "unknown",
    }).success,
    false,
  );
});

test("document capabilities cannot collide with queued or active movie file IDs", () => {
  const r = setup();
  r.queue = [
    {
      id: "local",
      videoId: "",
      source: {
        kind: "local",
        fileId: file.fileId,
        ownerId: "h",
        name: "a.mp4",
        size: 100,
        mime: "video/mp4",
      },
    },
  ];
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "present", file, expectedRevision: 0, generation: 0 },
        2000,
      ),
    /INVALID_DOCUMENT/,
  );
});

test("nine relay cursors plus socket throttles stay below the 2 KiB attachment budget", () => {
  const attachment = {
    id: "h".repeat(64),
    session: "s".repeat(36),
    connectionId: "c".repeat(36),
    window: 1794570000000,
    count: 40,
    fileWindow: 1794570000000,
    fileCount: 120,
    lastLookAt: 1794570000000,
    lastClockAt: 1794570000000,
    relay: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [
        String(i).padStart(64, "0"),
        {
          fileId: file.fileId,
          offset: 100 * 1024 * 1024,
          requestedAt: 1794570000000,
        },
      ]),
    ),
  };
  assert(
    new TextEncoder().encode(JSON.stringify(attachment)).byteLength < 2048,
  );
});

test("late WebRTC failure cannot close the resumed movie transfer after document mode", async () => {
  const original = globalThis.RTCPeerConnection;
  class FakePeer {
    static all: FakePeer[] = [];
    closed = false;
    resolve!: (offer: RTCSessionDescriptionInit) => void;
    reject!: (error: Error) => void;
    constructor() {
      FakePeer.all.push(this);
    }
    createDataChannel() {
      return { binaryType: "", close() {} };
    }
    createOffer() {
      return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    async setLocalDescription() {}
    close() {
      this.closed = true;
    }
  }
  globalThis.RTCPeerConnection =
    FakePeer as unknown as typeof RTCPeerConnection;
  const signals: unknown[] = [],
    share = new FileShare((message) => signals.push(message)),
    r = setup();
  r.current!.source = {
    kind: "local",
    fileId: "10000000-0000-4000-8000-000000000001",
    ownerId: "h",
    name: "movie.mp4",
    mime: "video/mp4",
    size: 100,
  };
  r.members.push({ ...r.members[0], id: "v", name: "Guest", seat: 1 });
  try {
    share.setRoom(r, "v");
    share.transport(true);
    const first = FakePeer.all[0];
    assert(first);
    share.setRoom(
      {
        ...r,
        presentation: {
          source: { ...file, kind: "document", ownerId: "h" },
          page: 1,
          revision: 1,
        },
      },
      "v",
    );
    assert(first.closed);
    share.setRoom(r, "v");
    const second = FakePeer.all[1];
    assert(second);
    first.reject(Error("old connection cancelled"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(second.closed, false);
    second.resolve({ type: "offer", sdp: "fixture" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(signals.length, 1);
    assert.equal(share.snapshot().error, undefined);
  } finally {
    share.dispose();
    globalThis.RTCPeerConnection = original;
  }
});

test("extreme PDF page aspect ratios remain within axis and pixel budgets", () => {
  for (const economical of [true, false])
    for (const [w, h] of [
      [960, 540],
      [600, 1200],
      [0.000001, 1e9],
      [1e9, 0.000001],
      [1e-200, 1e200],
      [1e-160, 1e-160],
    ]) {
      const out = documentRasterSize(w, h, economical);
      assert(out.width >= 1 && out.height >= 1);
      assert(out.width <= (economical ? 1440 : 1920));
      assert(out.height <= (economical ? 1440 : 1920));
      assert(out.width * out.height <= (economical ? 1048576 : 2073600));
    }
  for (const [w, h] of [
    [0, 100],
    [100, -1],
    [NaN, 100],
    [Infinity, 100],
    [1e-200, 1e-200],
  ])
    assert.throws(() => documentRasterSize(w, h, false));
});
