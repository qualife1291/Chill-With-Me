import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_CAPTION_BYTES, validateCaptions } from "../shared/captions";
export function useLocalCaptions(sourceKey: string, supported: boolean) {
  const [url, setURL] = useState("");
  const [name, setName] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const current = useRef("");
  const epoch = useRef(0);
  const clear = useCallback(() => {
    epoch.current++;
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = "";
    setURL("");
    setName("");
    setWarning("");
    setLoading(false);
  }, []);
  useEffect(() => {
    clear();
    return () => {
      epoch.current++;
      if (current.current) URL.revokeObjectURL(current.current);
      current.current = "";
    };
  }, [sourceKey, supported, clear]);
  const choose = async (file?: File) => {
    if (!file) return;
    const ticket = ++epoch.current;
    setWarning("");
    setLoading(false);
    if (!supported || !sourceKey) {
      setWarning(
        "Phụ đề riêng chỉ dùng với video native; YouTube và bản xem trước Drive dùng phụ đề của trình phát.",
      );
      return;
    }
    if (
      !/\.vtt$/i.test(file.name) ||
      !file.size ||
      file.size > MAX_CAPTION_BYTES
    ) {
      setWarning("Chọn file .vtt UTF-8 có nội dung, tối đa 256 KiB.");
      return;
    }
    setLoading(true);
    try {
      const parsed = validateCaptions(new Uint8Array(await file.arrayBuffer()));
      if (ticket !== epoch.current) return;
      const next = URL.createObjectURL(
        new Blob([parsed.text], { type: "text/vtt" }),
      );
      if (current.current) URL.revokeObjectURL(current.current);
      current.current = next;
      setURL(next);
      setName(file.name);
    } catch (e) {
      if (ticket === epoch.current)
        setWarning(e instanceof Error ? e.message : "Chưa đọc được phụ đề.");
    } finally {
      if (ticket === epoch.current) setLoading(false);
    }
  };
  return { url, name, warning, loading, supported, choose, clear };
}
