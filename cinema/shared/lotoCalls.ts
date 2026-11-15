// Original project-authored call lines, 15/11/2026; no borrowed song lyrics/recordings.
const lines = [
  "Một chén trà, ấm câu ca",
  "Hai người bạn, chung tiếng đàn",
  "Ba đốm nắng, chạm hiên nhà",
  "Bốn mùa vui, ngồi cạnh bạn",
  "Năm cánh nhỏ, đón trời xanh",
  "Sáu tiếng cười, tan ngày vội",
  "Bảy sắc cầu, ngang trời mới",
  "Tám nhịp tay, chung một hội",
  "Chín vì sao, đêm dịu lại",
  "Tròn một nhịp, vui chưa nghỉ",
  "Cửa vừa mở, bạn mình tới",
  "Ly trà mát, chuyện còn dài",
  "Nắng qua rèm, lòng thêm êm",
  "Mưa ngoài ngõ, mình ngồi đó",
  "Gác việc vội, ngồi thảnh thơi",
  "Đèn vừa sáng, nghe bạn hát",
  "Mây đi ngang, câu ca sang",
  "Gió qua sân, bạn thêm gần",
  "Một bông hoa, gửi cả nhà",
  "Thêm vòng mới, vui phơi phới",
  "Trà vừa rót, lời vừa ngọt",
  "Hai nhịp vỗ, phố cũng vui",
  "Bên khung cửa, chuyện ngày xưa",
  "Sân đầy nắng, lòng phẳng lặng",
  "Đôi dép nhỏ, đứng chờ nhau",
  "Mở cửa sổ, gió ghé chơi",
  "Đàn gảy nhẹ, bạn lắng nghe",
  "Mèo nằm ngủ, mình chơi đủ",
  "Chim qua ngõ, mang tin nhỏ",
  "Tròn ba chục, vui tiếp tục",
  "Thuyền neo bến, bạn vừa đến",
  "Trăng trên mái, chuyện kể hoài",
  "Cười một cái, ngày nhẹ lại",
  "Nắng nằm nghiêng, ghé bên hiên",
  "Đĩa bánh nhỏ, chia cùng nhau",
  "Một câu hỏi, bao chuyện mới",
  "Lá đung đưa, chờ cơn mưa",
  "Tay vỗ nhịp, tim bắt kịp",
  "Chậm một chút, vui từng phút",
  "Tròn bốn chục, mình tiếp tục",
  "Ngồi thêm lát, nghe câu hát",
  "Hai tách nhỏ, đầy chuyện trò",
  "Sương vừa tan, ấm bàn tay",
  "Cánh diều nhỏ, bay cùng gió",
  "Thả nụ cười, nhẹ vai người",
  "Hoa ngoài hiên, chờ bạn hiền",
  "Bình trà mới, thơm khắp hội",
  "Rạp thêm vui, đừng vội lui",
  "Đôi vai mỏi, nghỉ chút thôi",
  "Nửa đường rồi, cười thật tươi",
  "Tia nắng mới, chào ngày tới",
  "Câu chuyện nhỏ, ấm căn phòng",
  "Bánh vừa chín, bạn cùng xin",
  "Mở bản nhạc, nghe gió hát",
  "Đôi chim nhỏ, về chung tổ",
  "Một lời chúc, nhiều niềm vui",
  "Trời xanh biếc, mình chơi tiếp",
  "Gió đưa hương, qua con đường",
  "Tay nâng tách, chuyện xanh ngát",
  "Sáu mươi tới, thêm nhịp mới",
  "Mưa lách tách, thơm trang sách",
  "Bạn kể tiếp, mình nghe nhé",
  "Một đàn bướm, ngang vườn thơm",
  "Nắng vàng nhạt, chiều lên hát",
  "Tóc vương gió, cười thật nhỏ",
  "Trăng qua cửa, sáng thêm nữa",
  "Cây thêm lá, bạn thêm ca",
  "Hẹn cuối tuần, lại quây quần",
  "Ngõ đầy hoa, đón bạn qua",
  "Bảy mươi rồi, vui cùng tôi",
  "Bên bếp ấm, tình bạn đậm",
  "Hai bàn tay, vỗ thật hay",
  "Mở trang mới, đón chuyện vui",
  "Thềm nhà nhỏ, thơm mùi cỏ",
  "Một buổi chiều, bao điều yêu",
  "Thả lo âu, cười cùng nhau",
  "Mây thành sóng, trời xanh trong",
  "Nhạc vừa dứt, vui chưa hết",
  "Vui vừa đủ, ngủ thật ngon",
  "Tám mươi sang, cả nhà vang",
  "Đêm đầy sao, chào bạn nhé",
  "Đôi đèn nhỏ, sáng bên nhau",
  "Mùa nào tới, bạn vẫn vui",
  "Bước chân chậm, chuyện tình thân",
  "Cánh hoa nhỏ, gửi người thương",
  "Lòng bình yên, thêm bạn hiền",
  "Vui một chút, nhớ từng phút",
  "Hai vòng tròn, tiếng cười giòn",
  "Thêm chút nữa, mình chơi nữa",
  "Chín mươi tròn, niềm vui còn",
] as const;
const digits = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];
export function vietnameseNumber(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > 90)
    throw Error("INVALID_LOTO_NUMBER");
  if (n < 10) return digits[n];
  const tens = Math.floor(n / 10),
    unit = n % 10;
  return (
    (tens === 1 ? "mười" : digits[tens] + " mươi") +
    (unit === 0
      ? ""
      : " " +
        (unit === 1 && tens > 1 ? "mốt" : unit === 5 ? "lăm" : digits[unit]))
  );
}
export function callVariant(id: string, count: number) {
  let hash = count;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash % 3;
}
export function lotoCall(n: number, variant = 0) {
  const number = vietnameseNumber(n),
    intro = ["Bạn mình ơi", "Cùng vỗ tay", "Nghe nhịp này"][
      Math.abs(Math.trunc(variant)) % 3
    ];
  return {
    number,
    line: lines[n - 1],
    text: `${intro}! ${lines[n - 1]}. Số ${number}!`,
  };
}
