import { z } from "zod";

export const spaceSchema = z.enum(["cinema", "lounge", "rooftop"]);
export type Space = z.infer<typeof spaceSchema>;
export const spaces: {
  id: Space;
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    id: "cinema",
    label: "Rạp chiếu",
    description: "Gỗ tối · ánh đèn hổ phách",
    accent: "#d7aa70",
  },
  {
    id: "lounge",
    label: "Lounge ấm áp",
    description: "Góc sách · sắc gỗ và cây xanh",
    accent: "#b8c59b",
  },
  {
    id: "rooftop",
    label: "Sân thượng đêm",
    description: "Trời sao · đường chân trời thành phố",
    accent: "#9cbae1",
  },
];
export function spaceInfo(value?: string) {
  return spaces.find((space) => space.id === value) || spaces[0];
}
