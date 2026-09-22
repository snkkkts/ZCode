import {
  APPEARANCE_COLOR_TOKENS,
  DEFAULT_APPEARANCE_SETTINGS,
  MAX_BACKGROUND_BYTES,
  normalizeAppearanceSettings,
  type AppearanceColor,
  type AppearanceSettings,
} from "./appearanceSettings.js";

export const MAX_APPEARANCE_CODE_LENGTH = 3 * 1024 * 1024;

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(path);
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw new Error(`${path}.${key}`);
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** 以当前配置为底合并颜色：按浅深色、按颜色键覆盖；空字符串表示删除覆盖、恢复继承。 */
function mergeColors(
  base: AppearanceSettings["colors"],
  value: unknown,
): AppearanceSettings["colors"] {
  const colors = object(value, "colors");
  keys(colors, ["light", "dark"], "colors");
  const merged = { light: { ...base.light }, dark: { ...base.dark } };
  for (const mode of ["light", "dark"] as const) {
    if (!(mode in colors)) continue;
    const palette = object(colors[mode], `colors.${mode}`);
    keys(palette, Object.keys(APPEARANCE_COLOR_TOKENS), `colors.${mode}`);
    for (const [key, color] of Object.entries(palette) as [AppearanceColor, unknown][]) {
      if (color === "") delete merged[mode][key];
      else if (typeof color === "string" && HEX_COLOR.test(color)) merged[mode][key] = color;
      else throw new Error(`colors.${mode}.${key}`);
    }
  }
  return merged;
}

/**
 * 解析配置代码并以 `base`（应用时刻的已接受配置）为底合并：写出的字段覆盖，未写出的保持。
 * 仍严格拒绝未知字段与有损归一化，避免拼写错误被静默忽略。
 */
export function parseAppearancePatch(code: string, base: AppearanceSettings): AppearanceSettings {
  if (code.length > MAX_APPEARANCE_CODE_LENGTH) throw new Error("size");
  let value: unknown;
  try {
    value = JSON.parse(code);
  } catch {
    throw new Error("JSON");
  }
  const input = object(value, "root");
  keys(input, Object.keys(DEFAULT_APPEARANCE_SETTINGS), "root");
  if ("version" in input && input.version !== 1) throw new Error("version");
  const colors = "colors" in input ? mergeColors(base.colors, input.colors) : base.colors;
  const normalized = normalizeAppearanceSettings({ ...base, ...input, colors, version: 1 });
  for (const key of ["overlay", "blur", "panelOpacity", "sidebarOpacity", "mathScale"] as const) {
    if (key in input && input[key] !== normalized[key]) throw new Error(key);
  }
  for (const key of ["fontFamily", "codeFontFamily"] as const) {
    const font = input[key];
    if (key in input && (typeof font !== "string" || font.trim() !== normalized[key]))
      throw new Error(key);
  }
  if ("mathBold" in input && typeof input.mathBold !== "boolean") throw new Error("mathBold");
  if ("backgroundFit" in input && input.backgroundFit !== normalized.backgroundFit)
    throw new Error("backgroundFit");
  if ("backgroundImage" in input && input.backgroundImage !== normalized.backgroundImage)
    throw new Error("backgroundImage");
  if (normalized.backgroundImage) {
    const base64 = normalized.backgroundImage.split(",")[1]!;
    const bytes =
      (base64.length * 3) / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    if (bytes > MAX_BACKGROUND_BYTES) throw new Error("backgroundImage.size");
  }
  return normalized;
}

/** 导出：包含背景图片的完整配置，用于分享或备份。 */
export function serializeAppearanceCode(settings: AppearanceSettings): string {
  return JSON.stringify(normalizeAppearanceSettings(settings), null, 2);
}

/** 代码框视图：省略可达数 MB 的背景图片；合并语义下缺省即保留当前背景。 */
export function serializeAppearanceEditorCode(settings: AppearanceSettings): string {
  const view: Partial<AppearanceSettings> = normalizeAppearanceSettings(settings);
  delete view.backgroundImage;
  return JSON.stringify(view, null, 2);
}
