import { useState } from "react";
import { Link } from "lucide-react";
import type { Command, Room } from "../shared/model";
export default function InvitationControls({
  room,
  slot,
  host,
  onCommand,
}: {
  room: Room;
  slot: number;
  host: boolean;
  onCommand: (c: Command, onSuccess?: () => void) => Promise<void>;
}) {
  const [manual, setManual] = useState(false),
    [notice, setNotice] = useState("");
  const privateRoom = room.visibility === "private",
    allowed = !privateRoom || !!room.inviteKey;
  const url = `${location.origin}/?room=${slot}&session=${room.session}${privateRoom && room.inviteKey ? "#invite=" + encodeURIComponent(room.inviteKey) : ""}`;
  return (
    <div className="invitation-controls">
      <button
        disabled={!allowed}
        onClick={async () => {
          try {
            if (!navigator.clipboard) throw Error();
            await navigator.clipboard.writeText(url);
            setManual(false);
            setNotice("Đã sao chép link mời.");
          } catch {
            setManual(true);
            setNotice("Chọn và sao chép link bên dưới.");
          }
        }}
      >
        <Link size={16} />
        Mời bạn
      </button>
      {privateRoom && host && (
        <button
          title="Thu hồi link cũ và yêu cầu đang chờ; giữ thành viên hiện tại"
          onClick={() => {
            void onCommand({ type: "rotate-invite" }, () => {
              setManual(false);
              setNotice(
                "Đã đổi link mời. Link cũ và yêu cầu đang chờ đã bị thu hồi; thành viên hiện tại vẫn ở lại.",
              );
            });
          }}
        >
          Đổi link mời
        </button>
      )}
      {!allowed && <small>Xin link mời từ chủ phòng.</small>}
      {notice && <small role="status">{notice}</small>}
      {manual && allowed && (
        <label className="invitation-fallback">
          Link mời để sao chép
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
