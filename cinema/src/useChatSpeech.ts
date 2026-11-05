import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "../shared/model";
export function useChatSpeech(room: Room | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false),
    [warning, setWarning] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState(() => {
    try {
      return localStorage.getItem("cinema-voice-uri") || "";
    } catch {
      return "";
    }
  });
  const choices = useRef<SpeechSynthesisVoice[]>([]),
    selected = useRef(voiceURI);
  selected.current = voiceURI;
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => {
      const v = speechSynthesis
        .getVoices()
        .filter((v) => /^vi(?:-|_)?/i.test(v.lang));
      choices.current = v;
      setVoices(v);
    };
    update();
    speechSynthesis.addEventListener?.("voiceschanged", update);
    return () => speechSynthesis.removeEventListener?.("voiceschanged", update);
  }, []);
  const selectVoice = (uri: string) => {
    setVoiceURI(uri);
    try {
      localStorage.setItem("cinema-voice-uri", uri);
    } catch {
      /* Storage can be disabled in private contexts. */
    }
  };
  const seen = useRef(new Set<string>()),
    session = useRef(""),
    queue = useRef<string[]>([]),
    active = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const serial = useRef(0);
  const stop = useCallback(() => {
    serial.current++;
    queue.current = [];
    active.current = false;
    clearTimeout(timer.current);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  const run = useCallback(function next() {
    if (
      active.current ||
      !queue.current.length ||
      !("speechSynthesis" in window)
    )
      return;
    const available = choices.current.length
      ? choices.current
      : speechSynthesis.getVoices().filter((v) => /^vi(?:-|_)?/i.test(v.lang));
    const voice =
      available.find((v) => v.voiceURI === selected.current) ||
      available.find((v) => v.default) ||
      available[0];
    if (!voice) {
      queue.current = [];
      setWarning(
        "Thiết bị chưa có giọng tiếng Việt. Hãy cài giọng tiếng Việt trong phần Chuyển văn bản thành giọng nói của máy, rồi bật đọc lại.",
      );
      return;
    }
    active.current = true;
    const ticket = ++serial.current;
    const u = new SpeechSynthesisUtterance(queue.current.shift()!);
    u.lang = "vi-VN";
    u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1;
    const finish = () => {
      if (!active.current || ticket !== serial.current) return;
      active.current = false;
      clearTimeout(timer.current);
      setSpeaking(false);
      next();
    };
    u.onstart = () => {
      if (!active.current || ticket !== serial.current) return;
      setSpeaking(true);
      setWarning("");
    };
    u.onend = finish;
    u.onerror = () => {
      if (!active.current || ticket !== serial.current) return;
      setWarning(
        "Thiết bị chưa đọc được giọng. Hãy bấm Nghe thử hoặc chọn giọng tiếng Việt trong cài đặt máy.",
      );
      finish();
    };
    timer.current = setTimeout(() => {
      // Invalidate callbacks before cancel: some engines dispatch error synchronously.
      u.onstart = null;
      u.onend = null;
      u.onerror = null;
      speechSynthesis.cancel();
      finish();
    }, 20000);
    speechSynthesis.speak(u);
  }, []);
  const announce = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        setWarning(text);
        return;
      }
      queue.current.unshift(text);
      run();
    },
    [run],
  );
  const enable = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      setWarning("Trình duyệt này chưa hỗ trợ đọc tin nhắn.");
      return false;
    }
    speechSynthesis.resume();
    queue.current.push("Xin chào, đây là giọng đọc tiếng Việt của phòng.");
    run();
    return true;
  }, [run]);
  useEffect(() => {
    if (room?.session !== session.current) {
      stop();
      session.current = room?.session || "";
      seen.current = new Set(room?.messages.map((m) => m.id) || []);
      return;
    }
    const messages = room?.messages || [];
    for (const m of messages) {
      if (seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      if (enabled && queue.current.length < 5)
        queue.current.push(`${m.name}: ${[...m.text].slice(0, 120).join("")}`);
    }
    // The server retains 100 messages; do not retain every ID for the session.
    seen.current = new Set(messages.map((m) => m.id));
    if (enabled) run();
  }, [room?.session, room?.messages, enabled, run, stop]);
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);
  useEffect(() => stop, [stop]);
  return {
    speaking,
    warning,
    enable,
    stop,
    voices,
    voiceURI,
    selectVoice,
    announce,
  };
}
