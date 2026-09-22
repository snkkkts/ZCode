import { normalizeAppearanceSettings, type AppearanceSettings } from "@/lib/appearanceSettings.js";
import {
  loadAppearanceSettings,
  persistAppearanceSettings,
  applyAppearanceSettings,
} from "@/lib/appearanceEnvironment.js";
import {
  loadAppearanceThemes,
  normalizeAppearanceThemes,
  persistAppearanceThemes,
  type AppearanceTheme,
} from "@/lib/appearanceThemes.js";
import { resolveTheme, type Theme } from "@/useTheme.js";

export interface AppearanceState {
  /** 外观覆盖层唯一状态；写入失败时保持当前已接受配置。 */
  appearanceSettings: AppearanceSettings;
  setAppearanceSettings: (patch: Partial<AppearanceSettings>) => boolean;
  /** 用户保存的外观方案列表唯一状态；写入失败时保持当前列表。 */
  appearanceThemes: AppearanceTheme[];
  setAppearanceThemes: (themes: AppearanceTheme[]) => boolean;
}

export function createAppearanceState(
  set: (patch: Partial<Pick<AppearanceState, "appearanceSettings" | "appearanceThemes">>) => void,
  get: () => Pick<AppearanceState, "appearanceSettings" | "appearanceThemes"> & { theme: Theme },
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
    appearanceThemes: loadAppearanceThemes(),
    setAppearanceThemes: (themes) => {
      const next = normalizeAppearanceThemes(themes);
      if (!persistAppearanceThemes(next)) return false;
      set({ appearanceThemes: next });
      return true;
    },
  };
}
