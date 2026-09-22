import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30000 });
const timer = setTimeout(() => {
  void browser.close();
}, 150000);
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const origin = process.env.APPEARANCE_TEST_URL || "http://127.0.0.1:5199";
  await page.goto(origin, { timeout: 60000 });
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  // 在测试页模拟剪贴板，不覆盖用户实际剪贴板内容。
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          document.documentElement.dataset.copiedCode = value;
        },
      },
    }),
  );
  const editor = page.getByRole("textbox", { name: "外观配置代码（JSON）" });
  const exportButton = page.getByRole("button", { name: "导出并复制", exact: true });
  const applyButton = page.getByRole("button", { name: "立即应用", exact: true });
  const panel = page.getByRole("slider", { name: "主面板不透明度" });
  const sliderValue = (name) =>
    page.evaluate((label) => document.querySelector(`input[aria-label="${label}"]`).value, name);
  const waitSlider = (name, value) =>
    page.waitForFunction(
      ([label, expected]) =>
        document.querySelector(`input[aria-label="${label}"]`)?.value === expected,
      [name, value],
    );
  const hasBackground = async () =>
    (await page.locator("html").getAttribute("data-appearance-background")) === "true";

  // 1. 打开即显示当前配置，不含背景图片。
  const initial = JSON.parse(await editor.inputValue());
  assert.equal(initial.version, 1);
  assert.equal("backgroundImage" in initial, false);

  // 2. 先通过图片按钮设置背景，之后的代码编辑都不能把它清掉。
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    canvas.getContext("2d").fillRect(0, 0, 8, 8);
    return canvas.toDataURL();
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "bg.png",
    mimeType: "image/png",
    buffer: Buffer.from(png.split(",")[1], "base64"),
  });
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-appearance-background"),
  );
  await page.waitForFunction(
    () => !document.querySelector("textarea")?.value.includes("backgroundImage"),
  );

  // 3. 在显示的配置里直接改一项，停止输入后自动应用。
  const shown = await editor.inputValue();
  assert.match(shown, /"blur": 0/);
  await editor.fill(shown.replace('"blur": 0', '"blur": 5'));
  await waitSlider("背景模糊", "5");
  await page.getByText("已应用并保存。").waitFor();
  assert.equal(await hasBackground(), true, "编辑其他字段不清除背景");

  // 4. 只粘贴片段：未写出的字段保持不变。
  await editor.fill('{"panelOpacity": 62, "colors": {"dark": {"foreground": "#ccddff"}}}');
  await waitSlider("主面板不透明度", "62");
  assert.equal(await sliderValue("背景模糊"), "5");
  assert.equal(await hasBackground(), true);
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue("--color-foreground") === "#ccddff",
  );

  // 5. 编辑中，其他窗口的修改不覆盖草稿；失焦后显示最新配置。
  const second = await context.newPage();
  await second.goto(origin);
  await second.getByRole("heading", { name: "自定义外观" }).waitFor();
  await editor.focus();
  const draft = await editor.inputValue();
  await second.getByRole("slider", { name: "侧栏不透明度" }).fill("55");
  await waitSlider("侧栏不透明度", "55");
  assert.equal(await editor.inputValue(), draft, "编辑中草稿不被覆盖");
  await editor.press("Tab");
  await page.waitForFunction(() =>
    document.querySelector("textarea").value.includes('"sidebarOpacity": 55'),
  );
  const merged = JSON.parse(await editor.inputValue());
  assert.equal(merged.panelOpacity, 62);
  assert.equal(merged.blur, 5);
  await second.close();

  // 6. 空字符串删除颜色覆盖。
  await editor.fill('{"colors": {"dark": {"foreground": ""}}}');
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue("--color-foreground") === "",
  );

  // 7. 错误输入只提示，不改变配置；失焦后保留草稿供修改。
  for (const input of [
    "{",
    '{"version":9}',
    '{"panelOpacity":200}',
    '{"colors":{"drak":{}}}',
    '{"backgroundImage":"data:image/png;base64,YWJj"}',
  ]) {
    await editor.fill(input);
    await page.getByText(/配置无效（/).waitFor();
    assert.equal(await sliderValue("主面板不透明度"), "62");
    assert.equal(await hasBackground(), true);
  }
  await editor.press("Tab");
  assert.equal(await editor.inputValue(), '{"backgroundImage":"data:image/png;base64,YWJj"}');

  // 8. 立即应用按钮；导出复制含背景的完整配置，代码框不变。
  await editor.fill('{"overlay": 40}');
  await applyButton.click();
  await waitSlider("背景遮罩", "40");
  await editor.press("Tab");
  const before = await editor.inputValue();
  await exportButton.click();
  await page.getByText("已复制完整配置（含背景图片）到剪贴板。").waitFor();
  const copied = JSON.parse(await page.locator("html").getAttribute("data-copied-code"));
  assert.equal(copied.backgroundImage.startsWith("data:image/png;base64,"), true);
  assert.equal(await editor.inputValue(), before);

  // 9. 剪贴板被拒绝时，完整配置放入代码框供手动复制。
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await exportButton.click();
  await page.getByText("无法访问剪贴板，完整配置已放入代码框，请手动复制。").waitFor();
  assert.equal(JSON.parse(await editor.inputValue()).backgroundImage, copied.backgroundImage);

  // 10. 图片解码期间用其他控件修改，旧导入不得覆盖较新状态。
  await page.evaluate(() => {
    const originalDecode = Image.prototype.decode;
    Image.prototype.decode = function () {
      return new Promise((resolve) => {
        window.finishAppearanceDecode = () => {
          Image.prototype.decode = originalDecode;
          resolve();
        };
      });
    };
  });
  const png2 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    return canvas.toDataURL();
  });
  await editor.fill(JSON.stringify({ panelOpacity: 18, backgroundImage: png2 }));
  await page.waitForFunction(() => typeof window.finishAppearanceDecode === "function");
  await panel.fill("80");
  await page.evaluate(async () => {
    window.finishAppearanceDecode();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.equal(await sliderValue("主面板不透明度"), "80");

  // 11. 存储失败：提示错误，配置不变。
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "zcode-appearance-v1") throw new Error("quota");
      return originalSet.call(this, key, value);
    };
  });
  await editor.fill('{"panelOpacity": 30}');
  await page.getByRole("alert").waitFor();
  assert.equal(await sliderValue("主面板不透明度"), "80");

  // 12. 刷新后保持已应用的结果与背景；窄屏无横向溢出。
  await page.reload();
  await editor.waitFor();
  const reloaded = JSON.parse(await editor.inputValue());
  assert.equal(reloaded.panelOpacity, 80);
  assert.equal(reloaded.blur, 5);
  assert.equal(reloaded.sidebarOpacity, 55);
  assert.equal(await hasBackground(), true);
  await editor.scrollIntoViewIfNeeded();
  await mkdir(".run-logs/appearance", { recursive: true });
  await page.screenshot({ path: ".run-logs/appearance/transfer-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: ".run-logs/appearance/transfer-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 显示当前配置、单项实时应用、片段合并、保留背景、编辑中不被覆盖、删除颜色覆盖、错误提示、立即应用、导出含背景、剪贴板拒绝、过期解码失效、保存失败、刷新保持、窄屏。",
  );
} finally {
  clearTimeout(timer);
  await browser.close();
}
