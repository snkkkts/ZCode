import {
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_COLOR_TOKENS,
  DEFAULT_MATH_SCALE,
  normalizeAppearanceSettings,
  type AppearanceSettings,
  type AppearanceMode,
} from "./appearanceSettings.js";
import {
  getSafeLocalStorage,
  readSafeLocalStorage,
  type BrowserReadableStorageLike,
  type BrowserStorageLike,
} from "./browserEnvironment.js";

export function loadAppearanceSettings(storage?: BrowserReadableStorageLike): AppearanceSettings {
  try {
    const raw = storage
      ? storage.getItem(APPEARANCE_STORAGE_KEY)
      : readSafeLocalStorage(APPEARANCE_STORAGE_KEY);
    return normalizeAppearanceSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeAppearanceSettings(null);
  }
}

export function persistAppearanceSettings(
  settings: AppearanceSettings,
  storage: BrowserStorageLike | null = getSafeLocalStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

interface AppearanceRoot {
  style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

const EXTRA_TOKENS = [
  "--font-sans",
  "--font-mono",
  "--appearance-math-weight",
  "--appearance-math-size",
  "--default-font-family",
  "--color-header",
  "--appearance-image",
  "--appearance-fit",
  "--appearance-blur",
  "--appearance-overlay",
  "--appearance-base",
  "--color-terminal-bg",
  "--color-terminal-fg",
];

export function applyAppearanceSettings(
  settings: AppearanceSettings,
  mode: AppearanceMode,
  root: AppearanceRoot | undefined = typeof document === "undefined"
    ? undefined
    : document.documentElement,
  computed: (root: AppearanceRoot) => Pick<CSSStyleDeclaration, "getPropertyValue"> = (element) =>
    getComputedStyle(element as HTMLElement),
): void {
  if (!root) return;
  // 每次先移除投影，避免多次调整将透明度叠乘，并让主题切换重新读取原始变量。
  for (const token of [...Object.values(APPEARANCE_COLOR_TOKENS), ...EXTRA_TOKENS])
    root.style.removeProperty(token);
  const base = computed(root);
  const original = new Map(
    [
      "--color-background",
      "--color-panel",
      "--color-sidebar",
      "--color-header",
      "--color-terminal-bg",
      "--color-terminal-fg",
      "--font-mono",
    ].map((token) => [token, base.getPropertyValue(token).trim()]),
  );
  for (const [key, token] of Object.entries(APPEARANCE_COLOR_TOKENS)) {
    const color = settings.colors[mode][key as keyof typeof APPEARANCE_COLOR_TOKENS];
    if (color) root.style.setProperty(token, color);
  }
  root.style.setProperty(
    "--appearance-base",
    settings.colors[mode].background || original.get("--color-background") || "#161616",
  );
  for (const [key, opacity] of [
    ["background", settings.panelOpacity],
    ["panel", settings.panelOpacity],
    ["sidebar", settings.sidebarOpacity],
  ] as const) {
    if (opacity === 100) continue;
    const token = APPEARANCE_COLOR_TOKENS[key];
    const color = settings.colors[mode][key] || original.get(token);
    if (color)
      root.style.setProperty(token, `color-mix(in srgb, ${color} ${opacity}%, transparent)`);
  }
  if (settings.panelOpacity !== 100 && original.get("--color-header")) {
    root.style.setProperty(
      "--color-header",
      `color-mix(in srgb, ${original.get("--color-header")} ${settings.panelOpacity}%, transparent)`,
    );
  }
  // 终端背景和前景可能引用全局变量；保留原有终端配色，避免此阶段意外改变终端可读性。
  for (const token of ["--color-terminal-bg", "--color-terminal-fg"]) {
    const value = original.get(token);
    if (value) root.style.setProperty(token, value);
  }
  if (settings.fontFamily) {
    root.style.setProperty("--font-sans", `${settings.fontFamily}, system-ui, sans-serif`);
    root.style.setProperty("--default-font-family", "var(--font-sans)");
  }
  // 用户代码字体放在主题原字体栈之前，保留原栈中的中文回退；先移除再读取，重复投影不会叠加。
  if (settings.codeFontFamily) {
    const fallback = original.get("--font-mono")?.replace(/\s+/g, " ") || "monospace";
    root.style.setProperty("--font-mono", `${settings.codeFontFamily}, ${fallback}`);
  }
  // 公式字重与字号只在偏离默认时投影；未设置时 appearance.css 回退到 KaTeX 默认值。
  if (settings.mathBold) root.style.setProperty("--appearance-math-weight", "700");
  if (settings.mathScale !== DEFAULT_MATH_SCALE)
    root.style.setProperty("--appearance-math-size", `${settings.mathScale / 100}em`);
  if (settings.backgroundImage) {
    root.setAttribute("data-appearance-background", "true");
    root.style.setProperty("--appearance-image", `url("${settings.backgroundImage}")`);
    root.style.setProperty("--appearance-fit", settings.backgroundFit);
    root.style.setProperty("--appearance-blur", `${settings.blur}px`);
    root.style.setProperty("--appearance-overlay", String(settings.overlay / 100));
  } else {
    root.removeAttribute("data-appearance-background");
  }
}
