import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  normalizeAppearanceSettings,
} from "../src/lib/appearanceSettings.js";
import { BUILTIN_APPEARANCE_PALETTES } from "../src/lib/appearancePalettes.js";
import {
  MAX_APPEARANCE_THEMES,
  applyAppearancePalette,
  applyAppearanceTheme,
  createAppearanceTheme,
  duplicateThemeName,
  isAppearanceThemeList,
  loadAppearanceThemes,
  normalizeAppearanceThemes,
  persistAppearanceThemes,
} from "../src/lib/appearanceThemes.js";

const png = "data:image/png;base64,iVBORw0KGgo=";

test("方案不保存背景；应用方案保留当前背景，替换其余字段", () => {
  const current = normalizeAppearanceSettings({
    version: 1,
    backgroundImage: png,
    panelOpacity: 70,
    colors: { dark: { foreground: "#eeeeee" } },
  });
  const theme = createAppearanceTheme("a1", "夜读", current);
  assert.equal(theme.settings.backgroundImage, "");
  assert.equal(theme.settings.panelOpacity, 70);
  const other = normalizeAppearanceSettings({ version: 1, backgroundImage: png, blur: 9 });
  const applied = applyAppearanceTheme(theme, other);
  assert.equal(applied.backgroundImage, png);
  assert.equal(applied.panelOpacity, 70);
  assert.equal(applied.blur, 0, "方案中的字段整体替换当前值");
  assert.deepEqual(applied.colors, { light: {}, dark: { foreground: "#eeeeee" } });
});

test("内置配色只替换颜色，且全部为合法配置", () => {
  assert.equal(BUILTIN_APPEARANCE_PALETTES.length, 7);
  const current = normalizeAppearanceSettings({
    version: 1,
    backgroundImage: png,
    fontFamily: "Georgia",
    chatFontSize: 20,
  });
  for (const palette of BUILTIN_APPEARANCE_PALETTES) {
    const next = applyAppearancePalette(palette, current);
    assert.deepEqual(next.colors, palette.colors, palette.id);
    assert.equal(next.backgroundImage, png);
    assert.equal(next.fontFamily, "Georgia");
    assert.equal(next.chatFontSize, 20);
  }
});

test("列表校验：丢弃非法项、重复 id、超限条目与未知版本，并剔除背景", () => {
  const settings = { ...DEFAULT_APPEARANCE_SETTINGS, backgroundImage: png };
  const list = normalizeAppearanceThemes([
    { id: "ok", name: "  正常  ", settings },
    { id: "ok", name: "重复", settings },
    { id: "bad id!", name: "非法 id", settings },
    { id: "empty", name: "   ", settings },
    { id: "long", name: "x".repeat(41), settings },
    { id: "future", name: "未来版本", settings: { version: 2 } },
    null,
    "text",
  ]);
  assert.deepEqual(
    list.map((item) => [item.id, item.name, item.settings.backgroundImage]),
    [["ok", "正常", ""]],
  );
  const many = Array.from({ length: MAX_APPEARANCE_THEMES + 5 }, (_, i) =>
    createAppearanceTheme(`t${i}`, `方案 ${i}`, DEFAULT_APPEARANCE_SETTINGS),
  );
  assert.equal(normalizeAppearanceThemes(many).length, MAX_APPEARANCE_THEMES);
  assert.equal(isAppearanceThemeList(list), true);
  assert.equal(isAppearanceThemeList([{ id: "ok", name: " 未规范 ", settings }]), false);
  assert.equal(isAppearanceThemeList("[]"), false);
});

test("持久化：损坏或未知版本回退为空，写入失败返回 false", () => {
  assert.deepEqual(loadAppearanceThemes({ getItem: () => "{" }), []);
  assert.deepEqual(loadAppearanceThemes({ getItem: () => '{"version":2,"themes":[]}' }), []);
  let saved = "";
  const theme = createAppearanceTheme("x", "方案", DEFAULT_APPEARANCE_SETTINGS);
  assert.equal(
    persistAppearanceThemes([theme], {
      setItem: (_key, value) => {
        saved = value;
      },
    }),
    true,
  );
  assert.deepEqual(loadAppearanceThemes({ getItem: () => saved }), [theme]);
  assert.equal(
    persistAppearanceThemes([theme], {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    }),
    false,
  );
});

test("复制名称不重复且不超过长度上限", () => {
  assert.equal(duplicateThemeName("夜读", ["夜读"], "副本"), "夜读 副本");
  assert.equal(duplicateThemeName("夜读", ["夜读", "夜读 副本"], "副本"), "夜读 副本 2");
  const long = "长".repeat(40);
  const copy = duplicateThemeName(long, [long], "副本");
  assert.ok(copy.length <= 40 && copy.endsWith("副本"));
});
