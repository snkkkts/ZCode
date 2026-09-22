import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  normalizeAppearanceSettings,
} from "../src/lib/appearanceSettings.js";
import { applyAppearanceSettings } from "../src/lib/appearanceEnvironment.js";
import { parseAppearancePatch, serializeAppearanceCode } from "../src/lib/appearanceTransfer.js";

test("旧配置继承原正文，独立排版字段有界且可合并往返", () => {
  const legacy = normalizeAppearanceSettings({ version: 1 });
  assert.equal(legacy.chatFontFamily, "");
  assert.equal(legacy.chatFontSize, 0);
  assert.equal(legacy.chatLineHeight, 0);
  const config = parseAppearancePatch(
    '{"chatFontFamily":"宋体, Georgia","chatFontSize":24,"chatLineHeight":190}',
    legacy,
  );
  assert.equal(config.chatFontFamily, "宋体, Georgia");
  assert.equal(config.fontFamily, "");
  assert.deepEqual(parseAppearancePatch(serializeAppearanceCode(config), legacy), config);
  assert.equal(parseAppearancePatch('{"chatFontSize":0}', config).chatFontSize, 0);
  assert.equal(parseAppearancePatch('{"blur":4}', config).chatFontSize, 24);
  for (const code of [
    '{"chatFontSize":11}',
    '{"chatFontSize":29}',
    '{"chatFontSize":18.5}',
    '{"chatLineHeight":99}',
    '{"chatLineHeight":241}',
    '{"chatLineHeight":"180"}',
    '{"chatFontFamily":"bad;css"}',
  ]) {
    assert.throws(() => parseAppearancePatch(code, config));
  }
  const invalid = normalizeAppearanceSettings({
    version: 1,
    chatFontSize: Infinity,
    chatLineHeight: NaN,
  });
  assert.equal(invalid.chatFontSize, 0);
  assert.equal(invalid.chatLineHeight, 0);
});

test("正文投影不改全局字号，重置移除所有正文覆盖", () => {
  const values = new Map<string, string>();
  const attributes = new Map<string, string>();
  const root = {
    style: {
      setProperty: (k: string, v: string) => {
        values.set(k, v);
      },
      removeProperty: (k: string) => {
        values.delete(k);
      },
    },
    setAttribute: (k: string, v: string) => {
      attributes.set(k, v);
    },
    removeAttribute: (k: string) => {
      attributes.delete(k);
    },
  };
  const computed = () => ({ getPropertyValue: () => "#202020" });
  applyAppearanceSettings(
    normalizeAppearanceSettings({
      version: 1,
      chatFontFamily: "Georgia",
      chatFontSize: 22,
      chatLineHeight: 180,
    }),
    "dark",
    root,
    computed,
  );
  assert.equal(values.get("--appearance-chat-size"), "22px");
  assert.equal(values.get("--appearance-chat-leading"), "1.8");
  assert.match(values.get("--appearance-chat-font")!, /^Georgia,/);
  assert.equal(values.has("--ui-font-size"), false);
  assert.equal(attributes.get("data-appearance-chat-size"), "true");
  applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, "light", root, computed);
  for (const key of ["font", "size", "leading"]) {
    assert.equal(values.has(`--appearance-chat-${key}`), false);
    assert.equal(attributes.has(`data-appearance-chat-${key}`), false);
  }
});
