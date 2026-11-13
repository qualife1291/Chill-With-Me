import { useEffect, useRef, useState } from "react";
import { usePreference } from "./usePreference";
type Sentinel = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};
type Wake = { request: (kind: "screen") => Promise<Sentinel> };
export function useWakeLock(session: string, playing: boolean) {
  const [preference, change] = usePreference(
    "cinema-wake-lock",
    ["off", "on"] as const,
    "off",
  );
  const [warning, setWarning] = useState("");
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const serial = useRef(0);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const ticket = ++serial.current;
    let sentinel: Sentinel | undefined;
    setWarning("");
    setHeld(false);
    if (!session || preference !== "on" || !playing || !visible) return;
    const wake = (navigator as Navigator & { wakeLock?: Wake }).wakeLock;
    if (!wake) {
      setWarning(
        "Trình duyệt chưa hỗ trợ giữ sáng màn hình. Bạn vẫn xem bình thường.",
      );
      return;
    }
    const released = () => {
      setHeld(false);
      setWarning("Thiết bị vừa nhả giữ sáng. Bạn có thể bật lại khi cần.");
    };
    void wake
      .request("screen")
      .then((lock) => {
        if (ticket !== serial.current) {
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        lock.addEventListener("release", released);
        setHeld(!lock.released);
      })
      .catch(() => {
        if (ticket === serial.current)
          setWarning(
            "Chưa giữ sáng được màn hình. Thiết bị có thể đang tiết kiệm pin hoặc chưa cho phép.",
          );
      });
    return () => {
      serial.current++;
      sentinel?.removeEventListener("release", released);
      void sentinel?.release().catch(() => {});
    };
  }, [session, preference, playing, visible]);
  return {
    enabled: preference === "on",
    toggle: () => change(preference === "on" ? "off" : "on"),
    held,
    warning,
  };
}
