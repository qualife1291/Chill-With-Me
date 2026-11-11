export type DeviceHints = {
  touch: boolean;
  saveData: boolean;
  memoryGB?: number;
  cores?: number;
  pixelRatio?: number;
};
/** Coarse hints select a conservative default, never override an explicit choice. */
export function deviceBudget(h: DeviceHints) {
  const lowMemory =
    Number.isFinite(h.memoryGB) && h.memoryGB! > 0 && h.memoryGB! <= 2;
  const lowCPU = Number.isFinite(h.cores) && h.cores! > 0 && h.cores! <= 2;
  const ratio =
    Number.isFinite(h.pixelRatio) && h.pixelRatio! > 0 ? h.pixelRatio! : 1;
  return {
    economy: h.touch || h.saveData || lowMemory || lowCPU,
    ratio: Math.min(1.3, Math.max(0.5, ratio)),
  };
}
