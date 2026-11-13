import { AUDIO_PRIORITIES, type AudioPriority } from "../shared/audioMix";
import { MOTION_MODES, type MotionMode } from "../shared/immersive";
import type { useWakeLock } from "./useWakeLock";
import type { useLocalCaptions } from "./useLocalCaptions";
export default function CinemaPreferences({
  priority,
  onPriority,
  motion,
  onMotion,
  onTryMotion,
  reduced,
  light,
  wake,
  captions,
  soundWarning,
}: {
  priority: AudioPriority;
  onPriority: (p: AudioPriority) => void;
  motion: MotionMode;
  onMotion: (m: MotionMode) => void;
  onTryMotion: () => void;
  reduced: boolean;
  light: boolean;
  wake: ReturnType<typeof useWakeLock>;
  captions: ReturnType<typeof useLocalCaptions>;
  soundWarning: string;
}) {
  return (
    <details className="control-section cinema-preferences">
      <summary>Trải nghiệm xem</summary>
      <label>
        Ưu tiên âm thanh
        <select
          aria-label="Ưu tiên âm thanh"
          value={priority}
          onChange={(e) => {
            if (AUDIO_PRIORITIES.includes(e.target.value as AudioPriority))
              onPriority(e.target.value as AudioPriority);
          }}
        >
          <option value="balanced">Cân bằng</option>
          <option value="video">Ưu tiên video</option>
          <option value="interaction">Ưu tiên tương tác</option>
        </select>
      </label>
      <p className="control-hint">
        {priority === "video"
          ? "Khi phim phát, giảm âm nền, cảm xúc và giọng đọc mới; giữ âm lượng video."
          : priority === "interaction"
            ? "Video giảm còn 25% khi có cảm xúc, đọc tin hoặc âm nền. Âm lượng tự phục hồi khi kết thúc."
            : "Giữ mức âm bạn chọn; chỉ giảm video và âm nền khi đọc tin."}
      </p>
      {soundWarning && <p role="status">{soundWarning}</p>}
      <label>
        Chuyển động rạp
        <select
          aria-label="Chuyển động rạp"
          value={motion}
          onChange={(e) => {
            if (MOTION_MODES.includes(e.target.value as MotionMode))
              onMotion(e.target.value as MotionMode);
          }}
        >
          <option value="off">Tắt · góc nhìn ổn định</option>
          <option value="gentle">Nhẹ</option>
          <option value="cinema">Sống động</option>
        </select>
      </label>
      <button
        type="button"
        disabled={motion === "off" || reduced || light}
        onClick={onTryMotion}
      >
        Thử chuyển động
      </button>
      <p className="control-hint">
        Chuyển động ngắn theo cảm xúc và tương tác, không phân tích nội dung
        phim. Tắt nếu bạn thấy chóng mặt.
      </p>
      {motion !== "off" && (reduced || light) && (
        <p role="status">
          {reduced
            ? "Thiết bị đang bật giảm chuyển động; rung được tạm dừng."
            : "Chuyển động chỉ áp dụng trong cảnh 3D."}
        </p>
      )}
      <button type="button" aria-pressed={wake.enabled} onClick={wake.toggle}>
        Giữ sáng màn hình: {wake.enabled ? "Bật" : "Tắt"}
      </button>
      <p className="control-hint">
        {wake.held
          ? "Đang giữ sáng khi phát video."
          : "Chỉ giữ sáng khi đang phát và trang đang hiển thị."}
      </p>
      {wake.warning && <p role="status">{wake.warning}</p>}
      <label className="caption-upload">
        <span>Chọn phụ đề riêng (.vtt)</span>
        <input
          type="file"
          aria-label="Chọn phụ đề VTT"
          accept=".vtt,text/vtt"
          disabled={!captions.supported || captions.loading}
          onChange={(e) => {
            void captions.choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="control-hint">
        UTF-8, tối đa 256 KiB / 2.000 cue. Chỉ trên máy bạn và video native;
        YouTube/Drive preview dùng phụ đề của trình phát.
      </p>
      {captions.name && (
        <div className="caption-choice">
          <span>{captions.name}</span>
          <button type="button" onClick={captions.clear}>
            Xóa phụ đề
          </button>
        </div>
      )}
      {captions.loading && <p role="status">Đang đọc phụ đề…</p>}
      {captions.warning && <p role="alert">{captions.warning}</p>}
    </details>
  );
}
