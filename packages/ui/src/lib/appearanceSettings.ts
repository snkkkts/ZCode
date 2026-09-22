export const APPEARANCE_STORAGE_KEY = "zcode-appearance-v1";
export const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MATH_SCALE = 121;
export const MIN_MATH_SCALE = 80;
export const MAX_MATH_SCALE = 160;

export const APPEARANCE_COLOR_TOKENS = {
  background: "--color-background",
  sidebar: "--color-sidebar",
  panel: "--color-panel",
  card: "--color-card",
  input: "--color-input",
  brand: "--color-brand",
  foreground: "--color-foreground",
  secondaryText: "--color-foreground-subtle",
  border: "--color-border",
  // 以下覆盖已有语义变量，不新增第二套 token；链接沿用 DESIGN.md 中 icon-blue 的链接角色。
  link: "--color-icon-blue",
  inlineCode: "--color-markdown-inline-code",
  primary: "--color-primary",
  primaryText: "--color-primary-foreground",
  // KaTeX 公式没有既有语义变量，使用外观层私有变量，仅由 appearance.css 的 .katex 规则消费。
  math: "--appearance-math-color",
} as const;
export type AppearanceColor = keyof typeof APPEARANCE_COLOR_TOKENS;
export type AppearanceMode = "light" | "dark";
export type AppearanceColors = Partial<Record<AppearanceColor, string>>;
export interface AppearanceSettings {
  version: 1;
  backgroundImage: string;
  backgroundFit: "cover" | "contain";
  overlay: number;
  blur: number;
  panelOpacity: number;
  sidebarOpacity: number;
  fontFamily: string;
  /** 代码块、行内代码、代码预览与 Diff 的等宽字体；终端字体仍由终端设置管理。 */
  codeFontFamily: string;
  /** 公式使用 KaTeX 自带的粗体字形；只有常规/粗体两档，避免浏览器合成中间字重。 */
  mathBold: boolean;
  /** 公式相对正文的字号百分比；121 为 KaTeX 默认值。 */
  mathScale: number;
  colors: Record<AppearanceMode, AppearanceColors>;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  version: 1,
  backgroundImage: "",
  backgroundFit: "cover",
  overlay: 30,
  blur: 0,
  panelOpacity: 100,
  sidebarOpacity: 100,
  fontFamily: "",
  codeFontFamily: "",
  mathBold: false,
  mathScale: DEFAULT_MATH_SCALE,
  colors: { light: {}, dark: {} },
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bounded(value: unknown, fallback: number, max = 100): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.round(value)))
    : fallback;
}

/** 字体名称列表只允许文字、数字、空白、逗号、引号、点、下划线和连字符，避免拼接任意 CSS。 */
function normalizeAppearanceFontFamily(value: unknown): string {
  const font = typeof value === "string" ? value.trim() : "";
  return font.length <= 160 && /^[\p{L}\p{N}\s,"'._-]*$/u.test(font) ? font : "";
}

export function normalizeAppearanceColors(value: unknown): AppearanceColors {
  const source = record(value);
  const result: AppearanceColors = {};
  for (const key of Object.keys(APPEARANCE_COLOR_TOKENS) as AppearanceColor[]) {
    const color = source[key];
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
      result[key] = color.toLowerCase();
  }
  return result;
}

export function normalizeAppearanceSettings(value: unknown): AppearanceSettings {
  const input = record(value);
  const source = input.version === 1 ? input : {};
  const image = source.backgroundImage;
  const colors = record(source.colors);
  return {
    version: 1,
    // 限制为受控的本地图像数据，不接受任意 URL、SVG 或 CSS 文本。
    backgroundImage:
      typeof image === "string" &&
      image.length <= Math.ceil(MAX_BACKGROUND_BYTES / 3) * 4 + 64 &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
        ? image
        : "",
    backgroundFit: source.backgroundFit === "contain" ? "contain" : "cover",
    overlay: bounded(source.overlay, 30),
    blur: bounded(source.blur, 0, 30),
    panelOpacity: bounded(source.panelOpacity, 100),
    sidebarOpacity: bounded(source.sidebarOpacity, 100),
    fontFamily: normalizeAppearanceFontFamily(source.fontFamily),
    codeFontFamily: normalizeAppearanceFontFamily(source.codeFontFamily),
    mathBold: source.mathBold === true,
    mathScale: Math.max(
      MIN_MATH_SCALE,
      bounded(source.mathScale, DEFAULT_MATH_SCALE, MAX_MATH_SCALE),
    ),
    colors: {
      light: normalizeAppearanceColors(colors.light),
      dark: normalizeAppearanceColors(colors.dark),
    },
  };
}

export function isAppearanceSettings(value: unknown): value is AppearanceSettings {
  const input = record(value);
  return (
    input.version === 1 &&
    JSON.stringify(normalizeAppearanceSettings(input)) === JSON.stringify(input)
  );
}
