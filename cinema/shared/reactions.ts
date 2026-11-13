export const baseReactions = {
  flowers: { icon: "🎆", label: "Pháo bông" },
  applause: { icon: "👏", label: "Vỗ tay" },
  sad: { icon: "🥺", label: "Mếu mào" },
  troll: { icon: "😜", label: "Trêu vui" },
} as const;
export type BaseReaction = keyof typeof baseReactions;
export const REACTION_VARIANTS = [
  "love",
  "laugh",
  "wow",
  "celebrate",
  "thanks",
] as const;
export type ReactionVariant = (typeof REACTION_VARIANTS)[number];
export const reactionVariants: Record<
  ReactionVariant,
  { kind: BaseReaction; icon: string; label: string }
> = {
  love: { kind: "applause", icon: "❤️", label: "Thả tim" },
  laugh: { kind: "troll", icon: "😂", label: "Cười vui" },
  wow: { kind: "sad", icon: "😮", label: "Bất ngờ" },
  celebrate: { kind: "flowers", icon: "🎉", label: "Chúc mừng" },
  thanks: { kind: "applause", icon: "🙏", label: "Cảm ơn" },
};
export function reactionPreset(kind: BaseReaction, variant?: ReactionVariant) {
  const preset = variant && reactionVariants[variant];
  return preset && preset.kind === kind ? preset : baseReactions[kind];
}
export const reactionChoices = [
  ...Object.entries(baseReactions).map(([kind, p]) => ({
    ...p,
    kind: kind as BaseReaction,
    variant: undefined as ReactionVariant | undefined,
  })),
  ...REACTION_VARIANTS.map((variant) => ({
    ...reactionVariants[variant],
    variant,
  })),
];
