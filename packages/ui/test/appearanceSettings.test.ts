import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
} from "../src/lib/appearanceSettings.js";
import {
  loadAppearanceSettings,
  persistAppearanceSettings,
  applyAppearanceSettings,
} from "../src/lib/appearanceEnvironment.js";

test("损坏或未来版本配置回退；颜色与数值严格校验", () => {
  assert.deepEqual(normalizeAppearanceSettings(null), DEFAULT_APPEARANCE_SETTINGS);
  assert.deepEqual(
    normalizeAppearanceSettings({ version: 2, fontFamily: "Other" }),
    DEFAULT_APPEARANCE_SETTINGS,
  );
  const actual = normalizeAppearanceSettings({
    version: 1,
    panelOpacity: -20,
    sidebarOpacity: Infinity,
    blur: 999,
    fontFamily: "bad; color:red",
    colors: { dark: { foreground: "#AABBCC", brand: "url(https://example.com)" } },
    backgroundImage: "https://example.com/a.png",
  });
  assert.equal(actual.panelOpacity, 0);
  assert.equal(actual.sidebarOpacity, 100);
  assert.equal(actual.blur, 30);
  assert.equal(actual.fontFamily, "");
  assert.equal(actual.colors.dark.foreground, "#aabbcc");
  assert.equal(actual.colors.dark.brand, undefined);
  assert.equal(actual.backgroundImage, "");
});

test("损坏存储与存储不可写不会伪造保存成功", () => {
  assert.deepEqual(loadAppearanceSettings({ getItem: () => "{" }), DEFAULT_APPEARANCE_SETTINGS);
  assert.equal(
    persistAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    }),
    false,
  );
  let saved = "";
  assert.equal(
    persistAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, {
      setItem: (_key, value) => {
        saved = value;
      },
    }),
    true,
  );
  assert.equal(JSON.parse(saved).version, 1);
});

test("浅深色独立，重置移除所有内联覆盖，透明度不影响容器文字", () => {
  const values = new Map<string, string>();
  const root = {
    style: {
      setProperty: (k: string, v: string) => {
        values.set(k, v);
      },
      removeProperty: (k: string) => {
        values.delete(k);
      },
    },
    setAttribute() {},
    removeAttribute() {},
  };
  const config = normalizeAppearanceSettings({
    version: 1,
    fontFamily: "Microsoft YaHei",
    panelOpacity: 65,
    colors: { light: { foreground: "#112233" }, dark: { foreground: "#eeeeee" } },
  });
  const computed = () => ({ getPropertyValue: () => "#202020" });
  applyAppearanceSettings(config, "dark", root, computed);
  assert.equal(values.get("--color-foreground"), "#eeeeee");
  assert.match(values.get("--color-panel")!, /65%/);
  assert.equal(values.has("opacity"), false);
  applyAppearanceSettings(config, "light", root, computed);
  assert.equal(values.get("--color-foreground"), "#112233");
  applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, "light", root, computed);
  assert.equal(values.has("--font-sans"), false);
  assert.equal(values.has("--color-foreground"), false);
  assert.equal(values.has("--color-panel"), false);
});

test("扩展颜色与代码字体：覆盖已有语义变量，保留原等宽栈且重复投影不叠加", () => {
  const values = new Map<string, string>();
  const root = {
    style: {
      setProperty: (k: string, v: string) => {
        values.set(k, v);
      },
      removeProperty: (k: string) => {
        values.delete(k);
      },
    },
    setAttribute() {},
    removeAttribute() {},
  };
  const theme: Record<string, string> = {
    "--font-mono": 'Consolas, "Microsoft YaHei", monospace',
  };
  // 模拟浏览器：内联值优先，缺省时读取主题原值。
  const computed = () => ({ getPropertyValue: (k: string) => values.get(k) ?? theme[k] ?? "" });
  const config = normalizeAppearanceSettings({
    version: 1,
    codeFontFamily: "JetBrains Mono",
    colors: {
      dark: { link: "#7AA2F7", inlineCode: "#24283b", primary: "#7aa2f7", primaryText: "#16161e" },
      light: { link: "#2e7de9" },
    },
  });
  assert.equal(config.colors.dark.link, "#7aa2f7");
  applyAppearanceSettings(config, "dark", root, computed);
  applyAppearanceSettings(config, "dark", root, computed);
  assert.equal(values.get("--font-mono"), 'JetBrains Mono, Consolas, "Microsoft YaHei", monospace');
  assert.equal(values.get("--color-icon-blue"), "#7aa2f7");
  assert.equal(values.get("--color-markdown-inline-code"), "#24283b");
  assert.equal(values.get("--color-primary"), "#7aa2f7");
  assert.equal(values.get("--color-primary-foreground"), "#16161e");
  applyAppearanceSettings(config, "light", root, computed);
  assert.equal(values.get("--color-icon-blue"), "#2e7de9");
  assert.equal(values.has("--color-primary"), false);
  applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, "light", root, computed);
  assert.equal(values.has("--font-mono"), false);
  assert.equal(values.has("--color-icon-blue"), false);
  assert.equal(
    normalizeAppearanceSettings({ version: 1, codeFontFamily: "a;b" }).codeFontFamily,
    "",
  );
});

test("公式样式：颜色、加粗与字号只在设置时投影，默认值与 KaTeX 一致", () => {
  const values = new Map<string, string>();
  const root = {
    style: {
      setProperty: (k: string, v: string) => {
        values.set(k, v);
      },
      removeProperty: (k: string) => {
        values.delete(k);
      },
    },
    setAttribute() {},
    removeAttribute() {},
  };
  const computed = () => ({ getPropertyValue: () => "" });
  assert.equal(DEFAULT_APPEARANCE_SETTINGS.mathBold, false);
  assert.equal(DEFAULT_APPEARANCE_SETTINGS.mathScale, 121);
  applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, "dark", root, computed);
  assert.equal(values.has("--appearance-math-weight"), false);
  assert.equal(values.has("--appearance-math-size"), false);
  const config = normalizeAppearanceSettings({
    version: 1,
    mathBold: true,
    mathScale: 100,
    colors: { dark: { math: "#C0392B" } },
  });
  applyAppearanceSettings(config, "dark", root, computed);
  assert.equal(values.get("--appearance-math-color"), "#c0392b");
  assert.equal(values.get("--appearance-math-weight"), "700");
  assert.equal(values.get("--appearance-math-size"), "1em");
  applyAppearanceSettings(config, "light", root, computed);
  assert.equal(values.has("--appearance-math-color"), false, "浅色未配置公式颜色时继承正文");
  applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, "light", root, computed);
  assert.equal(values.has("--appearance-math-weight"), false);
  assert.equal(values.has("--appearance-math-size"), false);
  // 越界与错误类型回退到边界或默认值。
  assert.equal(normalizeAppearanceSettings({ version: 1, mathScale: 20 }).mathScale, 80);
  assert.equal(normalizeAppearanceSettings({ version: 1, mathScale: 999 }).mathScale, 160);
  assert.equal(normalizeAppearanceSettings({ version: 1, mathBold: "yes" }).mathBold, false);
});
