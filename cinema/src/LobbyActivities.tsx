import { activities, type Activity } from "../shared/activities";
import "./lobby-activities.css";
function ActivityArt({ kind }: { kind: Activity }) {
  return (
    <svg
      viewBox="0 0 100 62"
      aria-hidden="true"
      className={`activity-art art-${kind}`}
    >
      {kind === "watch" ? (
        <>
          <rect x="9" y="5" width="82" height="47" rx="6" fill="#c9a36d" />
          <rect x="13" y="9" width="74" height="39" rx="3" fill="#173e38" />
          <path d="M44 19 62 29 44 39Z" fill="#f5e2bb" />
          <path d="M31 58h38" stroke="#c9a36d" strokeWidth="3" />
        </>
      ) : kind === "oaq" ? (
        <>
          <rect x="2" y="7" width="96" height="48" rx="14" fill="#b6844d" />
          {Array.from({ length: 12 }, (_, i) =>
            i === 0 || i === 6 ? (
              <rect
                key={i}
                x={i === 0 ? 7 : 81}
                y="13"
                width="12"
                height="36"
                rx="6"
                fill="#254b3d"
              />
            ) : (
              <rect
                key={i}
                x={22 + ((i - 1) % 5) * 11.5}
                y={i < 6 ? 14 : 34}
                width="9"
                height="14"
                rx="3"
                fill="#254b3d"
              />
            ),
          )}
          {[13, 34, 46, 57, 69, 87].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 21 : 41} r="3" fill="#f0e3bb" />
          ))}
        </>
      ) : (
        <>
          <path d="M22 53h56l-6-11H28Z" fill="#ba8645" />
          <circle
            cx="50"
            cy="25"
            r="21"
            fill="#284e44"
            stroke="#d9b66f"
            strokeWidth="2"
          />
          <ellipse
            cx="50"
            cy="25"
            rx="10"
            ry="21"
            fill="none"
            stroke="#d9b66f"
            strokeWidth="2"
          />
          <path d="M29 25h42" stroke="#d9b66f" />
          {[
            [40, 18],
            [56, 16],
            [61, 29],
            [43, 34],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={i % 2 ? "#ddb76c" : "#c16d60"}
            />
          ))}
        </>
      )}
    </svg>
  );
}
export function ActivityPicker({
  value,
  onChange,
  compact = false,
}: {
  value: Activity;
  onChange: (a: Activity) => void;
  compact?: boolean;
}) {
  return (
    <fieldset className={`activity-picker${compact ? " compact" : ""}`}>
      <legend>
        {compact ? "Hoạt động trong phòng" : "Hôm nay mình làm gì?"}
      </legend>
      <div className="activity-options">
        {activities.map((a) => (
          <label
            key={a.id}
            className={`activity-option${value === a.id ? " chosen" : ""}`}
          >
            <input
              type="radio"
              name={compact ? "entry-activity" : "lobby-activity"}
              value={a.id}
              checked={value === a.id}
              onChange={() => onChange(a.id)}
            />
            <ActivityArt kind={a.id} />
            <strong>{a.label}</strong>
            {!compact && <span>{a.description}</span>}
            <small>{a.detail}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export default function LobbyActivities({
  onCreate,
  available,
  busy,
}: {
  onCreate: (activity: Activity) => void;
  available: number;
  busy: boolean;
}) {
  return (
    <section
      className="lobby-activities"
      aria-label="Chọn hoạt động và tạo phòng"
    >
      <h2>Hôm nay mình làm gì?</h2>
      <div className="activity-options activity-launchers">
        {activities.map((a) => (
          <button
            key={a.id}
            className="activity-option"
            disabled={busy || !available}
            aria-label={
              a.id === "watch" ? "Tạo phòng Xem chung" : `Chơi ${a.label}`
            }
            onClick={() => onCreate(a.id)}
          >
            <ActivityArt kind={a.id} />
            <strong>{a.label}</strong>
            <span>{a.description}</span>
            <small>{a.detail}</small>
            <b className="activity-launch-label">
              {a.id === "watch" ? "Tạo phòng xem" : "Tạo bàn chơi"}
            </b>
          </button>
        ))}
      </div>
      <p className="activity-availability">
        {available
          ? `${available}/3 phòng trống · Chọn một hoạt động để bắt đầu.`
          : "Cả ba phòng đang có người. Chọn phòng bên dưới để vào cùng bạn bè."}
      </p>
    </section>
  );
}
