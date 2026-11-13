import {
  documentMime,
  documentMetadataSchema,
  type DocumentFile,
  type SharedFile,
} from "../shared/presentation";
import {
  MAX_RELAY_BYTES,
  CHUNK_BYTES,
  packFileChunk,
  unpackFileChunk,
} from "../shared/fileRelay";
import type { Room } from "../shared/model";
import { MAX_LOCAL_BYTES, localMime, type LocalMedia } from "../shared/media";
import { fileSignalSchema, type FileSignal } from "../shared/fileSignal";
type Peer = {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  fileId: string;
  timer: ReturnType<typeof setTimeout>;
  ice: RTCIceCandidateInit[];
};
export type FileProgress = {
  url?: string;
  received: number;
  size: number;
  error?: string;
};
const mediaUnavailable =
  "Không nhận được file. Người gửi cần giữ tab mở; hãy thử lại hoặc dùng link video công khai.";
export class FileShare {
  private get unavailable() {
    return this.mode === "document"
      ? "Chưa nhận được tài liệu. Mở Tương tác → Trình chiếu để thử nhận qua phòng. Người gửi cần giữ tab mở."
      : mediaUnavailable;
  }
  private room: Room | null = null;
  private id = "";
  private connected = false;
  private owned = new Map<
    string,
    { file: File; url: string; pending: boolean }
  >();
  private received?: { fileId: string; url: string };
  private peers = new Map<string, Peer>();
  private listeners = new Set<() => void>();
  private state: FileProgress = { received: 0, size: 0 };
  private relay?: {
    owner: string;
    fileId: string;
    chunks: ArrayBuffer[];
    total: number;
    timer: ReturnType<typeof setTimeout>;
  };
  private outgoing = new Map<
    string,
    { fileId: string; ack?: (offset: number) => void; cancel?: () => void }
  >();
  constructor(
    private send: (msg: FileSignal | ArrayBuffer) => void,
    private mode: "media" | "document" = "media",
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private update(v: FileProgress) {
    this.state = v;
    this.listeners.forEach((f) => f());
  }
  private close(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    this.peers.delete(id);
    clearTimeout(p.timer);
    p.dc?.close();
    p.pc.close();
  }
  private clearRelay() {
    if (this.relay) clearTimeout(this.relay.timer);
    this.relay = undefined;
    for (const v of this.outgoing.values()) v.cancel?.();
    this.outgoing.clear();
  }
  private clear() {
    this.clearRelay();
    for (const id of this.peers.keys()) this.close(id);
    for (const f of this.owned.values()) URL.revokeObjectURL(f.url);
    this.owned.clear();
    if (this.received) URL.revokeObjectURL(this.received.url);
    this.received = undefined;
    this.update({ received: 0, size: 0 });
  }
  setRoom(room: Room | null, id: string) {
    if (this.room?.session !== room?.session || id !== this.id) this.clear();
    const wasDocument = this.mode === "media" && !!this.room?.presentation;
    const old =
      this.mode === "document" ? this.source()?.fileId : this.room?.current?.id;
    this.room = room;
    this.id = id;
    const all =
      this.mode === "document"
        ? [room?.presentation?.source]
        : [room?.current?.source, ...(room?.queue || []).map((i) => i.source)];
    for (const [key, f] of this.owned)
      if (
        !f.pending &&
        !all.some(
          (s) =>
            (s?.kind === "local" || s?.kind === "document") && s.fileId === key,
        )
      ) {
        URL.revokeObjectURL(f.url);
        this.owned.delete(key);
      }
    if (
      old !==
      (this.mode === "document" ? this.source()?.fileId : room?.current?.id)
    ) {
      this.clearRelay();
      for (const key of this.peers.keys()) this.close(key);
      if (this.received) {
        URL.revokeObjectURL(this.received.url);
        this.received = undefined;
      }
      this.update({ received: 0, size: 0 });
    }
    for (const key of this.peers.keys())
      if (!room?.members.some((m) => m.id === key)) this.close(key);
    const documentActive = this.mode === "media" && !!room?.presentation;
    if (wasDocument !== documentActive) {
      this.clearRelay();
      for (const key of this.peers.keys()) this.close(key);
      if (!this.state.url)
        this.update({ received: 0, size: this.source()?.size || 0 });
    }
    this.ensure();
  }
  transport(ready: boolean) {
    this.connected = ready;
    if (!ready) {
      this.clearRelay();
      for (const id of this.peers.keys()) this.close(id);
    } else this.ensure();
  }
  dispose() {
    this.connected = false;
    this.room = null;
    this.clear();
  }
  prepareDocument(file: File, pages: number): DocumentFile {
    if (this.mode !== "document") throw Error("Luồng tài liệu chưa sẵn sàng.");
    const metadata = documentMetadataSchema.parse({
      fileId: crypto.randomUUID(),
      name: file.name.slice(0, 120),
      size: file.size,
      mime: documentMime(file.name, file.type),
      pages,
    });
    if (
      [...this.owned.values()].reduce((n, v) => n + v.file.size, 0) +
        file.size >
      40 * 1024 * 1024
    )
      throw Error(
        "Chỉ giữ tối đa tài liệu hiện tại và một file thay thế (40 MB).",
      );
    const url = URL.createObjectURL(file);
    this.owned.set(metadata.fileId, { file, url, pending: true });
    return { ...metadata, kind: "document", ownerId: this.id };
  }
  async prepare(file: File): Promise<LocalMedia> {
    if (this.mode !== "media")
      throw Error("Hãy chọn tài liệu từ mục Trình chiếu.");
    const mime = localMime(file.name, file.type);
    if (!mime)
      throw Error("Hãy chọn MP4, WebM, MOV hoặc audio MP3, M4A, Ogg, WAV.");
    if (!file.size || file.size > MAX_LOCAL_BYTES)
      throw Error("File cần có dung lượng từ 1 byte đến 100 MB.");
    if (
      [...this.owned.values()].reduce((sum, f) => sum + f.file.size, 0) +
        file.size >
      250 * 1024 * 1024
    )
      throw Error(
        "Các file đang chia sẻ vượt 250 MB. Hãy xóa bớt mục trong playlist trước.",
      );
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        const finish = (e?: Error) => {
          clearTimeout(timer);
          v.removeAttribute("src");
          v.load();
          e ? reject(e) : resolve();
        };
        const timer = setTimeout(
          () =>
            finish(
              Error("Không đọc được nội dung. Hãy kiểm tra định dạng file."),
            ),
          8000,
        );
        v.onloadedmetadata = () => {
          v.onloadedmetadata = null;
          v.onerror = null;
          finish(
            Number.isFinite(v.duration) && v.duration > 0
              ? undefined
              : Error("File không có thời lượng hợp lệ."),
          );
        };
        v.onerror = () => {
          v.onloadedmetadata = null;
          v.onerror = null;
          finish(Error("Trình duyệt không hỗ trợ codec của file này."));
        };
        v.src = url;
      });
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
    const fileId = crypto.randomUUID();
    this.owned.set(fileId, { file, url, pending: true });
    return {
      kind: "local",
      fileId,
      ownerId: this.id,
      name: file.name.slice(0, 120),
      size: file.size,
      mime: mime as LocalMedia["mime"],
    };
  }
  confirm(fileId: string) {
    const f = this.owned.get(fileId);
    if (f) f.pending = false;
    this.ensure();
  }
  remove(fileId: string) {
    const f = this.owned.get(fileId);
    if (f) URL.revokeObjectURL(f.url);
    this.owned.delete(fileId);
  }
  async restore(file: File, documentPages?: number) {
    const s = this.source();
    if (!s || s.ownerId !== this.id) throw Error(this.unavailable);
    if (file.name.slice(0, 120) !== s.name || file.size !== s.size)
      throw Error("Hãy chọn lại đúng file đã chia sẻ.");
    if (
      s.kind === "document" &&
      (documentPages !== s.pages ||
        documentMime(file.name, file.type) !== s.mime)
    )
      throw Error("Tài liệu không khớp số trang hoặc định dạng ban đầu.");
    const prepared =
      s.kind === "document"
        ? this.prepareDocument(file, documentPages!)
        : await this.prepare(file);
    const f = this.owned.get(prepared.fileId)!;
    this.owned.delete(prepared.fileId);
    this.remove(s.fileId);
    this.owned.set(s.fileId, { ...f, pending: false });
    this.ensure();
  }
  isOwner() {
    return this.source()?.ownerId === this.id;
  }
  relayError(fileId?: string) {
    if (fileId && fileId !== this.source()?.fileId) return;
    if (this.state.url) return;
    this.clearRelay();
    this.update({
      ...this.state,
      error:
        "Không nhận được file qua phòng. Chờ 10 giây rồi thử lại hoặc dùng link công khai.",
    });
  }
  receiveViaRoom() {
    const s = this.source();
    if (!s || s.ownerId === this.id) return;
    if (s.size > MAX_RELAY_BYTES) {
      this.update({
        ...this.state,
        error:
          "Nhận qua phòng hỗ trợ tối đa 25 MB. Hãy dùng link công khai hoặc kết nối trực tiếp.",
      });
      return;
    }
    for (const id of this.peers.keys()) this.close(id);
    this.clearRelay();
    this.relay = {
      owner: s.ownerId,
      fileId: s.fileId,
      chunks: [],
      total: 0,
      timer: setTimeout(() => this.relayError(), 30000),
    };
    this.update({ received: 0, size: s.size });
    try {
      this.emit(s.ownerId, { type: "relay-request" });
    } catch {
      this.relayError();
    }
  }
  onChunk(packet: ArrayBuffer) {
    const r = this.relay,
      s = this.source();
    if (!r || !s) return;
    try {
      const { header: h, bytes } = unpackFileChunk(packet);
      if (
        h.from !== r.owner ||
        h.fileId !== r.fileId ||
        h.session !== this.room?.session ||
        h.offset !== r.total ||
        r.total + bytes.byteLength > s.size
      )
        throw Error("INVALID_FILE_CHUNK");
      r.chunks.push(bytes);
      r.total += bytes.byteLength;
      clearTimeout(r.timer);
      r.timer = setTimeout(() => this.relayError(), 30000);
      const complete = r.total === s.size;
      if (r.total % 262144 === 0 || complete)
        this.emit(r.owner, { type: "relay-ack", offset: r.total });
      if (complete) {
        const url = URL.createObjectURL(new Blob(r.chunks, { type: s.mime }));
        this.received = { fileId: s.fileId, url };
        this.clearRelay();
        this.update({ url, received: s.size, size: s.size });
      } else this.update({ received: r.total, size: s.size });
    } catch {
      this.relayError();
    }
  }
  private async transmitRelay(id: string, fileId: string) {
    const f = this.owned.get(fileId),
      s = this.source();
    if (!f || !s || f.file.size > MAX_RELAY_BYTES) {
      this.emit(id, { type: "unavailable" });
      return;
    }
    this.close(id);
    this.outgoing.get(id)?.cancel?.();
    const state: {
      fileId: string;
      ack?: (offset: number) => void;
      cancel?: () => void;
    } = { fileId };
    this.outgoing.set(id, state);
    try {
      for (let pos = 0; pos < f.file.size;) {
        if (this.outgoing.get(id) !== state || this.source()?.fileId !== fileId)
          return;
        const end = Math.min(pos + 262144, f.file.size);
        const acknowledged = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            state.ack = undefined;
            reject(Error("timeout"));
          }, 15000);
          state.ack = (offset) => {
            if (offset === end) {
              clearTimeout(timer);
              state.ack = undefined;
              resolve();
            }
          };
          state.cancel = () => {
            clearTimeout(timer);
            reject(Error("cancelled"));
          };
        });
        // Await this promise even if sending fails, to avoid an unhandled rejection.
        const sent = (async () => {
          for (; pos < end; pos += CHUNK_BYTES) {
            const bytes = await f.file
              .slice(pos, Math.min(end, pos + CHUNK_BYTES))
              .arrayBuffer();
            if (this.outgoing.get(id) !== state) throw Error("cancelled");
            this.send(
              packFileChunk(
                { session: this.room!.session, fileId, to: id, offset: pos },
                bytes,
              ),
            );
          }
        })();
        try {
          await sent;
          await acknowledged;
        } catch (e) {
          state.cancel?.();
          await acknowledged.catch(() => {});
          throw e;
        }
      }
    } catch {
      try {
        this.emit(id, { type: "unavailable" });
      } catch {}
    } finally {
      if (this.outgoing.get(id) === state) this.outgoing.delete(id);
    }
  }
  private source() {
    if (this.mode === "document")
      return this.room?.presentation?.source || null;
    const s = this.room?.current?.source;
    return s?.kind === "local" ? s : null;
  }
  retry() {
    this.clearRelay();
    for (const id of this.peers.keys()) this.close(id);
    this.update({ received: 0, size: this.source()?.size || 0 });
    this.ensure();
  }
  private emit(to: string, signal: FileSignal["signal"]) {
    const s = this.source();
    if (!s || !this.connected || !this.room) throw Error(this.unavailable);
    this.send({
      type: "file-signal",
      session: this.room.session,
      to,
      fileId: s.fileId,
      signal,
    });
  }
  private ensure() {
    if (this.mode === "media" && this.room?.presentation) return;
    const s = this.source();
    if (!s) return;
    const f = this.owned.get(s.fileId);
    if (f) {
      if (this.state.url !== f.url)
        this.update({ url: f.url, received: s.size, size: s.size });
      return;
    }
    if (this.received?.fileId === s.fileId) return;
    if (s.ownerId === this.id) {
      this.update({
        received: 0,
        size: s.size,
        error: "Chọn lại file đã chia sẻ sau khi tải lại trang.",
      });
      return;
    }
    if (
      !this.connected ||
      this.relay ||
      this.peers.has(s.ownerId) ||
      this.state.error
    )
      return;
    if (!this.room?.members.some((m) => m.id === s.ownerId)) {
      this.update({ received: 0, size: s.size, error: this.unavailable });
      return;
    }
    this.update({ received: 0, size: s.size });
    const request = this.request(s),
      peer = this.peers.get(s.ownerId);
    void request.catch(() => {
      if (this.peers.get(s.ownerId) === peer) this.fail(s.ownerId, s.fileId);
    });
  }
  private fail(id: string, fileId: string) {
    if (this.peers.get(id)?.fileId && this.peers.get(id)!.fileId !== fileId)
      return;
    if (this.mode === "media" && this.room?.presentation) return;
    this.close(id);
    if (this.source()?.fileId === fileId && !this.state.url)
      this.update({ ...this.state, error: this.unavailable });
  }
  private peer(id: string, fileId: string) {
    this.close(id);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
    });
    const p: Peer = {
      pc,
      fileId,
      ice: [],
      timer: setTimeout(() => this.fail(id, fileId), 60000),
    };
    this.peers.set(id, p);
    pc.onicecandidate = (e) => {
      if (e.candidate && this.peers.get(id) === p)
        try {
          this.emit(id, {
            type: "ice",
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        } catch {
          this.fail(id, fileId);
        }
    };
    pc.onconnectionstatechange = () => {
      if (
        ["failed", "closed"].includes(pc.connectionState) &&
        this.peers.get(id) === p
      )
        this.fail(id, fileId);
    };
    return p;
  }
  private async request(s: SharedFile) {
    const p = this.peer(s.ownerId, s.fileId),
      dc = p.pc.createDataChannel("video", { ordered: true });
    p.dc = dc;
    dc.binaryType = "arraybuffer";
    let started = false,
      total = 0,
      last = 0;
    const chunks: ArrayBuffer[] = [];
    dc.onmessage = (e) => {
      if (this.peers.get(s.ownerId) !== p) return;
      if (typeof e.data === "string") {
        if (e.data === "start" && !started) {
          started = true;
          return;
        }
        if (e.data === "done" && started && total === s.size) {
          const url = URL.createObjectURL(new Blob(chunks, { type: s.mime }));
          this.received = { fileId: s.fileId, url };
          this.update({ url, received: total, size: s.size });
          this.close(s.ownerId);
          return;
        }
        this.fail(s.ownerId, s.fileId);
        return;
      }
      if (
        !started ||
        !(e.data instanceof ArrayBuffer) ||
        total + e.data.byteLength > s.size
      ) {
        this.fail(s.ownerId, s.fileId);
        return;
      }
      chunks.push(e.data);
      total += e.data.byteLength;
      clearTimeout(p.timer);
      p.timer = setTimeout(() => this.fail(s.ownerId, s.fileId), 60000);
      if (performance.now() - last > 80) {
        last = performance.now();
        this.update({ received: total, size: s.size });
      }
    };
    dc.onclose = () => {
      if (this.peers.get(s.ownerId) === p) this.fail(s.ownerId, s.fileId);
    };
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    if (this.peers.get(s.ownerId) === p)
      this.emit(s.ownerId, { type: "offer", sdp: offer.sdp! });
  }
  async onSignal(raw: unknown) {
    const parsed = fileSignalSchema.safeParse({
      ...(raw as object),
      to: this.id,
    });
    if (!parsed.success) return;
    const msg = parsed.data,
      from = (raw as { from?: string }).from,
      s = this.source();
    if (
      !from ||
      !s ||
      msg.session !== this.room?.session ||
      msg.fileId !== s.fileId ||
      !this.room?.members.some((m) => m.id === from)
    )
      return;
    let handlingPeer: Peer | undefined;
    try {
      if (msg.signal.type === "relay-request") {
        if (s.ownerId === this.id) void this.transmitRelay(from, s.fileId);
        return;
      }
      if (msg.signal.type === "relay-ack") {
        if (s.ownerId === this.id)
          this.outgoing.get(from)?.ack?.(msg.signal.offset);
        return;
      }
      if (msg.signal.type === "unavailable" && this.relay?.owner === from) {
        this.relayError();
        return;
      }
      if (msg.signal.type === "offer") {
        if (s.ownerId !== this.id) return;
        const f = this.owned.get(s.fileId);
        if (!f) {
          this.emit(from, { type: "unavailable" });
          return;
        }
        const p = this.peer(from, s.fileId);
        handlingPeer = p;
        p.pc.ondatachannel = (e) => {
          if (this.peers.get(from) !== p) return;
          e.channel.onopen = () => {
            void this.transmit(from, p, e.channel, f.file).catch(() =>
              this.close(from),
            );
          };
          p.dc = e.channel;
        };
        await p.pc.setRemoteDescription({ type: "offer", sdp: msg.signal.sdp });
        for (const c of p.ice) await p.pc.addIceCandidate(c);
        p.ice = [];
        const answer = await p.pc.createAnswer();
        await p.pc.setLocalDescription(answer);
        if (this.peers.get(from) === p)
          this.emit(from, { type: "answer", sdp: answer.sdp! });
      } else {
        const p = this.peers.get(from);
        if (!p) return;
        handlingPeer = p;
        if (msg.signal.type === "unavailable") {
          this.fail(from, s.fileId);
          return;
        }
        if (msg.signal.type === "answer") {
          await p.pc.setRemoteDescription({
            type: "answer",
            sdp: msg.signal.sdp,
          });
          for (const c of p.ice) await p.pc.addIceCandidate(c);
          p.ice = [];
        }
        if (msg.signal.type === "ice") {
          const c = {
            candidate: msg.signal.candidate,
            sdpMid: msg.signal.sdpMid,
            sdpMLineIndex: msg.signal.sdpMLineIndex,
          };
          if (p.pc.remoteDescription) await p.pc.addIceCandidate(c);
          else if (p.ice.length < 32) p.ice.push(c);
        }
      }
    } catch {
      if (!handlingPeer || this.peers.get(from) === handlingPeer)
        this.fail(from, s.fileId);
    }
  }
  private async transmit(id: string, p: Peer, dc: RTCDataChannel, file: File) {
    clearTimeout(p.timer);
    p.timer = setTimeout(() => this.close(id), 120000);
    dc.bufferedAmountLowThreshold = 65536;
    dc.send("start");
    for (let pos = 0; pos < file.size; pos += 16384) {
      if (this.peers.get(id) !== p || dc.readyState !== "open") return;
      if (dc.bufferedAmount > 262144)
        await new Promise<void>((resolve, reject) => {
          const finish = (e?: Error) => {
            clearTimeout(timer);
            dc.removeEventListener("bufferedamountlow", low);
            dc.removeEventListener("close", closed);
            e ? reject(e) : resolve();
          };
          const low = () => finish(),
            closed = () => finish(Error(this.unavailable)),
            timer = setTimeout(closed, 15000);
          dc.addEventListener("bufferedamountlow", low, { once: true });
          dc.addEventListener("close", closed, { once: true });
          if (dc.bufferedAmount <= 65536) finish();
        });
      const bytes = await file.slice(pos, pos + 16384).arrayBuffer();
      if (this.peers.get(id) !== p || dc.readyState !== "open") return;
      dc.send(bytes);
    }
    dc.send("done");
  }
}
