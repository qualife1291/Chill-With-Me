import { deviceBudget } from "../shared/deviceBudget";
export type DeviceConnection = EventTarget & { saveData?: boolean };
export function readDeviceBudget() {
  const device = navigator as Navigator & {
    connection?: DeviceConnection;
    deviceMemory?: number;
  };
  return deviceBudget({
    touch: matchMedia("(pointer: coarse)").matches,
    saveData: !!device.connection?.saveData,
    memoryGB: device.deviceMemory,
    cores: device.hardwareConcurrency,
    pixelRatio: window.devicePixelRatio,
  });
}
