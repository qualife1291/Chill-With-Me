import * as stylex from "@stylexjs/stylex";
import { tokens } from "../designTokens.stylex";
const styles = stylex.create({
  root: {
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: tokens["--cw-line"],
  },
  summary: {
    minHeight: 44,
    display: "list-item",
    alignContent: "center",
    cursor: "pointer",
  },
  body: {
    fontSize: 13,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
    color: tokens["--cw-text-muted"],
  },
});
export default function GameRules({ kind }: { kind: "oaq" | "loto" }) {
  return (
    <details {...stylex.props(styles.root)}>
      <summary {...stylex.props(styles.summary)}>
        Luật chơi · Cùng Xem v1
      </summary>
      {kind === "oaq" ? (
        <p {...stylex.props(styles.body)}>
          Quan = 10 dân, không quan non. Rải xong xét ô kế tiếp để rải tiếp hoặc
          ăn chuỗi cách một ô trống. Hết dân rải bù thì vay đúng phần thiếu, ghi
          nợ. Nếu không đủ dân vay, ván kết thúc, mỗi người thu dân phía mình;
          hai ô quan còn lại trung lập. Ăn cả hai quan thì tính điểm; giới hạn
          500 lượt/lượt rải quá dài được xử hòa.
        </p>
      ) : (
        <p {...stylex.props(styles.body)}>
          Bộ số 1–90, mỗi vé 15 số, mỗi hàng 5 số. Chủ gọi cách nhau ít nhất 3
          giây. Khi có hàng đủ, ngừng gọi; Kinh được kiểm tra và mọi vé cùng đủ
          ở lần gọi đó đều thắng. Tắt âm vẫn chơi đầy đủ.
        </p>
      )}
      <p {...stylex.props(styles.body)}>
        Chuyển chủ không đổi người chơi. Reload giữ chỗ theo phòng; Ô dừng nếu
        người chơi thực sự rời, lô tô tiếp tục nếu còn ít nhất hai người. Không
        cược/đổi thưởng.
      </p>
    </details>
  );
}
