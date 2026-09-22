import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAppearancePatch,
  serializeAppearanceCode,
  serializeAppearanceEditorCode,
} from "../src/lib/appearanceTransfer.js";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  normalizeAppearanceSettings,
} from "../src/lib/appearanceSettings.js";

// 以默认配置为底合并，等价于在全新安装上导入完整配置。
const parseAppearanceCode = (code: string) =>
  parseAppearancePatch(code, DEFAULT_APPEARANCE_SETTINGS);

test("配置导出往返、字段顺序、部分字段及中文字体", () => {
  const value = normalizeAppearanceSettings({
    version: 1,
    panelOpacity: 42,
    fontFamily: "微软雅黑, Segoe UI",
    colors: { dark: { foreground: "#abcdef" } },
  });
  assert.deepEqual(parseAppearanceCode(serializeAppearanceCode(value)), value);
  assert.deepEqual(
    parseAppearanceCode(
      '{"colors":{"dark":{"foreground":"#ABCDEF"}},"panelOpacity":42,"fontFamily":"微软雅黑, Segoe UI","version":1}',
    ),
    value,
  );
  assert.deepEqual(parseAppearanceCode('{"version":1}'), DEFAULT_APPEARANCE_SETTINGS);
});
test("拒绝语法、版本、未知字段和有损归一化，避免导入看似成功却丢失配置", () => {
  for (const invalid of [
    "{",
    "null",
    "[]",
    '{"version":2}',
    '{"version":1,"opcity":50}',
    '{"version":1,"colors":{"drak":{}}}',
    '{"version":1,"colors":{"dark":{"foreground":"red"}}}',
    '{"version":1,"panelOpacity":101}',
    '{"version":1,"blur":1.2}',
    '{"version":1,"fontFamily":"bad;css"}',
    '{"version":1,"backgroundImage":"https://example.com/image.png"}',
    '{"version":1,"colors":[]}',
  ]) {
    assert.throws(() => parseAppearanceCode(invalid), undefined, invalid);
  }
  assert.throws(() => parseAppearanceCode(" ".repeat(3 * 1024 * 1024 + 1)));
});

test("扩展字段：旧配置保持默认，新颜色键与代码字体可往返，非法值被拒绝", () => {
  const legacy = parseAppearanceCode('{"version":1,"fontFamily":"Microsoft YaHei"}');
  assert.equal(legacy.codeFontFamily, "");
  assert.deepEqual(legacy.colors, { light: {}, dark: {} });
  const value = parseAppearanceCode(
    JSON.stringify({
      version: 1,
      codeFontFamily: '"JetBrains Mono", Consolas',
      colors: {
        dark: {
          link: "#7aa2f7",
          inlineCode: "#24283b",
          primary: "#7aa2f7",
          primaryText: "#16161e",
        },
      },
    }),
  );
  assert.equal(value.codeFontFamily, '"JetBrains Mono", Consolas');
  assert.deepEqual(parseAppearanceCode(serializeAppearanceCode(value)), value);
  for (const invalid of [
    '{"version":1,"codeFontFamily":"bad;css"}',
    '{"version":1,"codeFontFamily":1}',
    '{"version":1,"colors":{"dark":{"link":"blue"}}}',
    '{"version":1,"colors":{"dark":{"linkColor":"#ffffff"}}}',
  ]) {
    assert.throws(() => parseAppearanceCode(invalid), undefined, invalid);
  }
});

test("公式样式字段：合法值往返，越界、错误类型与未知颜色键被拒绝", () => {
  const value = parseAppearanceCode(
    '{"version":1,"mathBold":true,"mathScale":110,"colors":{"light":{"math":"#2E3440"}}}',
  );
  assert.equal(value.mathBold, true);
  assert.equal(value.mathScale, 110);
  assert.equal(value.colors.light.math, "#2e3440");
  assert.deepEqual(parseAppearanceCode(serializeAppearanceCode(value)), value);
  for (const invalid of [
    '{"version":1,"mathBold":"true"}',
    '{"version":1,"mathScale":79}',
    '{"version":1,"mathScale":161}',
    '{"version":1,"mathScale":1.5}',
    '{"version":1,"colors":{"dark":{"formula":"#ffffff"}}}',
  ]) {
    assert.throws(() => parseAppearanceCode(invalid), undefined, invalid);
  }
});

test("合并语义：只改写出的字段，保留背景图片与其他颜色，空字符串删除颜色覆盖", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const base = normalizeAppearanceSettings({
    version: 1,
    backgroundImage: png,
    panelOpacity: 70,
    fontFamily: "Microsoft YaHei",
    colors: {
      light: { foreground: "#111111", link: "#2233aa" },
      dark: { foreground: "#eeeeee" },
    },
  });
  const next = parseAppearancePatch(
    '{"mathScale":110,"colors":{"light":{"link":"","math":"#aa2233"}}}',
    base,
  );
  assert.equal(next.backgroundImage, png, "未写出背景时保留");
  assert.equal(next.panelOpacity, 70);
  assert.equal(next.fontFamily, "Microsoft YaHei");
  assert.equal(next.mathScale, 110);
  assert.deepEqual(next.colors, {
    light: { foreground: "#111111", math: "#aa2233" },
    dark: { foreground: "#eeeeee" },
  });
  assert.deepEqual(parseAppearancePatch("{}", base), base, "空对象不改变任何配置");
  assert.equal(parseAppearancePatch('{"backgroundImage":""}', base).backgroundImage, "");
  assert.throws(() => parseAppearancePatch('{"version":2}', base));
  assert.throws(() => parseAppearancePatch('{"colors":{"dark":{"foreground":null}}}', base));
});

test("代码框视图不含背景图片，且编辑视图可原样应用而不改变配置", () => {
  const base = normalizeAppearanceSettings({
    version: 1,
    backgroundImage: "data:image/png;base64,iVBORw0KGgo=",
    blur: 6,
    colors: { dark: { math: "#bb9af7" } },
  });
  const view = serializeAppearanceEditorCode(base);
  assert.equal("backgroundImage" in JSON.parse(view), false);
  assert.deepEqual(parseAppearancePatch(view, base), base);
  assert.equal(JSON.parse(serializeAppearanceCode(base)).backgroundImage, base.backgroundImage);
});
