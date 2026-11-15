import { z } from "zod";
export const activitySchema = z.enum(["watch", "oaq", "loto"]);
export type Activity = z.infer<typeof activitySchema>;
export const activities = [
  {
    id: "watch",
    label: "Xem chung",
    description: "Phim, nhạc và những câu chuyện",
    detail: "YouTube · link · file của bạn",
  },
  {
    id: "oaq",
    label: "Ô ăn quan",
    description: "Rải vài quân, kể vài chuyện",
    detail: "2 người chơi · có khán giả",
  },
  {
    id: "loto",
    label: "Lô tô",
    description: "Một nhịp hô, cả hội cùng vui",
    detail: "2–10 người · vé riêng",
  },
] as const;
export const activityLabel = (id?: Activity) =>
  activities.find((a) => a.id === id)?.label || "Xem chung";
