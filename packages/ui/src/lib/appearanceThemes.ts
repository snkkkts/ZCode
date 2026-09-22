import { normalizeAppearanceSettings, type AppearanceSettings } from "./appearanceSettings.js";
import {
  getSafeLocalStorage,
  readSafeLocalStorage,
  type BrowserReadableStorageLike,
  type BrowserStorageLike,
} from "./browserEnvironment.js";
import type { AppearancePalette } from "./appearancePalettes.js";

const APPEARANCE_THEMES_STORAGE_KEY = "zcode-appearance-themes-v1";
export const MAX_APPEARANCE_THEMES = 30;
export const MAX_APPEARANCE_THEME_NAME_LENGTH = 40;

/** 用户保存的外观方案；settings 不含背景图片，避免逐方案保存大图耗尽本地存储配额。 */
export interface AppearanceTheme {
  id: string;
  name: string;
  settings: AppearanceSettings;
}

const THEME_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** 名称去除首尾空白与控制字符；不合规返回空字符串。 */
export function normalizeAppearanceThemeName(value: unknown): string {
  if (typeof value !== "string") return "";
  // oxlint-disable-next-line no-control-regex -- 这里正是要剔除控制字符
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return name.length > 0 && name.length <= MAX_APPEARANCE_THEME_NAME_LENGTH ? name : "";
}

function withoutBackground(settings: unknown): AppearanceSettings {
  return { ...normalizeAppearanceSettings(settings), backgroundImage: "" };
}

/** 逐项校验方案列表：丢弃非法项、重复 id 与超出上限的条目。 */
export function normalizeAppearanceThemes(value: unknown): AppearanceTheme[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const themes: AppearanceTheme[] = [];
  for (const item of value) {
    if (themes.length >= MAX_APPEARANCE_THEMES) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const { id, name, settings } = item as Record<string, unknown>;
    const normalizedName = normalizeAppearanceThemeName(name);
    if (typeof id !== "string" || !THEME_ID.test(id) || seen.has(id) || !normalizedName) continue;
    // 未知版本的方案无法安全解释，丢弃而不是回退为默认外观。
    if (!settings || (settings as { version?: unknown }).version !== 1) continue;
    seen.add(id);
    themes.push({ id, name: normalizedName, settings: withoutBackground(settings) });
  }
  return themes;
}

/** 广播接收端使用：只接受已是规范形式的完整列表。 */
export function isAppearanceThemeList(value: unknown): value is AppearanceTheme[] {
  return (
    Array.isArray(value) &&
    JSON.stringify(normalizeAppearanceThemes(value)) === JSON.stringify(value)
  );
}

export function loadAppearanceThemes(storage?: BrowserReadableStorageLike): AppearanceTheme[] {
  try {
    const raw = storage
      ? storage.getItem(APPEARANCE_THEMES_STORAGE_KEY)
      : readSafeLocalStorage(APPEARANCE_THEMES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1)
      return [];
    return normalizeAppearanceThemes((parsed as { themes?: unknown }).themes);
  } catch {
    return [];
  }
}

export function persistAppearanceThemes(
  themes: AppearanceTheme[],
  storage: BrowserStorageLike | null = getSafeLocalStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(APPEARANCE_THEMES_STORAGE_KEY, JSON.stringify({ version: 1, themes }));
    return true;
  } catch {
    return false;
  }
}

export function createAppearanceTheme(
  id: string,
  name: string,
  settings: AppearanceSettings,
): AppearanceTheme {
  return { id, name, settings: withoutBackground(settings) };
}

/** 应用方案：替换除背景图片外的全部字段，保留当前背景。 */
export function applyAppearanceTheme(
  theme: AppearanceTheme,
  current: AppearanceSettings,
): AppearanceSettings {
  return normalizeAppearanceSettings({
    ...theme.settings,
    backgroundImage: current.backgroundImage,
  });
}

/** 套用内置配色：只替换浅深色颜色，其余字段保持不变。 */
export function applyAppearancePalette(
  palette: AppearancePalette,
  current: AppearanceSettings,
): AppearanceSettings {
  return normalizeAppearanceSettings({ ...current, colors: palette.colors });
}

/** 复制时生成不重名的名称，例如“方案 副本”“方案 副本 2”。 */
export function duplicateThemeName(name: string, existing: readonly string[], suffix: string) {
  const taken = new Set(existing);
  for (let index = 1; index < 1000; index++) {
    const candidate = `${name} ${suffix}${index > 1 ? ` ${index}` : ""}`;
    const trimmed =
      candidate.length > MAX_APPEARANCE_THEME_NAME_LENGTH
        ? `${name.slice(0, MAX_APPEARANCE_THEME_NAME_LENGTH - candidate.length + name.length)} ${suffix}${index > 1 ? ` ${index}` : ""}`
        : candidate;
    if (!taken.has(trimmed)) return trimmed;
  }
  return name;
}
