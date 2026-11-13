// This module (including PDF.js and its worker) is loaded only for a document.
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerURL from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  documentMime,
  imageDimensions,
  documentRasterSize,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_PAGES,
  MAX_IMAGE_PIXELS,
  type DocumentMetadata,
} from "../shared/presentation";
GlobalWorkerOptions.workerSrc = workerURL;
export type DocumentResource = {
  pages: number;
  render: (
    page: number,
    economical: boolean,
    signal: AbortSignal,
  ) => Promise<HTMLCanvasElement>;
  destroy: () => Promise<void>;
};
const invalid =
  "Không đọc được tài liệu. Hãy dùng PDF, PNG, JPEG hoặc WebP hợp lệ.";
export async function openDocument(
  file: Blob,
  mime: DocumentMetadata["mime"],
  signal?: AbortSignal,
): Promise<DocumentResource> {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES)
    throw Error("Tài liệu tối đa 20 MB và cần có nội dung.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const pdf = mime === "application/pdf";
  const head = String.fromCharCode(...bytes.subarray(0, 12));
  if (
    pdf
      ? !head.startsWith("%PDF-")
      : mime === "image/png"
        ? !(bytes[0] === 137 && head.slice(1, 4) === "PNG")
        : mime === "image/jpeg"
          ? !(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
          : !(head.startsWith("RIFF") && head.slice(8, 12) === "WEBP")
  )
    throw Error(invalid);
  let loading: PDFDocumentLoadingTask | undefined,
    doc: PDFDocumentProxy | undefined,
    image: ImageBitmap | undefined,
    closed = false,
    timedOut = false;
  const tasks = new Set<RenderTask>();
  let rendering: Promise<void> = Promise.resolve();
  const destroy = async () => {
    // Native bitmap decoding may finish after abort has already closed the resource.
    image?.close();
    image = undefined;
    if (closed) return;
    closed = true;
    for (const t of tasks) t.cancel();
    await loading?.destroy();
  };
  const abort = () => {
    void destroy().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    if (pdf) {
      loading = getDocument({
        data: bytes,
        cMapUrl: "/pdf/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdf/standard_fonts/",
        wasmUrl: "/pdf/wasm/",
        iccUrl: "/pdf/iccs/",
        stopAtErrors: true,
        maxImageSize: MAX_IMAGE_PIXELS,
        canvasMaxAreaInBytes: 16 * 1024 * 1024,
        enableXfa: false,
        disableAutoFetch: true,
        disableStream: true,
      });
      const timer = setTimeout(() => {
        timedOut = true;
        abort();
      }, 15000);
      try {
        doc = await loading.promise;
      } finally {
        clearTimeout(timer);
      }
      if (doc.numPages > MAX_DOCUMENT_PAGES)
        throw Error("PDF tối đa 200 trang.");
    } else {
      imageDimensions(bytes, mime);
      image = await createImageBitmap(new Blob([bytes], { type: mime }));
      if (image.width * image.height > MAX_IMAGE_PIXELS)
        throw Error(
          "Ảnh tối đa 16 triệu pixel. Hãy giảm kích thước ảnh rồi thử lại.",
        );
    }
    if (closed || signal?.aborted)
      throw new DOMException("Cancelled", "AbortError");
    return {
      pages: doc?.numPages || 1,
      destroy: async () => {
        signal?.removeEventListener("abort", abort);
        await destroy();
      },
      render: (page, economical, renderSignal) => {
        const next = rendering
          .catch(() => {})
          .then(async () => {
            if (closed || renderSignal.aborted)
              throw new DOMException("Cancelled", "AbortError");
            const pdfPage = doc ? await doc.getPage(page) : undefined;
            if (closed || renderSignal.aborted) {
              pdfPage?.cleanup();
              throw new DOMException("Cancelled", "AbortError");
            }
            const dimensions = pdfPage?.getViewport({ scale: 1 }) || {
              width: image!.width,
              height: image!.height,
            };
            const size = documentRasterSize(
                dimensions.width,
                dimensions.height,
                economical,
              ),
              scale = size.scale;
            const canvas = document.createElement("canvas");
            canvas.width = size.width;
            canvas.height = size.height;
            canvas.setAttribute("role", "img");
            canvas.setAttribute("aria-label", `Trang ${page}`);
            const context = canvas.getContext("2d", { alpha: false });
            if (!context)
              throw Error("Thiết bị chưa mở được khung trình chiếu.");
            let task: RenderTask | undefined;
            const cancel = () => task?.cancel();
            renderSignal.addEventListener("abort", cancel, { once: true });
            const timer = setTimeout(cancel, 12000);
            try {
              if (pdfPage) {
                task = pdfPage.render({
                  canvas,
                  canvasContext: context,
                  viewport: pdfPage.getViewport({ scale }),
                  annotationMode: 0,
                });
                tasks.add(task);
                await task.promise;
              } else
                context.drawImage(image!, 0, 0, canvas.width, canvas.height);
              if (renderSignal.aborted || closed)
                throw new DOMException("Cancelled", "AbortError");
              return canvas;
            } catch (e) {
              canvas.width = canvas.height = 0;
              throw e;
            } finally {
              clearTimeout(timer);
              renderSignal.removeEventListener("abort", cancel);
              if (task) tasks.delete(task);
              pdfPage?.cleanup();
            }
          });
        rendering = next.then(
          () => {},
          () => {},
        );
        return next;
      },
    };
  } catch (e) {
    signal?.removeEventListener("abort", abort);
    await destroy().catch(() => {});
    if (timedOut)
      throw Error(
        "PDF xử lý quá lâu. Hãy giảm độ phức tạp của tài liệu rồi thử lại.",
      );
    const name =
      e && typeof e === "object" && "name" in e ? String(e.name) : "";
    if (name === "PasswordException")
      throw Error("PDF có mật khẩu. Hãy dùng bản không khóa để trình chiếu.");
    if (
      [
        "InvalidPDFException",
        "FormatError",
        "UnknownErrorException",
        "ResponseException",
        "EncodingError",
      ].includes(name)
    )
      throw Error(invalid);
    throw e;
  }
}
export async function validateDocument(file: File, signal?: AbortSignal) {
  const mime = documentMime(file.name, file.type);
  if (!mime) throw Error(invalid);
  const resource = await openDocument(file, mime, signal);
  try {
    const canvas = await resource.render(
      1,
      true,
      signal || new AbortController().signal,
    );
    canvas.width = canvas.height = 0;
    return { mime, pages: resource.pages };
  } finally {
    await resource.destroy();
  }
}
