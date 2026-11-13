import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { openDocument, type DocumentResource } from "./presentationDocument";
import type { Presentation } from "../shared/presentation";
import type { FileShare } from "./FileShare";
export default function PresentationScreen({
  presentation,
  files,
  economical,
  onReady,
}: {
  presentation: Presentation;
  files: FileShare;
  economical: boolean;
  onReady: (ready: boolean) => void;
}) {
  const transfer = useSyncExternalStore(files.subscribe, files.snapshot),
    holder = useRef<HTMLDivElement>(null);
  const [resource, setResource] = useState<DocumentResource | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    let opened: DocumentResource | undefined;
    setResource(null);
    setError("");
    setPage(0);
    onReady(false);
    if (transfer.url)
      void fetch(transfer.url, { signal: abort.signal })
        .then((r) => r.blob())
        .then((blob) =>
          openDocument(blob, presentation.source.mime, abort.signal),
        )
        .then((r) => {
          opened = r;
          if (abort.signal.aborted) {
            void r.destroy();
            return;
          }
          if (r.pages !== presentation.source.pages) {
            void r.destroy();
            throw Error(
              "Số trang tài liệu không khớp. Chủ phòng cần chọn lại đúng file.",
            );
          }
          setResource(r);
        })
        .catch((e) => {
          if (!abort.signal.aborted)
            setError(
              e instanceof Error ? e.message : "Không mở được tài liệu.",
            );
        });
    return () => {
      abort.abort();
      void opened?.destroy().catch(() => {});
      for (const c of holder.current?.querySelectorAll("canvas") || [])
        c.width = c.height = 0;
      holder.current?.replaceChildren();
      onReady(false);
    };
  }, [transfer.url, presentation.source.fileId, onReady]);
  useEffect(() => {
    if (!resource || !visible) return;
    const abort = new AbortController();
    setError("");
    void resource
      .render(presentation.page, economical, abort.signal)
      .then((canvas) => {
        if (abort.signal.aborted) {
          canvas.width = canvas.height = 0;
          return;
        }
        const old = Array.from(
          holder.current?.querySelectorAll("canvas") || [],
        );
        holder.current?.replaceChildren(canvas);
        for (const c of old) c.width = c.height = 0;
        setPage(presentation.page);
        onReady(true);
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Không dựng được trang này.",
          );
      });
    return () => abort.abort();
  }, [resource, presentation.page, economical, visible, onReady]);
  return (
    <section
      className="presentation-screen"
      aria-label="Màn trình chiếu"
      data-page={page}
    >
      <div className="presentation-canvas" ref={holder} />
      {page !== presentation.page && !error && (
        <p className="presentation-status" role="status">
          {transfer.url
            ? `Đang chuẩn bị trang ${presentation.page}…`
            : `Đang nhận tài liệu · ${Math.round((100 * transfer.received) / Math.max(1, transfer.size))}%`}
        </p>
      )}
      {(error || transfer.error) && (
        <p className="presentation-status" role="alert">
          {error || transfer.error}
        </p>
      )}
      <span className="presentation-page">
        {page || "…"} / {presentation.source.pages}
      </span>
    </section>
  );
}
