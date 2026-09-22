import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

// 独立测试站点仅加载真实外观组件与 store，不连接生产服务或日常用户数据。
const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30_000 });
const timer = setTimeout(() => {
  void browser.close();
}, 150_000);
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const origin = process.env.APPEARANCE_TEST_URL || "http://127.0.0.1:5199";
  await page.goto(origin, { timeout: 60_000 });
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  const second = await context.newPage();
  await second.goto(origin);
  await second.getByRole("heading", { name: "自定义外观" }).waitFor();
  const font = page.getByPlaceholder("Microsoft YaHei, Segoe UI");
  await font.fill("Microsoft YaHei, Segoe UI");
  await font.press("Tab");
  await second.waitForFunction(() =>
    document.documentElement.style.getPropertyValue("--font-sans").includes("Microsoft YaHei"),
  );
  assert.equal(
    await second.locator("html").getAttribute("data-broadcast-count"),
    null,
    "接收配置不应再广播",
  );

  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, "#205c9d");
    gradient.addColorStop(1, "#a15470");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);
    return canvas.toDataURL().split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "background.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-appearance-background"),
  );
  for (const label of ["主面板不透明度", "侧栏不透明度"]) {
    await page.getByRole("slider", { name: label }).fill("45");
  }
  await page.getByRole("slider", { name: "背景模糊" }).fill("8");
  await page.getByLabel("正文颜色", { exact: true }).fill("#ddeecc");
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue("--color-foreground") === "#ddeecc",
  );
  const codeFont = page.getByPlaceholder("JetBrains Mono, Consolas");
  await codeFont.fill("JetBrains Mono");
  await codeFont.press("Tab");
  await page.getByLabel("链接颜色", { exact: true }).fill("#7aa2f7");
  await page.waitForFunction(
    () =>
      document.documentElement.style.getPropertyValue("--color-icon-blue") === "#7aa2f7" &&
      document.documentElement.style.getPropertyValue("--font-mono").startsWith("JetBrains Mono, "),
  );
  await page.getByRole("switch", { name: "公式加粗" }).click();
  await page.getByRole("slider", { name: "公式字号" }).fill("100");
  await page.getByLabel("公式颜色", { exact: true }).fill("#c0392b");
  // 预览页没有对话内容，插入一个 .katex 节点检查 appearance.css 是否压过 katex.min.css 的 font 简写。
  const mathStyle = await page.evaluate(() => {
    const host = document.createElement("p");
    host.style.fontSize = "20px";
    host.innerHTML = '<span class="katex">x</span>';
    document.body.append(host);
    const style = getComputedStyle(host.firstElementChild);
    const result = { color: style.color, size: style.fontSize, weight: style.fontWeight };
    host.remove();
    return result;
  });
  assert.deepEqual(mathStyle, { color: "rgb(192, 57, 43)", size: "20px", weight: "700" });
  await page.getByRole("button", { name: "切换浅色", exact: true }).click();
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--color-foreground"),
    ),
    "",
  );
  await page.getByRole("button", { name: "切换深色", exact: true }).click();
  await page.reload();
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  assert.equal(await font.inputValue(), "Microsoft YaHei, Segoe UI");
  assert.equal(await codeFont.inputValue(), "JetBrains Mono");
  assert.equal(await page.getByRole("slider", { name: "公式字号" }).inputValue(), "100");
  assert.equal(
    await page.getByRole("switch", { name: "公式加粗" }).getAttribute("aria-checked"),
    "true",
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue("--color-icon-blue")),
    "#7aa2f7",
  );
  assert.equal(await page.getByRole("slider", { name: "主面板不透明度" }).inputValue(), "45");
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--color-foreground"),
    ),
    "#ddeecc",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator("html").getAttribute("data-appearance-background"), "true");
  await page.locator('input[type="file"]').setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await page.getByText("图片超过 2 MiB，请先压缩或选择较小的图片。").waitFor();
  await page.getByRole("slider", { name: "背景模糊" }).fill("7");
  await mkdir(".run-logs/appearance", { recursive: true });
  await page.screenshot({ path: ".run-logs/appearance/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: ".run-logs/appearance/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue("--color-foreground") === "#ddeecc",
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "zcode-appearance-v1")
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("slider", { name: "主面板不透明度" }).fill("20");
  await page.getByText("保存失败，原配置已保留。请尝试较小的图片或检查本地存储权限。").waitFor();
  assert.equal(await page.getByRole("slider", { name: "主面板不透明度" }).inputValue(), "45");
  await page.reload();
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  await page.getByRole("button", { name: "恢复自定义外观默认值" }).click();
  assert.equal(await page.locator("html").getAttribute("data-appearance-background"), null);
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue("--font-sans")),
    "",
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue("--font-mono")),
    "",
  );
  assert.equal(
    await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "katex";
      document.body.append(probe);
      const weight = getComputedStyle(probe).fontWeight;
      probe.remove();
      return weight;
    }),
    "400",
    "恢复默认后公式字重回到 KaTeX 默认",
  );
  await page.reload();
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  assert.equal(await page.getByRole("slider", { name: "主面板不透明度" }).inputValue(), "100");
  await font.fill("invalid; font");
  await font.press("Tab");
  assert.equal(await font.inputValue(), "", "无效字体草稿应与实际回退值一致");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 图片导入/损坏/体积限制、分区透明度、界面与代码字体、链接颜色、公式颜色/加粗/字号、浅深色、刷新、跨窗口无回环、窄屏、系统主题跟随、保存失败保留旧配置、恢复默认。",
  );
} finally {
  clearTimeout(timer);
  await browser.close();
}
