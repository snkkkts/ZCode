import { normalizeAppearanceSettings, type AppearanceSettings } from "@/lib/appearanceSettings.js";
import {
  loadAppearanceSettings,
  persistAppearanceSettings,
  applyAppearanceSettings,
} from "@/lib/appearanceEnvironment.js";
import { resolveTheme, type Theme } from "@/useTheme.js";

export interface AppearanceState {
  /** 外观覆盖层唯一状态；写入失败时保持当前已接受配置。 */
  appearanceSettings: AppearanceSettings;
  setAppearanceSettings: (patch: Partial<AppearanceSettings>) => boolean;
}

export function createAppearanceState(
  set: (patch: Pick<AppearanceState, "appearanceSettings">) => void,
  get: () => Pick<AppearanceState, "appearanceSettings"> & { theme: Theme },
): AppearanceState {
  return {
    appearanceSettings: loadAppearanceSettings(),
    setAppearanceSettings: (patch) => {
      const next = normalizeAppearanceSettings({
        ...get().appearanceSettings,
        ...patch,
        version: 1,
      });
      if (!persistAppearanceSettings(next)) return false;
      applyAppearanceSettings(next, resolveTheme(get().theme));
      set({ appearanceSettings: next });
      return true;
    },
  };
}
