import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

// 主题方案：内置配色、保存/应用/重命名/复制/覆盖/删除、跨窗口同步、刷新、存储失败、窄屏。
const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30000 });
const timer = setTimeout(() => {
  void browser.close();
}, 150000);
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const origin = process.env.APPEARANCE_TEST_URL || "http://127.0.0.1:5199";
  await page.goto(origin, { timeout: 60000 });
  await page.getByRole("heading", { name: "主题方案" }).waitFor();
  await page.getByRole("button", { name: "切换深色", exact: true }).click();
  const cssVar = (name) =>
    page.evaluate((token) => document.documentElement.style.getPropertyValue(token), name);
  const panel = page.getByRole("slider", { name: "主面板不透明度" });
  const hasBackground = async () =>
    (await page.locator("html").getAttribute("data-appearance-background")) === "true";
  const themeNames = (target) =>
    target
      .getByRole("list", { name: "我的方案" })
      .getByRole("textbox")
      .evaluateAll((inputs) => inputs.map((input) => input.value))
      .catch(() => []);

  // 1. 先设置背景图片，后续所有方案操作都不能清掉它。
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    return canvas.toDataURL().split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "bg.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-appearance-background"),
  );
  await page.getByPlaceholder("Microsoft YaHei, Segoe UI").fill("Georgia");
  await page.getByPlaceholder("Microsoft YaHei, Segoe UI").press("Enter");

  // 2. 内置配色只换颜色。
  await page.getByRole("button", { name: "套用内置配色 深海 · Nord" }).click();
  await page.getByText("已应用“深海 · Nord”。").waitFor();
  assert.equal(await cssVar("--color-sidebar"), "#242933");
  assert.equal(await hasBackground(), true);
  assert.match(await cssVar("--font-sans"), /^Georgia/);

  // 3. 保存方案；另一窗口收到列表且不回播。
  const second = await context.newPage();
  await second.goto(origin);
  await second.getByRole("heading", { name: "主题方案" }).waitFor();
  await panel.fill("70");
  await page.getByRole("textbox", { name: "新方案名称" }).fill("夜读");
  await page.getByRole("button", { name: "保存当前为新方案" }).click();
  await page.getByText("已保存方案“夜读”。").waitFor();
  assert.deepEqual(await themeNames(page), ["夜读"]);
  await second.getByRole("textbox", { name: "重命名方案 夜读" }).waitFor();
  assert.equal(
    await second.locator("html").getAttribute("data-broadcast-count"),
    null,
    "接收方案列表的窗口不应再次广播",
  );

  // 4. 改动外观后应用方案可恢复，背景保留。
  await panel.fill("40");
  await page.getByRole("button", { name: "套用内置配色 抹茶 · Everforest" }).click();
  assert.equal(await cssVar("--color-sidebar"), "#1e2326");
  await page.getByRole("button", { name: "应用方案 夜读" }).click();
  assert.equal(await panel.inputValue(), "70");
  assert.equal(await cssVar("--color-sidebar"), "#242933");
  assert.equal(await hasBackground(), true);

  // 5. 重命名、复制。
  const rename = page.getByRole("textbox", { name: "重命名方案 夜读" });
  await rename.fill("夜读 2");
  await rename.press("Enter");
  await page.getByText("已重命名为“夜读 2”。").waitFor();
  await page.getByRole("button", { name: "复制方案 夜读 2" }).click();
  assert.deepEqual(await themeNames(page), ["夜读 2", "夜读 2 副本"]);

  // 6. 用当前外观覆盖副本，再应用验证。
  await panel.fill("55");
  await page.getByRole("button", { name: "用当前外观覆盖方案 夜读 2 副本" }).click();
  await panel.fill("20");
  await page.getByRole("button", { name: "应用方案 夜读 2 副本" }).click();
  assert.equal(await panel.inputValue(), "55");
  await page.getByRole("button", { name: "应用方案 夜读 2", exact: true }).click();
  assert.equal(await panel.inputValue(), "70");

  // 7. 删除需要二次确认。
  await page.getByRole("button", { name: "删除方案 夜读 2 副本" }).click();
  assert.equal((await themeNames(page)).length, 2);
  await page.getByRole("button", { name: "确认删除方案 夜读 2 副本" }).click();
  await page.getByText("已删除“夜读 2 副本”。").waitFor();
  assert.deepEqual(await themeNames(page), ["夜读 2"]);
  await second.waitForFunction(
    () => document.querySelectorAll('[aria-label="我的方案"] input').length === 1,
  );
  await second.close();

  // 8. 刷新后保持。
  await page.reload();
  await page.getByRole("heading", { name: "主题方案" }).waitFor();
  assert.deepEqual(await themeNames(page), ["夜读 2"]);

  // 9. 方案存储失败：提示错误，列表不变。
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "zcode-appearance-themes-v1") throw new Error("quota");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("textbox", { name: "新方案名称" }).fill("失败");
  await page.getByRole("button", { name: "保存当前为新方案" }).click();
  await page.getByText("方案保存失败，列表未更改。请检查本地存储空间。").waitFor();
  assert.deepEqual(await themeNames(page), ["夜读 2"]);

  // 10. 窄屏无横向溢出。
  await page.getByRole("heading", { name: "主题方案" }).scrollIntoViewIfNeeded();
  await mkdir(".run-logs/appearance", { recursive: true });
  await page.screenshot({ path: ".run-logs/appearance/themes-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: ".run-logs/appearance/themes-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 内置配色只换颜色、保存方案、跨窗口同步、应用恢复且保留背景、重命名、复制、覆盖、二次确认删除、刷新保持、存储失败、窄屏。",
  );
} finally {
  clearTimeout(timer);
  await browser.close();
}
