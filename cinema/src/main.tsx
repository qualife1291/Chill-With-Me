import PlaybackReadiness from "./PlaybackReadiness";
import RoomControls from "./RoomControls";
import InvitationControls from "./InvitationControls";
import PlaylistImport from "./PlaylistImport";
import { useRoomClock } from "./useRoomClock";
import { useSceneQuality } from "./useSceneQuality";
import { useModalFocus } from "./useModalFocus";
import { FileShare } from "./FileShare";
import { mediaLabel, FILE_ACCEPT } from "../shared/media";
import { spaces, spaceInfo, type Space } from "../shared/spaces";
import { heldLookStep } from "../shared/lookInput";
import React, {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Film,
  Users,
  ArrowRight,
  Plus,
  Send,
  SkipForward,
  Play,
  Pause,
  Armchair,
  Eye,
  PersonStanding,
  LogOut,
  Check,
  X,
  Volume2,
  Info,
  MessageCircle,
  ListVideo,
  Gamepad2,
  Maximize,
  RotateCcw,
  MousePointer2,
} from "lucide-react";
import {
  apply,
  createRoom,
  type Room,
  type Command,
  type Member,
} from "../shared/model";
import Player from "./Player";
import RoomActivity from "./RoomActivity";
import { useRoomSounds } from "./useRoomSounds";
import { useChatSpeech } from "./useChatSpeech";
import { useHeadDrag } from "./useHeadDrag";
import "./style.css";
import { useReducedMotion } from "./useReducedMotion";
const AvatarPreview = lazy(() => import("./AvatarPreview"));
const Lobby = lazy(() => import("./Lobby"));
const Cinema = React.memo(lazy(() => import("./Cinema")));
const demo = new URLSearchParams(location.search).has("demo");
const invitedSlot = Number(new URLSearchParams(location.search).get("room"));
const invitedKey = new URLSearchParams(location.hash.slice(1)).get("invite");
const invitedSession = new URLSearchParams(location.search).get("session");
type Snapshot = {
  status: string;
  room?: Room;
  serverTime?: number;
  session?: string;
  reason?: string;
};
type Summary = {
  space?: Space;
  recovering?: boolean;
  private?: boolean;
  slot: number;
  open: boolean;
  title?: string;
  capacity?: number;
  count?: number;
};
const errors: Record<string, string> = {
  HOST_RECONNECTING:
    "Chủ phòng đang mất kết nối. Hãy đợi chủ quay lại trước khi xin vào.",
  NETWORK_ERROR: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
  NETWORK_TIMEOUT: "Kết nối phản hồi chậm. Hãy thử lại sau một chút.",
  STALE_SESSION: "Phiên phòng cũ đã kết thúc. Hãy chọn lại phòng ở sảnh.",
  FORBIDDEN: "Bạn không còn quyền thực hiện thao tác trong phiên phòng này.",
  REQUEST_EXPIRED: "Yêu cầu vào phòng đã hết hạn. Hãy gửi lại yêu cầu.",
  REQUEST_QUEUE_FULL: "Có nhiều người đang chờ duyệt. Hãy thử lại sau.",
  INVALID_INPUT: "Thông tin chưa hợp lệ. Hãy kiểm tra rồi thử lại.",
  FAILED: "Chưa thực hiện được thao tác. Hãy thử lại.",
  REACTION_BUSY: "Cảm xúc đang diễn ra. Đợi một chút nhé.",
  REACTION_COOLDOWN: "Bạn chờ 5 giây giữa hai cảm xúc nhé.",
  INVITE_REQUIRED: "Phòng riêng cần link mời hợp lệ từ chủ phòng.",
  NOT_PRIVATE_ROOM: "Phòng này không dùng lời mời riêng.",
  IMPORT_TOO_LARGE: "Danh sách tối đa 16 KB.",
  IMPORT_TOO_MANY: "Mỗi lần nhập tối đa 20 link.",
  INVITE_EXPIRED: "Phiên phòng trong link mời đã kết thúc. Hãy xin link mới.",
  ROOM_WAITING:
    "Có thành viên đang quảng cáo hoặc tải video. Hãy chờ hoặc dùng nút tiếp tục dù còn người chờ.",
  ROOM_FULL: "Phòng đã đủ chỗ.",
  TARGET_OFFLINE: "Người nhận quyền cần đang kết nối.",
  MEMBERSHIP_EXPIRED: "Chỗ giữ đã hết hạn. Hãy xin vào lại.",
  HOST_ONLY: "Chỉ chủ phòng được thực hiện.",
  BANNED: "Bạn không thể vào lại phiên chiếu này.",
  SLOT_BUSY: "Phòng vừa được tạo. Hãy chọn phòng khác.",
  INVALID_MEDIA_URL:
    "Hãy nhập link YouTube, Google Drive công khai hoặc video MP4/WebM/MOV/MP3/M4A/Ogg/WAV qua HTTPS.",
  INVALID_YOUTUBE_URL: "Hãy nhập link video YouTube hợp lệ.",
  RATE_LIMITED: "Thao tác hơi nhanh. Hãy chờ một chút.",
  STALE_GENERATION: "Video đã thay đổi. Hãy thử lại.",
  ROOM_CLOSED: "Phòng đã đóng.",
  VIDEO_ALREADY_SELECTED:
    "Phòng đã có video. Hãy dùng playlist để thêm mục tiếp theo.",
  NO_VIDEO: "Chưa có video đang phát.",
  STALE_QUEUE:
    "Playlist vừa thay đổi. Danh sách đã được cập nhật; hãy chọn lại thao tác.",
  QUEUE_FULL: "Playlist đã đủ 50 video. Hãy xóa bớt trước khi thêm.",
  INVALID_QUEUE_ITEM: "Video này không còn trong playlist.",
  INVALID_SUGGESTION: "Đề xuất này đã được xử lý.",
  SUGGESTION_LIMIT: "Bạn được giữ tối đa 3 đề xuất chờ duyệt.",
  SUGGESTION_COOLDOWN: "Hãy chờ 10 giây giữa hai lần đề xuất.",
  DUPLICATE_SUGGESTION: "Bạn đã đề xuất video này rồi.",
};
async function api(path: string, data?: unknown, signal?: AbortSignal) {
  let r: Response;
  try {
    r = await fetch("/api" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: signal || AbortSignal.timeout(12000),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw Error(
      e instanceof DOMException && e.name === "TimeoutError"
        ? "NETWORK_TIMEOUT"
        : "NETWORK_ERROR",
    );
  }
  let value;
  try {
    value = await r.json();
  } catch {
    throw Error("NETWORK_ERROR");
  }
  if (!r.ok) throw Error(value.error || "NETWORK_ERROR");
  return value;
}

function App() {
  const [id, setId] = useState(""),
    [slot, setSlot] = useState<number | null>(null),
    [room, setRoom] = useState<Room | null>(null),
    [status, setStatus] = useState("lobby"),
    [pendingSession, setPendingSession] = useState(""),
    [summaries, setSummaries] = useState<Summary[]>(
      [1, 2, 3].map((slot) => ({ slot, open: false })),
    ),
    [name, setName] = useState(""),
    [title, setTitle] = useState("Tối cùng chúng mình"),
    [capacity, setCapacity] = useState(6),
    [visibility, setVisibility] = useState<"public" | "private">("public"),
    [error, setError] = useState(""),
    [tab, setTab] = useState("chat"),
    [camera, setCamera] = useState("orbit"),
    [zoom, setZoom] = useState(0),
    [yaw, setYaw] = useState(0),
    [pitch, setPitch] = useState(0),
    [bodyYaw, setBodyYaw] = useState<0 | 180>(0),
    [quickLink, setQuickLink] = useState(""),
    [quickBusy, setQuickBusy] = useState(false),
    [panel, setPanel] = useState<"" | "chat" | "queue" | "people" | "info">(""),
    [showControls, setShowControls] = useState(false),
    [approvalDismissed, setApprovalDismissed] = useState(false),
    [light, setLight] = useState(false),
    [message, setMessage] = useState(""),
    [url, setUrl] = useState(""),
    [connection, setConnection] = useState("Đang kết nối"),
    [tts, setTts] = useState(false);
  const clock = useRoomClock(room?.session),
    offset = clock.offset;
  const sceneQuality = useSceneQuality();
  const [sceneNotice, setSceneNotice] = useState("");
  const sceneUnavailable = React.useCallback(() => {
    setLight(true);
    setSceneNotice("Thiết bị vừa dừng cảnh 3D. Đã chuyển sang chế độ nhẹ.");
  }, []);
  const retryScene = () => {
    setSceneNotice("");
    setLight(false);
  };
  useEffect(() => setSceneNotice(""), [room?.session]);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueNotice, setQueueNotice] = useState("");
  const [entry, setEntry] = useState<{ slot: number; create: boolean } | null>(
    null,
  );
  const entryModal = useRef<HTMLElement>(null),
    entryBusy = useRef(false);
  const [seating, setSeating] = useState<"cinema" | "sofa">("cinema");
  const [space, setSpace] = useState<Space>("cinema");
  const [avatar, setAvatar] = useState<"male" | "female">("male");
  const [appearance, setAppearance] = useState({
    clothing: "#4d6c82",
    hair: "#51372b",
  });
  const [previewSlot, setPreviewSlot] = useState(
    invitedSlot >= 1 && invitedSlot <= 3 ? invitedSlot : 1,
  );
  const [lobbyLight, setLobbyLight] = useState(false);
  const reducedMotion = useReducedMotion();
  const [pendingMessages, setPendingMessages] = useState<
    { id: string; text: string; failed: boolean }[]
  >([]);
  const chatSocket = useRef<WebSocket | null>(null);
  const files = useMemo(
    () =>
      new FileShare((msg) => {
        const socket = chatSocket.current;
        if (socket?.readyState !== WebSocket.OPEN)
          throw Error("Mất kết nối phòng");
        socket.send(msg instanceof ArrayBuffer ? msg : JSON.stringify(msg));
      }),
    [],
  );
  useEffect(() => {
    files.setRoom(status === "joined" ? room : null, id);
  }, [files, room, status, id]);
  useEffect(() => () => files.dispose(), [files]);
  const queueDrag = useRef<{
    id: string;
    revision: number;
    session: string;
  } | null>(null);
  const controlQueue = useRef<Promise<void>>(Promise.resolve());
  const liveLook = useRef(
    new Map<
      string,
      { look: NonNullable<Room["members"][number]["look"]>; session: string }
    >(),
  );
  const history = useRef<HTMLDivElement>(null),
    followChat = useRef(true);
  const waiters = useRef(
    new Map<string, { resolve: () => void; reject: (e: Error) => void }>(),
  );
  const emptyAnnouncements = useRef(new Set<string>());
  const latestRoom = useRef(room);
  latestRoom.current = room;
  const surface = useRef<HTMLDivElement>(null);
  const sidePanel = useRef<HTMLElement>(null),
    infoPanel = useRef<HTMLDivElement>(null),
    panelOpener = useRef<HTMLElement | null>(null),
    previousPanel = useRef("");
  useLayoutEffect(() => {
    if (panel) {
      const node = panel === "info" ? infoPanel.current : sidePanel.current;
      const input =
        panel === "info"
          ? null
          : node?.querySelector<HTMLElement>(".composer input") ||
            node?.querySelector<HTMLElement>(
              'input:not([type="file"]):not(:disabled)',
            ) ||
            node?.querySelector<HTMLElement>("button:not(:disabled)");
      (input || node)?.focus();
    } else if (
      previousPanel.current &&
      panelOpener.current?.isConnected &&
      !panelOpener.current.closest("[inert]")
    )
      panelOpener.current.focus();
    previousPanel.current = panel;
  }, [panel]);
  const approval = useRef<HTMLElement>(null),
    quickModal = useRef<HTMLElement>(null);
  const isHost = room?.host === id && status === "joined";
  const quickActive = !!(isHost && !room?.current && room?.queue.length === 0);
  const approvalActive = !!(
    isHost &&
    room?.pending.length &&
    !approvalDismissed
  );
  const dismissApproval = useMemo(() => () => setApprovalDismissed(true), []);
  const dismissEntry = useMemo(
    () => () => {
      if (!entryBusy.current) setEntry(null);
    },
    [],
  );
  // One lifecycle restores the old modal before isolating the next one.
  useModalFocus(
    entry ? entryModal : approvalActive ? approval : quickModal,
    !!entry || quickActive || approvalActive,
    entry ? dismissEntry : approvalActive ? dismissApproval : undefined,
  );
  const speech = useChatSpeech(room, tts);
  const sounds = useRoomSounds();
  const [busy, setBusy] = useState(false);
  const report = (e: unknown) =>
    setError(
      errors[e instanceof Error ? e.message : ""] ||
        (e instanceof Error ? e.message : "Không thực hiện được."),
    );
  const exitIntent = useRef(false);
  const finishRoom = (reason: string) => {
    latestRoom.current = null;
    setRoom(null);
    setSlot(null);
    setStatus("lobby");
    setPendingSession("");
    setConnection("Sẵn sàng");
    clock.disconnect();
    for (const waiter of waiters.current.values())
      waiter.reject(Error("ROOM_CLOSED"));
    waiters.current.clear();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const voluntary = exitIntent.current;
    exitIntent.current = false;
    setError(
      voluntary
        ? ""
        : reason === "TAB_REPLACED"
          ? "Phòng đã được mở ở tab khác. Tab này đã ngắt kết nối."
          : reason === "ROOM_CLOSED"
            ? "Phòng đã đóng do chủ rời phòng hoặc phiên chiếu kết thúc."
            : reason === "STALE_SESSION"
              ? errors.STALE_SESSION
              : "Yêu cầu hoặc chỗ giữ của bạn đã hết hạn, bị từ chối hoặc đã thu hồi. Hãy chọn lại phòng.",
    );
  };
  const receive = (v: Snapshot) => {
    if (v.status === "removed") {
      finishRoom(v.reason || "MEMBERSHIP_ENDED");
      return;
    }
    if (v.room) {
      const session = v.room.session,
        ids = new Set(v.room.members.map((m) => m.id));
      for (const [id, pose] of liveLook.current)
        if (pose.session !== session || !ids.has(id))
          liveLook.current.delete(id);
      v.room = {
        ...v.room,
        members: v.room.members.map((m) => {
          const recent = liveLook.current.get(m.id);
          return recent && recent.session === session
            ? { ...m, look: recent.look }
            : m;
        }),
      };
    }
    const current = latestRoom.current;
    if (
      v.room &&
      current?.session === v.room.session &&
      v.room.revision < current.revision
    )
      return;
    if (v.room) {
      latestRoom.current = v.room;
      const ids = new Set(v.room.messages.map((m) => m.clientMessageId));
      setPendingMessages((p) => p.filter((m) => !ids.has(m.id)));
    }

    setStatus(v.status);
    if (v.session) setPendingSession(v.session);
    if (v.room) setRoom(v.room);
    if (v.serverTime) clock.fallback(v.serverTime, v.room?.session);
  };
  useEffect(() => {
    if (demo) {
      setId("local-host");
      setConnection("Bản thử cục bộ");
      return;
    }
    void api("/session", {})
      .then((v) => {
        setId(v.id);
        setConnection("Sẵn sàng");
      })
      .catch(report);
  }, []);
  useEffect(() => {
    if (slot || demo) return;
    const refresh = () => void api("/rooms").then(setSummaries).catch(report);
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [slot]);
  useEffect(() => {
    if (!slot || demo) return;
    let stop = false,
      busy = false,
      attempts = 0,
      nextRetryAt = 0;
    let socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    let lastMessageAt = performance.now(),
      connectingAt = performance.now();
    const controller = new AbortController();
    const ended = (e: unknown) =>
      e instanceof Error &&
      ["ROOM_CLOSED", "STALE_SESSION", "MEMBERSHIP_EXPIRED"].includes(
        e.message,
      );
    const schedule = () => {
      if (stop || retry) return;
      const delay = Math.min(15000, 3000 * 2 ** Math.min(attempts++, 3));
      nextRetryAt = performance.now() + delay;
      retry = setTimeout(() => {
        retry = undefined;
        void recover();
      }, delay);
    };
    const snapshot = () =>
      api(
        `/rooms/${slot}/state`,
        undefined,
        AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      );
    const recover = async (force = false) => {
      if (
        stop ||
        busy ||
        (socket &&
          (socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING))
      )
        return;
      if (!force && performance.now() < nextRetryAt) return;
      busy = true;
      if (retry) {
        clearTimeout(retry);
        retry = undefined;
      }
      try {
        const v = await snapshot();
        if (stop) return;
        receive(v);
        if (v.status === "joined") connect();
        else if (v.status === "removed") stop = true;
      } catch (e) {
        if (stop) return;
        if (ended(e)) {
          finishRoom((e as Error).message);
          stop = true;
        } else {
          setConnection("Mất kết nối · đang thử lại");
          schedule();
        }
      } finally {
        busy = false;
      }
    };
    const connect = () => {
      if (stop) return;
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/rooms/${slot}/ws`,
      );
      socket = ws;
      connectingAt = performance.now();
      ws.binaryType = "arraybuffer";
      chatSocket.current = ws;
      ws.onopen = () => {
        if (stop || socket !== ws) {
          ws.close();
          return;
        }
        attempts = 0;
        nextRetryAt = 0;
        lastMessageAt = performance.now();
        setConnection("Đã kết nối");
        clock.connect(ws);
        files.transport(true);
      };
      ws.onmessage = (e) => {
        if (stop || socket !== ws) return;
        lastMessageAt = performance.now();
        if (e.data instanceof ArrayBuffer) {
          files.onChunk(e.data);
          return;
        }
        const v = JSON.parse(e.data);
        if (v.type === "clock") {
          clock.pong(v, ws);
          return;
        }
        if (v.type === "file-error") {
          files.relayError(v.fileId);
          return;
        }
        if (v.type === "file-signal") {
          void files.onSignal(v);
          return;
        }
        if (v.type === "look") {
          const r = latestRoom.current;
          if (
            r &&
            r.session === v.session &&
            r.members.some((m) => m.id === v.id)
          ) {
            liveLook.current.set(v.id, { look: v.look, session: v.session });
            const previous = r.members.find((m) => m.id === v.id)?.look;
            if (
              previous?.yaw === v.look.yaw &&
              previous?.pitch === v.look.pitch &&
              previous?.bodyYaw === v.look.bodyYaw
            )
              return;
            const next = {
              ...r,
              members: r.members.map((m) =>
                m.id === v.id ? { ...m, look: v.look } : m,
              ),
            };
            latestRoom.current = next;
            setRoom(next);
          }
        } else if (v.type === "chat") {
          if (v.message.clientMessageId) {
            waiters.current.get(v.message.clientMessageId)?.resolve();
            setPendingMessages((p) =>
              p.filter((m) => m.id !== v.message.clientMessageId),
            );
          }
          const current = latestRoom.current;
          if (
            current &&
            current.session === v.session &&
            !current.messages.some((m) => m.id === v.message.id)
          ) {
            const next = {
              ...current,
              revision: Math.max(current.revision, v.revision),
              messages: [...current.messages, v.message].slice(-100),
            };
            latestRoom.current = next;
            setRoom(next);
          }
        } else if (v.type === "ack") {
          waiters.current.get(v.commandId)?.resolve();
          setPendingMessages((p) => p.filter((m) => m.id !== v.commandId));
        } else if (v.type === "command-error")
          waiters.current.get(v.commandId)?.reject(Error(v.error));
        else if (v.status) receive(v);
      };
      ws.onclose = (e) => {
        if (stop || socket !== ws) return;
        clock.disconnect(ws);
        files.transport(false);
        if (e.code === 4002) {
          finishRoom("TAB_REPLACED");
          stop = true;
          return;
        }
        setConnection("Đang kết nối lại · giữ chỗ tối đa 30 giây");
        schedule();
      };
    };
    if (status === "joined") connect();
    const poll = setInterval(() => {
      if (stop) return;
      if (status === "pending") {
        if (busy) return;
        busy = true;
        void snapshot()
          .then((v) => {
            if (!stop) receive(v);
          })
          .catch((e) => {
            if (stop) return;
            if (ended(e)) {
              finishRoom((e as Error).message);
              stop = true;
            } else setConnection("Mất kết nối · đang thử lại");
          })
          .finally(() => {
            busy = false;
          });
      } else if (status === "joined") {
        const stuck =
          socket &&
          ((socket.readyState === WebSocket.OPEN &&
            performance.now() - lastMessageAt > 75000) ||
            (socket.readyState === WebSocket.CONNECTING &&
              performance.now() - connectingAt > 15000));
        if (stuck) {
          socket!.close();
          void recover(true);
        } else void recover();
      }
    }, 5000);
    const online = () => {
      if (!document.hidden) void recover(true);
    };
    const hide = () => {
      socket?.close();
    };
    window.addEventListener("online", online);
    window.addEventListener("pageshow", online);
    document.addEventListener("visibilitychange", online);
    window.addEventListener("pagehide", hide);
    return () => {
      stop = true;
      controller.abort();
      clearTimeout(retry);
      clearInterval(poll);
      window.removeEventListener("online", online);
      window.removeEventListener("pageshow", online);
      document.removeEventListener("visibilitychange", online);
      window.removeEventListener("pagehide", hide);
      if (chatSocket.current === socket) chatSocket.current = null;
      files.transport(false);
      clock.disconnect(socket);
      socket?.close();
    };
  }, [slot, status]);
  useLayoutEffect(() => {
    if (followChat.current && history.current)
      history.current.scrollTop = history.current.scrollHeight;
  }, [room?.messages, pendingMessages, tab, panel]);
  async function enter(n: number, create: boolean) {
    if (!name.trim()) {
      setError("Nhập tên của bạn trước nhé.");
      return;
    }
    setBusy(true);
    entryBusy.current = true;
    setError("");
    setYaw(0);
    setPitch(0);
    setBodyYaw(0);
    setZoom(0);
    setPanel("");
    setShowControls(false);
    setTts(speech.enable());
    try {
      if (demo) {
        const r = createRoom(
          id,
          name,
          title,
          capacity,
          Date.now(),
          avatar,
          visibility,
          seating,
          appearance,
          space,
        );
        apply(r, id, { type: "sit" }, Date.now());
        setRoom(r);
        setStatus("joined");
        setEntry(null);
        setSlot(n);
      } else {
        const v = await api(
          `/rooms/${n}/${create ? "create" : "join"}`,
          create
            ? {
                name,
                title,
                capacity,
                avatar,
                visibility,
                seating,
                appearance,
                space,
              }
            : {
                name,
                avatar,
                appearance,
                ...(n === invitedSlot && invitedKey
                  ? { inviteKey: invitedKey }
                  : {}),
                ...(n === invitedSlot && invitedSession
                  ? { session: invitedSession }
                  : {}),
              },
        );
        receive(v);
        setEntry(null);
        setSlot(n);
      }
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
      entryBusy.current = false;
    }
  }
  async function sendChat(c: Extract<Command, { type: "chat" }>) {
    const current = latestRoom.current;
    if (!current) return;
    const commandId = crypto.randomUUID(),
      envelope = { session: current.session, commandId, command: c };
    setPendingMessages((p) => [
      ...p,
      { id: commandId, text: c.text, failed: false },
    ]);
    try {
      if (chatSocket.current?.readyState === WebSocket.OPEN) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(Error("ACK_TIMEOUT")), 2500);
            waiters.current.set(commandId, {
              resolve: () => {
                clearTimeout(timer);
                resolve();
              },
              reject: (e) => {
                clearTimeout(timer);
                reject(e);
              },
            });
            chatSocket.current!.send(JSON.stringify(envelope));
          });
          setPendingMessages((p) => p.filter((m) => m.id !== commandId));
          return;
        } catch (e) {
          if (!(e instanceof Error) || e.message !== "ACK_TIMEOUT") throw e;
        } finally {
          waiters.current.delete(commandId);
        }
      }
      const v = await api(`/rooms/${slot}/command`, envelope);
      if (latestRoom.current?.session === current.session) receive(v);
    } catch (e) {
      if (latestRoom.current?.session !== current.session) return;
      if (
        e instanceof Error &&
        ["ROOM_CLOSED", "STALE_SESSION", "MEMBERSHIP_EXPIRED"].includes(
          e.message,
        )
      ) {
        finishRoom(e.message);
        return;
      }
      setPendingMessages((p) =>
        p.map((m) => (m.id === commandId ? { ...m, failed: true } : m)),
      );
      report(e);
    }
  }
  async function command(c: Command, onSuccess?: () => void) {
    if (c.type === "chat" && !demo) {
      await sendChat(c);
      return;
    }

    const commandSession = room?.session;
    if (c.type === "close" || c.type === "leave") exitIntent.current = true;
    setError("");
    try {
      if (demo && room) {
        if (c.type === "close" || c.type === "leave") {
          setRoom(null);
          setSlot(null);
          setStatus("lobby");
          return;
        }
        const r = structuredClone(room);
        apply(r, id, c, Date.now());
        setRoom(r);
      } else {
        const envelope = {
          session: room?.session,
          commandId: crypto.randomUUID(),
          command: c,
        };
        const send = async () => {
          const v = await api(`/rooms/${slot}/command`, envelope);
          if (latestRoom.current?.session === commandSession) receive(v);
        };
        if (
          [
            "seek",
            "play",
            "pause",
            "next",
            "start",
            "wait",
            "ready",
            "resume",
          ].includes(c.type)
        ) {
          const pending = controlQueue.current.catch(() => {}).then(send);
          controlQueue.current = pending;
          await pending;
        } else await send();
      }
    } catch (e) {
      if (!demo && latestRoom.current?.session !== commandSession) return;
      exitIntent.current = false;
      if (
        e instanceof Error &&
        ["ROOM_CLOSED", "STALE_SESSION", "MEMBERSHIP_EXPIRED"].includes(
          e.message,
        )
      ) {
        finishRoom(e.message);
        return;
      }
      if (e instanceof Error && e.message === "STALE_QUEUE" && !demo)
        await api(`/rooms/${slot}/state`)
          .then(receive)
          .catch(() => {});
      report(e);
      return;
    }
    if (
      demo ||
      latestRoom.current?.session === commandSession ||
      c.type === "close" ||
      c.type === "leave"
    )
      onSuccess?.();
  }
  async function uploadFile(file: File, mode: "start" | "queue") {
    if (!room || quickBusy || queueBusy) return;
    setQuickBusy(true);
    setQueueBusy(true);
    setError("");
    let prepared: Awaited<ReturnType<FileShare["prepare"]>> | undefined,
      ok = false;
    try {
      prepared = await files.prepare(file);
      await command(
        { type: "file", file: prepared, mode, generation: room.generation },
        () => {
          ok = true;
          files.confirm(prepared!.fileId);
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được file");
    } finally {
      if (prepared && !ok) files.remove(prepared.fileId);
      setQuickBusy(false);
      setQueueBusy(false);
    }
  }
  async function queueAction(c: Command, onSuccess?: () => void) {
    setQueueBusy(true);
    setQueueNotice("");
    try {
      await command(c, onSuccess);
    } finally {
      setQueueBusy(false);
    }
  }
  useEffect(() => {
    setPendingMessages([]);
    setQueueNotice("");
  }, [room?.session]);
  useEffect(() => {
    setApprovalDismissed(false);
  }, [room?.session, room?.pending.map((p) => `${p.id}:${p.at}`).join(",")]);
  useEffect(() => {
    if (!room || status !== "joined") return;
    const timer = setTimeout(() => {
      void command({
        type: "look",
        yaw: Math.max(-75, Math.min(75, yaw)),
        pitch: Math.max(-45, Math.min(35, pitch)),
        bodyYaw,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [yaw, pitch, bodyYaw, room?.session, status]);
  useEffect(() => {
    if (
      !room ||
      room.host !== id ||
      room.current ||
      room.queue.length ||
      !room.queueEndedAt
    )
      return;
    const key = room.session + ":" + room.queueEndedAt;
    if (emptyAnnouncements.current.has(key)) return;
    emptyAnnouncements.current.add(key);
    speech.announce(
      "Chủ phòng ơi, video đã kết thúc. Hãy thêm đường link mới để tiếp tục buổi chiếu.",
    );
  }, [
    room?.queueEndedAt,
    room?.current?.id,
    room?.queue.length,
    room?.host,
    id,
    speech.announce,
  ]);
  const viewOpener = useRef<HTMLButtonElement>(null);
  const head = useRef({ yaw, pitch, bodyYaw });
  head.current = {
    yaw: Math.max(-75, Math.min(75, yaw)),
    pitch: Math.max(-45, Math.min(35, pitch)),
    bodyYaw,
  };
  const turn = React.useCallback(
    (dx: number, dy: number) => {
      setYaw((v) =>
        camera === "first" ? Math.max(-75, Math.min(75, v + dx)) : v + dx,
      );
      setPitch((v) => Math.max(-45, Math.min(35, v + dy)));
    },
    [camera],
  );
  const headDrag = useHeadDrag(turn, status === "joined" && !light);
  const resetView = () => {
    setYaw(0);
    setPitch(0);
    setBodyYaw(0);
    setZoom(0);
  };
  useEffect(() => {
    if (status !== "joined") return;
    let previous = "",
      sentAt = 0;
    const t = setInterval(() => {
      const r = latestRoom.current,
        ws = chatSocket.current;
      if (!r || ws?.readyState !== WebSocket.OPEN) return;
      const text = JSON.stringify({ ...head.current });
      if (text !== previous || performance.now() - sentAt >= 2000) {
        previous = text;
        sentAt = performance.now();
        ws.send(
          JSON.stringify({ type: "look", session: r.session, ...head.current }),
        );
      }
    }, 150);
    return () => clearInterval(t);
  }, [status, room?.session]);
  useEffect(() => {
    document.body.classList.toggle(
      "cinema-active",
      status === "joined" && !!room,
    );
    return () => document.body.classList.remove("cinema-active");
  }, [status, !!room]);
  useEffect(() => {
    if (status !== "joined") return;
    const keys = new Set<string>();
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const d = heldLookStep(now - last);
      last = now;
      turn(
        (Number(keys.has("ArrowRight") || keys.has("d")) -
          Number(keys.has("ArrowLeft") || keys.has("a"))) *
          d,
        (Number(keys.has("ArrowUp") || keys.has("w")) -
          Number(keys.has("ArrowDown") || keys.has("s"))) *
          d,
      );
      if (keys.size) frame = requestAnimationFrame(tick);
    };
    const release = () => {
      keys.clear();
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]",
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing
      )
        return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (
        ![
          "w",
          "a",
          "s",
          "d",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(k)
      )
        return;
      e.preventDefault();
      keys.add(k);
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (!keys.size) release();
    };
    const focusChanged = (e: FocusEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]",
        )
      )
        release();
    };
    const hidden = () => {
      if (document.hidden) release();
    };
    document.addEventListener("focusin", focusChanged);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      release();
      document.removeEventListener("focusin", focusChanged);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, [status, turn]);
  const host = room?.host === id,
    me = room?.members.find((m) => m.id === id);
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">
            <Film size={22} />
          </span>
          Cùng Xem<span className="alpha">ALPHA</span>
        </a>
        <div className="header-right">
          <span className="connection">
            <i />
            {demo ? "Demo · chỉ trên máy này" : connection}
          </span>
          <span className="profile">
            {name.slice(0, 1).toUpperCase() || "B"}
          </span>
        </div>
      </header>
      <main
        data-members={room?.members.length}
        data-clock-rtt={clock.rtt ?? ""}
        data-clock-calibrated={clock.calibrated}
        className={
          status === "joined" && room
            ? `cinema-app ${panel && panel !== "info" ? "with-panel" : ""} ${panel === "chat" ? "with-chat" : ""} ${panel === "info" ? "show-info" : ""} ${showControls ? "show-controls" : ""}`
            : undefined
        }
      >
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Đóng thông báo">
              <X size={16} />
            </button>
          </div>
        )}
        {status === "lobby" ? (
          <>
            <section
              className={"lobby-stage" + (lobbyLight ? " is-light" : "")}
              data-preview-slot={previewSlot}
              aria-label="Sảnh rạp Cùng Xem"
            >
              <div className="lobby-world" aria-hidden="true">
                {!lobbyLight && (
                  <Suspense
                    fallback={
                      <div className="lobby-loading">Đang mở cửa sảnh…</div>
                    }
                  >
                    <SceneBoundary onError={() => setLobbyLight(true)}>
                      <Lobby
                        selected={previewSlot}
                        avatar={avatar}
                        appearance={appearance}
                        occupied={[1, 2, 3].map(
                          (n) => !!summaries.find((s) => s.slot === n)?.open,
                        )}
                        onSelect={setPreviewSlot}
                        reduced={reducedMotion}
                      />
                    </SceneBoundary>
                  </Suspense>
                )}
              </div>
              <div className="lobby-welcome">
                <p className="eyebrow">MỘT CHỖ HẸN. BA CĂN PHÒNG.</p>
                <h1>
                  Hẹn nhau ở <em>Cùng Xem.</em>
                </h1>
                <p>
                  Chọn cửa phòng, mang theo một bộ phim.
                  <br />
                  Phần còn lại là khoảng thời gian bên nhau.
                </p>
              </div>
              <button
                className="lobby-quality"
                aria-pressed={lobbyLight}
                onClick={() => setLobbyLight((v) => !v)}
              >
                {lobbyLight ? "Bật sảnh 3D" : "Sảnh nhẹ"}
              </button>
              <div
                className="lobby-doors"
                role="group"
                aria-label="Khám phá các phòng"
              >
                {[1, 2, 3].map((n) => {
                  const summary = summaries.find((s) => s.slot === n);
                  return (
                    <button
                      key={n}
                      aria-label={`Khám phá phòng 0${n}`}
                      aria-pressed={previewSlot === n}
                      onClick={() => setPreviewSlot(n)}
                    >
                      <span>PHÒNG 0{n}</span>
                      <b>{["Hổ phách", "Đêm xanh", "Nhung tím"][n - 1]}</b>
                      <small>
                        {summary?.open
                          ? summary.recovering
                            ? "Chờ chủ kết nối lại"
                            : summary.private
                              ? "Phòng riêng · cần lời mời"
                              : `${summary.count || 0}/${summary.capacity} ghế · đang mở`
                          : "Sẵn sàng đón bạn"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </section>
            <p className="lobby-instruction">
              Bạn đang khám phá phòng 0{previewSlot}. Chọn một phòng để tiếp
              tục; thông tin được nhập ở bước sau.
            </p>
            {entry && (
              <div className="approval-backdrop">
                <section
                  ref={entryModal}
                  tabIndex={-1}
                  className="approval-modal entry-modal panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label={
                    entry.create ? "Tạo phòng mới" : "Thông tin vào phòng"
                  }
                >
                  <h2>
                    {entry.create
                      ? "Tạo góc xem của bạn"
                      : "Vào phòng 0" + entry.slot}
                  </h2>
                  <p>
                    {entry.create
                      ? "Chọn nhân vật và bố cục cho buổi xem."
                      : "Chỉ cần tên và nhân vật. Chủ phòng sẽ duyệt yêu cầu của bạn."}
                  </p>
                  <fieldset className="avatar-choice">
                    <legend>Chọn nhân vật của bạn</legend>
                    <label>
                      <input
                        type="radio"
                        name="avatar"
                        value="male"
                        checked={avatar === "male"}
                        onChange={() => {
                          setAvatar("male");
                          setAppearance({
                            clothing: "#4d6c82",
                            hair: "#51372b",
                          });
                        }}
                      />{" "}
                      Nam · Barbarian
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="avatar"
                        value="female"
                        checked={avatar === "female"}
                        onChange={() => {
                          setAvatar("female");
                          setAppearance({
                            clothing: "#008353",
                            hair: "#9b5a45",
                          });
                        }}
                      />{" "}
                      Nữ · Rogue
                    </label>
                    <small>Bạn bè sẽ thấy nhân vật này trong phòng.</small>
                  </fieldset>
                  <div className="entry-appearance">
                    <div
                      className="entry-avatar-preview"
                      aria-label="Xem trước nhân vật"
                    >
                      <Suspense fallback={<p>Đang tải nhân vật…</p>}>
                        <SceneBoundary onError={() => {}}>
                          <AvatarPreview
                            avatar={avatar}
                            appearance={appearance}
                          />
                        </SceneBoundary>
                      </Suspense>
                    </div>
                    <fieldset>
                      <legend>Màu sắc của bạn</legend>
                      <div className="color-row">
                        <label>
                          Màu quần áo
                          <input
                            type="color"
                            aria-label="Màu quần áo"
                            value={appearance.clothing}
                            onChange={(e) =>
                              setAppearance((v) => ({
                                ...v,
                                clothing: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Màu tóc
                          <input
                            type="color"
                            aria-label="Màu tóc"
                            value={appearance.hair}
                            onChange={(e) =>
                              setAppearance((v) => ({
                                ...v,
                                hair: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <small>
                        Chọn trước khi vào phòng. Ngoại hình được giữ trong suốt
                        phiên phòng.
                      </small>
                    </fieldset>
                  </div>
                  <section className="setup panel">
                    <label>
                      Tên của bạn
                      <input
                        maxLength={32}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Mọi người gọi bạn là…"
                      />
                    </label>
                    {entry.create && (
                      <>
                        <fieldset className="space-picker">
                          <legend>Không gian chiếu</legend>
                          <div className="space-options">
                            {spaces.map((option) => (
                              <label
                                className="space-card"
                                key={option.id}
                                style={
                                  {
                                    "--space-accent": option.accent,
                                  } as React.CSSProperties
                                }
                              >
                                <input
                                  type="radio"
                                  name="space"
                                  value={option.id}
                                  aria-label={option.label}
                                  checked={space === option.id}
                                  onChange={() => setSpace(option.id)}
                                />
                                <strong>{option.label}</strong>
                                <small>{option.description}</small>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <label>
                          Tên phòng mới
                          <input
                            maxLength={32}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </label>
                        <label>
                          Quyền riêng tư
                          <select
                            value={visibility}
                            onChange={(e) =>
                              setVisibility(
                                e.target.value as "public" | "private",
                              )
                            }
                          >
                            <option value="public">Công khai</option>
                            <option value="private">Riêng tư</option>
                          </select>
                        </label>
                        <label>
                          Số ghế
                          <select
                            aria-label="Số ghế"
                            value={capacity}
                            onChange={(e) =>
                              setCapacity(Number(e.target.value))
                            }
                          >
                            {Array.from({ length: 9 }, (_, i) => (
                              <option key={i} value={i + 2}>
                                {i + 2} ghế
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Kiểu chỗ ngồi
                          <select
                            aria-label="Kiểu chỗ ngồi"
                            value={seating}
                            onChange={(e) =>
                              setSeating(e.target.value as "cinema" | "sofa")
                            }
                          >
                            <option value="cinema">Ghế rạp riêng</option>
                            <option value="sofa">Sofa ngồi chung</option>
                          </select>
                        </label>
                      </>
                    )}
                  </section>
                  {error && <p role="alert">{error}</p>}
                  <div className="actions">
                    <button onClick={() => setEntry(null)} disabled={busy}>
                      Quay lại
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !name.trim()}
                      onClick={() => void enter(entry.slot, entry.create)}
                    >
                      {busy
                        ? "Đang xử lý…"
                        : entry.create
                          ? "Tạo phòng"
                          : "Xin vào phòng"}
                    </button>
                  </div>
                </section>
              </div>
            )}
            <div className="section-title">
              <h2>Chọn phòng của bạn</h2>
              <span>03 PHÒNG · DUYỆT TRƯỚC KHI VÀO</span>
            </div>
            <div className="room-cards">
              {[...summaries]
                .sort(
                  (a, b) =>
                    Number(b.slot === invitedSlot) -
                    Number(a.slot === invitedSlot),
                )
                .map((s) => (
                  <article
                    className={
                      "room-card" + (previewSlot === s.slot ? " previewed" : "")
                    }
                    key={s.slot}
                  >
                    <div
                      className={
                        "room-cover cover-" +
                        (s.slot - 1) +
                        (s.open && !s.private
                          ? " preview-" + (s.space || "cinema")
                          : "")
                      }
                    >
                      <span>PHÒNG 0{s.slot}</span>
                      <Armchair size={56} strokeWidth={1} />
                      <small>
                        {s.open && !s.private
                          ? spaceInfo(s.space).label
                          : [
                              "THE AMBER ROOM",
                              "THE MIDNIGHT ROOM",
                              "THE VELVET ROOM",
                            ][s.slot - 1]}
                      </small>
                    </div>
                    <div className="card-content">
                      <div className="card-top">
                        <span className={s.open ? "badge occupied" : "badge"}>
                          {s.recovering
                            ? "Chờ chủ kết nối lại"
                            : s.open
                              ? "Đang mở"
                              : "Sẵn sàng đón bạn"}
                        </span>
                        <span className="muted">
                          {s.private
                            ? "Chỉ vào bằng lời mời"
                            : `${s.count || 0}/${s.capacity || capacity} ghế`}
                        </span>
                      </div>
                      <h3>
                        {(s.private ? "Phòng riêng tư" : s.title) ||
                          [
                            "Một buổi tối ấm áp",
                            "Góc nhỏ sau giờ làm",
                            "Buổi chiếu của riêng bạn",
                          ][s.slot - 1]}
                      </h3>
                      <p>
                        {s.open
                          ? s.private
                            ? "Tên phòng và danh sách người xem được ẩn. Thành viên có thể vào lại."
                            : s.recovering
                              ? "Chủ phòng đang mất kết nối. Chỉ thành viên đã duyệt có thể trở lại trong thời gian giữ chỗ."
                              : "Gửi yêu cầu để chủ phòng duyệt bạn vào."
                          : "Tạo phòng và phát ngay, không cần đợi đủ người."}
                      </p>
                      <button
                        className="primary wide"
                        disabled={busy || !id}
                        onClick={() => {
                          setPreviewSlot(s.slot);
                          setError("");
                          setEntry({ slot: s.slot, create: !s.open });
                        }}
                      >
                        {s.open
                          ? s.private
                            ? "Vào phòng riêng"
                            : s.slot === invitedSlot
                              ? "Vào phòng được mời"
                              : "Xin vào phòng"
                          : "Tạo phòng"}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            <p className="footnote">
              {demo
                ? "Demo không kết nối người khác. Mở bản server để dùng phòng realtime."
                : "Phiên alpha · Xem phim, nghe nhạc cùng bạn bè, trò chuyện và đọc tin bằng giọng thiết bị."}
            </p>
          </>
        ) : status === "pending" ? (
          <section className="waiting panel">
            <Users size={44} />
            <h1>Chờ một lời chào từ chủ phòng.</h1>
            <p>
              Yêu cầu đã gửi. Khi được duyệt, bạn sẽ xem tiếp video đang chiếu.
            </p>
            <button
              onClick={async () => {
                try {
                  if (!demo)
                    await api(`/rooms/${slot}/cancel`, {
                      session: pendingSession,
                    });
                  setSlot(null);
                  setStatus("lobby");
                } catch (e) {
                  report(e);
                }
              }}
            >
              Về sảnh
            </button>
          </section>
        ) : room ? (
          <>
            {room.members.find((m) => m.id === room.host)?.online === false && (
              <div className="host-offline-notice" role="status">
                Chủ phòng đang mất kết nối. Chờ tối đa 30 giây; phòng sẽ đóng
                nếu không có người kế nhiệm hợp lệ.
              </div>
            )}
            {me && (
              <RoomActivity
                key={room.session}
                room={room}
                me={me}
                offset={offset}
                chatOpen={panel === "chat"}
                playSound={sounds.play}
                onOpenChat={() => {
                  panelOpener.current =
                    document.querySelector<HTMLButtonElement>(
                      '.cinema-toolbar button[aria-label="Chat"]',
                    );
                  setPanel("chat");
                  setTab("chat");
                }}
              />
            )}
            {me && (
              <aside className="session-badge" aria-label="Thông tin của bạn">
                <span
                  className="session-initials"
                  style={{ background: me.appearance?.clothing || "#b3976d" }}
                >
                  {[...me.name].slice(0, 2).join("").toLocaleUpperCase("vi")}
                </span>
                <div>
                  <strong>{me.name}</strong>
                  <small>{room.title}</small>
                  <span>
                    {host ? "Chủ phòng" : "Thành viên"} · {room.members.length}/
                    {room.capacity} người
                  </span>
                </div>
              </aside>
            )}
            <nav className="cinema-toolbar" aria-label="Bảng trong phòng">
              {(
                [
                  ["info", "Thông tin"],
                  ["chat", "Chat"],
                  ["queue", "Playlist"],
                  ["people", "Mọi người"],
                ] as const
              ).map(([k, label]) => {
                const Icon = {
                  info: Info,
                  chat: MessageCircle,
                  queue: ListVideo,
                  people: Users,
                }[k];
                return (
                  <button
                    key={k}
                    aria-label={label}
                    title={label}
                    aria-pressed={panel === k}
                    aria-expanded={panel === k}
                    aria-controls={k === "info" ? "room-info" : "room-panel"}
                    onClick={(e) => {
                      panelOpener.current = e.currentTarget;
                      setPanel((v) => (v === k ? "" : k));
                      if (k !== "info") setTab(k);
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="toolbar-label">{label}</span>
                    {k === "people" && host && room.pending.length ? (
                      <span className="toolbar-badge">
                        {room.pending.length}
                      </span>
                    ) : (
                      ""
                    )}
                  </button>
                );
              })}
              <button
                ref={viewOpener}
                aria-label="Góc nhìn 🎮"
                title="Góc nhìn và điều khiển"
                aria-pressed={showControls}
                aria-expanded={showControls}
                onClick={() => setShowControls((v) => !v)}
              >
                <Gamepad2 size={18} aria-hidden="true" />
                <span className="toolbar-label">Góc nhìn</span>
              </button>
              <button
                aria-label="Toàn màn hình"
                title="Toàn màn hình"
                onClick={() => {
                  if (!document.fullscreenElement)
                    void document.documentElement
                      .requestFullscreen?.()
                      .catch(() => {});
                  else void document.exitFullscreen();
                }}
              >
                <Maximize size={18} aria-hidden="true" />
              </button>
              <PlaybackReadiness
                room={room}
                id={id}
                onCommand={(c) => command(c)}
              />
            </nav>
            <div
              className="room-heading"
              id="room-info"
              ref={infoPanel}
              tabIndex={-1}
              aria-label="Thông tin phòng"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setPanel("");
                }
              }}
            >
              <div>
                <p className="eyebrow">
                  PHÒNG 0{slot} ·{" "}
                  {host ? "BẠN LÀ CHỦ PHÒNG" : "BUỔI CHIẾU CHUNG"}
                </p>
                <h1>{room.title}</h1>
                <p className="muted">
                  {spaceInfo(room.space).label} ·{" "}
                  {room.seating === "sofa" ? "Sofa ngồi chung" : "Ghế rạp"} ·
                  Premium của chủ phòng không chia sẻ quyền bỏ quảng cáo cho
                  thành viên khác.
                </p>
              </div>
              {!room.host && (
                <p className="muted">
                  Chủ phòng đã mất kết nối. Video tiếp tục; điều khiển chung
                  đang khóa.
                </p>
              )}
              <p className="muted" role="status">
                {clock.calibrated
                  ? `Độ trễ kết nối đo được: ${Math.round(clock.rtt!)} ms`
                  : "Đang đo độ trễ để đồng bộ thời gian…"}
              </p>
              <div className="actions">
                <span>
                  <Users size={17} />
                  {room.members.length}/{room.capacity} người
                  {room.visibility === "private" ? " · riêng tư" : ""}
                </span>
                <InvitationControls
                  room={room}
                  slot={slot!}
                  host={!!host}
                  onCommand={command}
                />
                <button
                  onClick={() => {
                    if (
                      confirm(
                        host
                          ? "Đóng phòng cho tất cả mọi người?"
                          : "Rời phòng này?",
                      )
                    ) {
                      if ("speechSynthesis" in window) speechSynthesis.cancel();
                      void command({ type: host ? "close" : "leave" });
                    }
                  }}
                >
                  <LogOut size={16} />
                  {host ? "Đóng phòng" : "Rời phòng"}
                </button>
              </div>
            </div>
            <div className="theater-layout">
              <div className="stage-column">
                {speech.warning && <p role="status">{speech.warning}</p>}

                <div className="transport">
                  <span className="muted">
                    {room.playing ? "Đang chiếu" : "Đang nghỉ"} · Chỉ chủ phòng
                    điều khiển · {mediaLabel(room.current)}
                  </span>
                  {host && (
                    <div className="actions">
                      <button
                        onClick={() =>
                          void command({
                            type: room.playing ? "pause" : "play",
                            generation: room.generation,
                          })
                        }
                      >
                        {room.playing ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (
                            !room.current ||
                            confirm("Bỏ qua video hiện tại và phát tiếp?")
                          )
                            void command({
                              type: "next",
                              generation: room.generation,
                            });
                        }}
                      >
                        <SkipForward size={16} />
                        Phát tiếp
                      </button>
                    </div>
                  )}
                </div>
                <section className="scene-panel">
                  <div className="scene-label">
                    <span>KHÔNG GIAN CỦA CHÚNG MÌNH</span>
                    <span>Ghế {me ? me.seat + 1 : "—"}</span>
                  </div>
                  <div
                    className={
                      "scene" +
                      (headDrag.dragging ? " is-looking" : "") +
                      (light ? " is-light" : "")
                    }
                    tabIndex={0}
                    data-space={spaceInfo(room.space).id}
                    aria-label="Rạp phim, giữ chuột và kéo hoặc dùng WASD, phím mũi tên để nhìn"
                    {...headDrag.handlers}
                    onWheel={(e) => {
                      if (
                        light ||
                        e.ctrlKey ||
                        (e.target as HTMLElement).closest(
                          ".screen-surface,button,input,select",
                        )
                      )
                        return;
                      setZoom((v) =>
                        Math.max(
                          -24,
                          Math.min(24, v + Math.sign(e.deltaY) * 3),
                        ),
                      );
                    }}
                    onPointerDownCapture={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        !target.closest(
                          "button,input,textarea,select,.screen-surface",
                        )
                      )
                        e.currentTarget.focus({ preventScroll: true });
                    }}
                  >
                    <div
                      ref={surface}
                      className={
                        light ? "screen-surface flat" : "screen-surface"
                      }
                    >
                      <Player
                        serverNow={clock.serverNow}
                        files={files}
                        isHost={!!host}
                        onControl={(c) => command(c)}
                        speaking={speech.speaking}
                        room={room}
                        offset={offset}
                        onEnded={() => {
                          if (host)
                            void command({
                              type: "next",
                              generation: room.generation,
                            });
                        }}
                      />
                    </div>
                    {light ? (
                      <div className="seat-map">
                        {Array.from({ length: room.capacity }, (_, i) => (
                          <span
                            key={i}
                            className={
                              room.members.some((m) => m.seat === i)
                                ? "taken"
                                : ""
                            }
                          >
                            <Armchair size={28} />
                            {i + 1}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <Suspense
                        fallback={
                          <div className="loading">
                            Đang dựng rạp… Video vẫn tiếp tục phát.
                          </div>
                        }
                      >
                        <SceneBoundary onError={sceneUnavailable}>
                          <Cinema
                            room={room}
                            id={id}
                            mode={camera}
                            reducedMotion={reducedMotion}
                            offset={offset}
                            yaw={yaw}
                            pitch={pitch}
                            bodyYaw={bodyYaw}
                            controlsOpen={showControls}
                            zoom={zoom}
                            surface={surface}
                            dpr={sceneQuality.dpr}
                            onUnavailable={sceneUnavailable}
                          />
                        </SceneBoundary>
                      </Suspense>
                    )}
                  </div>
                  {sceneNotice && (
                    <div className="scene-recovery" role="status">
                      <span>{sceneNotice}</span>
                      <button onClick={retryScene}>Thử lại 3D</button>
                    </div>
                  )}
                  {!light && !headDrag.used && !showControls && (
                    <div className="view-hint" aria-hidden="true">
                      <MousePointer2 size={14} />
                      <span>Kéo để nhìn quanh · Cuộn để thu/phóng</span>
                    </div>
                  )}
                  {(Math.abs(yaw) > 0.5 ||
                    Math.abs(pitch) > 0.5 ||
                    bodyYaw !== 0) &&
                    !showControls && (
                      <button
                        className="recenter-view"
                        onClick={resetView}
                        title="Đưa góc nhìn về giữa"
                        aria-label="Đưa góc nhìn về giữa"
                      >
                        <RotateCcw size={18} aria-hidden="true" />
                      </button>
                    )}
                  <div className="scene-controls">
                    {me && (
                      <RoomControls
                        room={room}
                        me={me}
                        camera={camera}
                        onCamera={(mode) => {
                          setCamera(mode);
                          resetView();
                        }}
                        onReset={resetView}
                        light={light}
                        quality={sceneQuality.quality}
                        onQuality={sceneQuality.change}
                        onLight={() => {
                          setSceneNotice("");
                          setLight((v) => !v);
                        }}
                        onClose={() => {
                          setShowControls(false);
                          viewOpener.current?.focus({ preventScroll: true });
                        }}
                        command={command}
                        soundsEnabled={sounds.enabled}
                        onToggleSounds={sounds.toggle}
                      />
                    )}
                  </div>
                </section>
              </div>
              {quickActive && !approvalActive && (
                <div className="approval-backdrop">
                  <section
                    className="approval-modal panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Thêm video để bắt đầu"
                    ref={quickModal}
                    tabIndex={-1}
                  >
                    <h2>
                      {room.queueEndedAt
                        ? "Đã phát hết playlist"
                        : "Bắt đầu buổi chiếu"}
                    </h2>
                    <p>
                      {room.queueEndedAt
                        ? "Thêm link mới để mọi người xem tiếp."
                        : "Dán link YouTube, Drive hoặc video / nhạc trực tiếp để phát ngay."}
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (quickBusy) return;
                        setQuickBusy(true);
                        await command({
                          type: "start",
                          url: quickLink,
                          generation: room.generation,
                        });
                        setQuickBusy(false);
                      }}
                    >
                      <label htmlFor="quick-link">
                        Link video / nhạc để bắt đầu
                      </label>
                      <input
                        id="quick-link"
                        type="url"
                        required
                        value={quickLink}
                        onChange={(e) => setQuickLink(e.target.value)}
                        placeholder="https://youtu.be/…"
                      />
                      <label className="file-picker">
                        <span className="file-picker-title">
                          ＋ Chọn video hoặc nhạc từ máy
                        </span>
                        <small>MP4, MOV, WebM, MP3… · Tối đa 100 MB</small>
                        <input
                          aria-label="Chọn video để bắt đầu"
                          type="file"
                          accept={FILE_ACCEPT}
                          disabled={quickBusy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadFile(file, "start");
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <p className="muted">
                        Giữ tab mở để chia sẻ trực tiếp. Nếu mạng chặn kết nối,
                        người xem có thể nhận qua phòng với file tối đa 25 MB.
                      </p>
                      {error && <p role="alert">{error}</p>}
                      <div className="actions" style={{ marginTop: 16 }}>
                        <button
                          className="primary"
                          disabled={quickBusy}
                          type="submit"
                        >
                          {quickBusy ? "Đang mở video…" : "Phát ngay"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void command({ type: "close" });
                          }}
                        >
                          Đóng phòng
                        </button>
                      </div>
                    </form>
                    <PlaylistImport
                      busy={quickBusy}
                      onImport={async (urls) => {
                        setQuickBusy(true);
                        try {
                          await command({
                            type: "import",
                            urls,
                            mode: "start",
                            generation: room.generation,
                            expectedQueueRevision: room.queueRevision || 0,
                          });
                        } finally {
                          setQuickBusy(false);
                        }
                      }}
                    />
                  </section>
                </div>
              )}
              {host && room.pending.length > 0 && !approvalDismissed && (
                <div className="approval-backdrop">
                  <section
                    className="approval-modal panel"
                    ref={approval}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Yêu cầu vào phòng"
                    tabIndex={-1}
                  >
                    <h2>Có bạn đang chờ vào rạp</h2>
                    <p>
                      Duyệt hoặc từ chối từng người. Video đang phát vẫn tiếp
                      tục.
                    </p>
                    {room.pending.map((p) => (
                      <div className="person" key={p.id}>
                        <b>{p.name}</b>
                        <button
                          className="primary"
                          onClick={() =>
                            void command({ type: "accept", id: p.id })
                          }
                        >
                          Cho vào
                        </button>
                        <button
                          onClick={() =>
                            void command({ type: "reject", id: p.id })
                          }
                        >
                          Từ chối
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setApprovalDismissed(true)}>
                      Để sau
                    </button>
                  </section>
                </div>
              )}
              <aside
                className="sidebar panel"
                id="room-panel"
                ref={sidePanel}
                tabIndex={-1}
                aria-label={
                  panel === "chat"
                    ? "Bảng chat"
                    : panel === "queue"
                      ? "Bảng playlist"
                      : "Bảng thành viên"
                }
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setPanel("");
                  }
                }}
                hidden={!panel || panel === "info"}
              >
                <button
                  className="close-panel"
                  aria-label="Đóng bảng"
                  onClick={() => setPanel("")}
                >
                  ×
                </button>
                <nav className="tabs">
                  {[
                    ["chat", "Chat"],
                    ["queue", "Playlist"],
                    [
                      "people",
                      `Mọi người${host && room.pending.length ? " · " + room.pending.length : ""}`,
                    ],
                  ].map(([k, l]) => (
                    <button
                      className={tab === k ? "active" : ""}
                      key={k}
                      onClick={() => {
                        setTab(k);
                        setPanel(k as "chat" | "queue" | "people");
                        if (k === "people") setApprovalDismissed(false);
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </nav>
                {tab === "chat" ? (
                  <>
                    <div
                      className="chat-history"
                      ref={history}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        followChat.current =
                          el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                      }}
                    >
                      <p className="system-note">
                        Chào mừng tới phòng. Một tin nhắn nhỏ cũng làm buổi
                        chiếu vui hơn.
                      </p>
                      {room.messages.map((m) => (
                        <article className="message" key={m.id}>
                          <b>{m.name}</b>
                          <p>{m.text}</p>
                        </article>
                      ))}
                      {pendingMessages.map((m) => (
                        <article className="message pending" key={m.id}>
                          <b>{name}</b>
                          <p>{m.text}</p>
                          <small>
                            {m.failed
                              ? "Chưa gửi được — hãy kiểm tra kết nối."
                              : "Đang gửi…"}
                          </small>
                        </article>
                      ))}
                    </div>
                    <button
                      className="tts-toggle"
                      aria-pressed={tts}
                      onClick={() => {
                        if (tts) {
                          speech.stop();
                          setTts(false);
                        } else setTts(speech.enable());
                      }}
                    >
                      <Volume2 size={16} />
                      {tts ? "Tắt đọc tin" : "Đọc tin bằng giọng thiết bị"}
                    </button>
                    <div className="voice-settings">
                      <label>
                        Giọng tiếng Việt
                        <select
                          aria-label="Giọng tiếng Việt"
                          value={speech.voiceURI}
                          onChange={(e) => speech.selectVoice(e.target.value)}
                        >
                          <option value="">Tự chọn giọng tiếng Việt</option>
                          {speech.voices.map((v, i) => (
                            <option key={v.voiceURI || i} value={v.voiceURI}>
                              {v.name || "Tiếng Việt"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tốc độ đọc · {speech.rate.toFixed(2)}×
                        <input
                          type="range"
                          min="0.75"
                          max="1.25"
                          step="0.05"
                          value={speech.rate}
                          onChange={(e) =>
                            speech.setRate(Number(e.target.value))
                          }
                        />
                      </label>
                      <button
                        onClick={() => {
                          setTts(speech.enable());
                        }}
                      >
                        Nghe thử giọng
                      </button>
                    </div>
                    {speech.warning && (
                      <p className="voice-warning" role="status">
                        {speech.warning}
                      </p>
                    )}
                    <form
                      className="composer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (message.trim()) {
                          void command({ type: "chat", text: message });
                          setMessage("");
                        }
                      }}
                    >
                      <label className="sr-only" htmlFor="message">
                        Tin nhắn
                      </label>
                      <input
                        id="message"
                        maxLength={500}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nói gì với mọi người…"
                      />
                      <button className="primary" aria-label="Gửi tin">
                        <Send size={17} />
                      </button>
                    </form>
                    <p className="small muted">
                      Giọng thiết bị có thể khác giữa các máy. Không có voice
                      call.
                    </p>
                  </>
                ) : tab === "queue" ? (
                  <div className="tab-content">
                    <h3>Tiếp theo trong buổi chiếu</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void queueAction(
                          { type: host ? "add" : "suggest", url },
                          () => {
                            setUrl("");
                            setQueueNotice(
                              host
                                ? "Đã thêm video vào playlist."
                                : "Đã gửi đề xuất. Chủ phòng sẽ duyệt trước khi thêm.",
                            );
                          },
                        );
                      }}
                    >
                      <label htmlFor="url">
                        {host ? "Link video / nhạc" : "Đề xuất video / nhạc"}
                      </label>
                      <div className="composer">
                        <input
                          id="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://youtu.be/…"
                          required
                        />
                        <button
                          className="primary"
                          disabled={queueBusy || !url.trim()}
                          aria-label={host ? "Thêm video" : "Gửi đề xuất"}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </form>
                    {host && (
                      <PlaylistImport
                        busy={queueBusy}
                        onImport={async (urls) => {
                          await queueAction(
                            {
                              type: "import",
                              urls,
                              mode: "queue",
                              generation: room.generation,
                              expectedQueueRevision: room.queueRevision || 0,
                            },
                            () =>
                              setQueueNotice(
                                `Đã thêm ${urls.length} mục vào playlist.`,
                              ),
                          );
                        }}
                      />
                    )}
                    {host && (
                      <label className="file-picker">
                        <span className="file-picker-title">
                          ＋ Thêm file từ máy
                        </span>
                        <small>Video hoặc nhạc · Tối đa 100 MB</small>
                        <input
                          aria-label="Thêm file vào playlist"
                          type="file"
                          accept={FILE_ACCEPT}
                          disabled={queueBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadFile(f, "queue");
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    {queueNotice && <p role="status">{queueNotice}</p>}
                    {!host && (
                      <p className="muted">
                        Bạn có thể gửi tối đa 3 đề xuất chờ duyệt. Chủ phòng
                        quyết định video nào được thêm.
                      </p>
                    )}
                    {room.queue.length === 0 ? (
                      <div className="empty">
                        <Film size={32} />
                        <p>Playlist đang chờ bộ phim đầu tiên.</p>
                      </div>
                    ) : (
                      room.queue.map((q, i) => (
                        <div
                          className="queue-item"
                          key={q.id}
                          draggable={!!host && !queueBusy}
                          onDragStart={(e) => {
                            if (
                              !host ||
                              queueBusy ||
                              (e.target as HTMLElement).closest("button")
                            ) {
                              e.preventDefault();
                              return;
                            }
                            queueDrag.current = {
                              id: q.id,
                              revision: room.queueRevision || 0,
                              session: room.session,
                            };
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", q.id);
                          }}
                          onDragEnd={() => {
                            queueDrag.current = null;
                          }}
                          onDragOver={(e) => {
                            if (host && queueDrag.current) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const drag = queueDrag.current;
                            queueDrag.current = null;
                            if (
                              !host ||
                              !drag ||
                              drag.session !== room.session ||
                              drag.id !== e.dataTransfer.getData("text/plain")
                            )
                              return;
                            void queueAction({
                              type: "move",
                              id: drag.id,
                              beforeId:
                                room.queue.findIndex(
                                  (item) => item.id === drag.id,
                                ) < i
                                  ? room.queue[i + 1]?.id || null
                                  : q.id,
                              expectedQueueRevision: drag.revision,
                            });
                          }}
                        >
                          <span className="index">{i + 1}</span>
                          <div>
                            <b>Video</b>
                            <small>{mediaLabel(q)}</small>
                          </div>
                          {host && (
                            <div className="queue-actions">
                              <button
                                aria-label={`Đưa video ${i + 1} lên`}
                                disabled={queueBusy || i === 0}
                                onClick={() =>
                                  void queueAction({
                                    type: "reorder",
                                    id: q.id,
                                    direction: "up",
                                    expectedQueueRevision:
                                      room.queueRevision || 0,
                                  })
                                }
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Đưa video ${i + 1} xuống`}
                                disabled={
                                  queueBusy || i === room.queue.length - 1
                                }
                                onClick={() =>
                                  void queueAction({
                                    type: "reorder",
                                    id: q.id,
                                    direction: "down",
                                    expectedQueueRevision:
                                      room.queueRevision || 0,
                                  })
                                }
                              >
                                ↓
                              </button>
                              <button
                                aria-label="Xóa video"
                                disabled={queueBusy}
                                onClick={() =>
                                  void queueAction({
                                    type: "remove",
                                    id: q.id,
                                    expectedQueueRevision:
                                      room.queueRevision || 0,
                                  })
                                }
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {(room.suggestions || []).some(
                      (s) => host || s.memberId === id,
                    ) && (
                      <section
                        className="suggestion-list"
                        aria-label="Đề xuất video / nhạc"
                      >
                        <h3>
                          {host ? "Đề xuất chờ duyệt" : "Đề xuất của bạn"}
                        </h3>
                        {(room.suggestions || [])
                          .filter((s) => host || s.memberId === id)
                          .map((s) => (
                            <article className="suggestion-item" key={s.id}>
                              <b>{s.name}</b>
                              <small>{mediaLabel(s)}</small>
                              {host ? (
                                <div className="suggestion-actions">
                                  <button
                                    disabled={queueBusy}
                                    onClick={() =>
                                      void queueAction(
                                        {
                                          type: "review-suggestion",
                                          id: s.id,
                                          accept: true,
                                          expectedQueueRevision:
                                            room.queueRevision || 0,
                                        },
                                        () =>
                                          setQueueNotice(
                                            "Đã thêm đề xuất vào playlist.",
                                          ),
                                      )
                                    }
                                  >
                                    Thêm đề xuất
                                  </button>
                                  <button
                                    disabled={queueBusy}
                                    onClick={() =>
                                      void queueAction({
                                        type: "review-suggestion",
                                        id: s.id,
                                        accept: false,
                                        expectedQueueRevision:
                                          room.queueRevision || 0,
                                      })
                                    }
                                  >
                                    Bỏ qua
                                  </button>
                                </div>
                              ) : (
                                <small>Đang chờ chủ phòng duyệt</small>
                              )}
                            </article>
                          ))}
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="tab-content">
                    {host && room.pending.length > 0 && (
                      <>
                        <h3>Đang chờ duyệt</h3>
                        {room.pending.map((p) => (
                          <div className="person" key={p.id}>
                            <b>{p.name}</b>
                            <button
                              aria-label={"Chấp nhận " + p.name}
                              onClick={() =>
                                void command({ type: "accept", id: p.id })
                              }
                            >
                              <Check size={16} />
                            </button>
                            <button
                              aria-label={"Từ chối " + p.name}
                              onClick={() =>
                                void command({ type: "reject", id: p.id })
                              }
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    <h3>Đang trong phòng</h3>
                    {room.members.map((m) => (
                      <div className="person" key={m.id}>
                        <span className="profile">{m.name[0]}</span>
                        <div>
                          <b>{m.name}</b>
                          <small>
                            {m.id === room.host
                              ? "Chủ phòng"
                              : "Ghế " + (m.seat + 1)}
                            {m.deadline ? " · Đang giữ chỗ" : " · Đã kết nối"}
                            {room.successor === m.id ? " · Kế nhiệm" : ""}
                          </small>
                        </div>
                        {host && m.id !== id && m.online && (
                          <div className="actions">
                            <button
                              onClick={() => {
                                if (confirm(`Chuyển chủ phòng cho ${m.name}?`))
                                  void command({ type: "transfer", id: m.id });
                              }}
                            >
                              Chuyển chủ phòng
                            </button>
                            <button
                              onClick={() =>
                                void command({
                                  type: "successor",
                                  id: room.successor === m.id ? null : m.id,
                                })
                              }
                            >
                              {room.successor === m.id
                                ? "Bỏ kế nhiệm"
                                : "Chọn kế nhiệm"}
                            </button>
                          </div>
                        )}
                        {host && m.id !== id && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Mời ${m.name} ra và chặn quay lại phiên này?`,
                                )
                              )
                                void command({ type: "kick", id: m.id });
                            }}
                          >
                            Mời ra
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </>
        ) : null}
      </main>
      <footer>
        <span>CÙNG XEM</span>
        <p>Những bộ phim hay hơn khi có người xem cùng.</p>
        <span>BUILT FOR SMALL MOMENTS</span>
      </footer>
    </>
  );
}
class SceneBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? (
      <p>Thiết bị chuyển sang chế độ nhẹ.</p>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(<App />);
