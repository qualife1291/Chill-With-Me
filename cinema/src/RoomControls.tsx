import type { ReactNode } from "react";
import { RotateCcw, X, Leaf } from "lucide-react";
import type { SceneQuality } from "./useSceneQuality";
import {
  CAMERA_PRESETS,
  type CameraPreset,
  type EffectsMode,
} from "../shared/experience";
import type { Lighting } from "../shared/ambience";
import type { useAmbience } from "./useAmbience";
export default function RoomControls({
  camera,
  onCamera,
  onReset,
  light,
  onLight,
  onClose,
  quality,
  onQuality,
  lighting,
  onLighting,
  ambience,
  voiceWarning,
  effects,
  onPreset,
  extras,
}: {
  voiceWarning?: string;
  extras?: ReactNode;
  effects: { mode: EffectsMode; change: (mode: EffectsMode) => void };
  onPreset: (preset: CameraPreset) => void;
  lighting: Lighting;
  onLighting: (value: Lighting) => void;
  ambience: ReturnType<typeof useAmbience>;
  quality: SceneQuality;
  onQuality: (quality: SceneQuality) => void;
  camera: string;
  onCamera: (mode: string) => void;
  onReset: () => void;
  light: boolean;
  onLight: () => void;
  onClose: () => void;
}) {
  return (
    <section
      className="room-controls"
      id="scene-control-sheet"
      aria-label="Điều chỉnh không gian và nhân vật"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <span>Không gian của bạn</span>
        <button type="button" onClick={onClose} aria-label="Đóng điều khiển">
          <X size={16} />
        </button>
      </header>
      {voiceWarning && (
        <p className="control-notice" role="status">
          {voiceWarning}
        </p>
      )}
      <div className="view-row">
        <label>
          Góc nhìn
          <select
            aria-label="Chọn góc nhìn"
            value={camera}
            onChange={(e) => onCamera(e.target.value)}
          >
            <option value="first">Mắt người</option>
            <option value="orbit">Tự do · nhìn quanh phòng</option>
          </select>
        </label>
        <button
          type="button"
          title="Nhìn màn chiếu"
          aria-label="Nhìn màn chiếu"
          onClick={onReset}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="camera-presets" role="group" aria-label="Góc xem nhanh">
        {(
          Object.entries(CAMERA_PRESETS) as [
            CameraPreset,
            (typeof CAMERA_PRESETS)[CameraPreset],
          ][]
        ).map(([id, preset]) => (
          <button key={id} onClick={() => onPreset(id)}>
            {preset.label}
          </button>
        ))}
      </div>
      <p className="control-hint">Kéo để nhìn · Cuộn để thu/phóng</p>
      <label className="scene-quality">
        Độ nét cảnh 3D
        <select
          aria-label="Độ nét cảnh 3D"
          value={quality}
          onChange={(e) => onQuality(e.target.value as SceneQuality)}
        >
          <option value="auto">Tự động theo thiết bị</option>
          <option value="economy">Tiết kiệm · máy nhẹ hơn</option>
          <option value="detail">Chi tiết</option>
        </select>
      </label>
      <p className="control-hint">
        Chỉ chỉnh cảnh 3D; độ nét video giữ nguyên.
      </p>
      {extras}
      <details className="control-section ambience-controls">
        <summary>Âm thanh & ánh sáng</summary>
        <p className="control-hint">Thiết lập riêng trên máy bạn.</p>
        <label>
          Hiệu ứng vui
          <select
            aria-label="Mức hiệu ứng"
            value={effects.mode}
            onChange={(e) => effects.change(e.target.value as EffectsMode)}
          >
            <option value="auto">Tự động theo thiết bị</option>
            <option value="full">Đầy đủ</option>
            <option value="quiet">Yên tĩnh · chỉ biểu tượng</option>
          </select>
        </label>
        <label>
          Đèn trong rạp
          <select
            aria-label="Đèn trong rạp"
            value={lighting}
            onChange={(e) => onLighting(e.target.value as Lighting)}
          >
            <option value="normal">Tiêu chuẩn</option>
            <option value="dim">Rạp dịu</option>
            <option value="warm">Ấm áp</option>
          </select>
        </label>
        <label>
          Âm thanh nền
          <select
            aria-label="Âm thanh nền"
            value={ambience.mode}
            onChange={(e) =>
              ambience.change(e.target.value as "off" | "rain" | "wind")
            }
          >
            <option value="off">Tắt âm nền</option>
            <option value="rain">Mưa nhẹ</option>
            <option value="wind">Gió êm</option>
          </select>
        </label>
        <label>
          Âm lượng nền · {ambience.volume}%
          <input
            aria-label="Âm lượng nền"
            type="range"
            min="0"
            max="50"
            step="5"
            value={ambience.volume}
            onChange={(e) => ambience.setVolume(Number(e.target.value))}
          />
        </label>
        <p className="control-hint">
          Âm tổng hợp nhẹ, tự giảm khi đọc tin; tắt khi rời phòng hoặc chuyển
          tab.
        </p>
        {ambience.warning && <p role="status">{ambience.warning}</p>}
      </details>
      <button className="light-toggle" onClick={onLight} aria-pressed={light}>
        <Leaf size={15} />
        {light ? "Bật 3D" : "Chế độ nhẹ"}
      </button>
    </section>
  );
}
