import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

// 在外观预览页用真实 MessageResponse 与 ConversationUserInputBody 检查聊天正文排版和引用块颜色。
const browser = await chromium.launch({ channel: "msedge", headless: true, timeout: 30000 });
const timer = setTimeout(() => {
  void browser.close();
}, 150000);
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.APPEARANCE_TEST_URL || "http://127.0.0.1:5199", { timeout: 60000 });
  await page.getByRole("heading", { name: "自定义外观" }).waitFor();
  await page.locator('[data-testid="assistant-sample"] [data-markdown-blockquote]').waitFor();
  await page.getByRole("button", { name: "切换深色", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "外观配置代码（JSON）" });

  const measure = () =>
    page.evaluate(() => {
      const pick = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`missing ${selector}`);
        const style = getComputedStyle(element);
        return {
          size: style.fontSize,
          leading: style.lineHeight,
          family: style.fontFamily,
          color: style.color,
          border: style.borderLeftColor,
          background: style.backgroundColor,
        };
      };
      const a = '[data-testid="assistant-sample"]';
      const plain = '[data-testid="plain-sample"]';
      return {
        paragraph: pick(`${a} p`),
        heading: pick(`${a} h2`),
        inlineCode: pick(`${a} p code`),
        cell: pick(`${a} td`),
        code: pick(`${a} [data-language] [data-language]`),
        codeHeader: pick(`${a} [data-language] span.font-mono`),
        tableButton: pick(`${a} [data-markdown-table-toolbar] button`),
        quote: pick(`${a} [data-markdown-blockquote]`),
        strong: pick(`${a} p [data-streamdown="strong"]`),
        th: pick(`${a} th`),
        marker: getComputedStyle(
          document.querySelector(`${a} [data-streamdown="unordered-list"] > li`),
          "::marker",
        ).color,
        olMarker: getComputedStyle(
          document.querySelector(`${a} [data-streamdown="ordered-list"] > li`),
          "::marker",
        ).color,
        plainParagraph: pick(`${plain} p`),
        user: pick('[data-testid="user-sample"] .appearance-chat-text'),
        userExpandable: !!document.querySelector('[data-testid="user-sample"] button'),
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        inlineUiFontSize: document.documentElement.style.getPropertyValue("--ui-font-size"),
      };
    });

  const before = await measure();
  assert.equal(before.userExpandable, false, "默认字号下 4 行用户消息不折叠");

  await editor.fill(
    JSON.stringify({
      chatFontFamily: "Georgia",
      chatFontSize: 22,
      chatLineHeight: 180,
      colors: {
        dark: {
          quoteText: "#d8cfe8",
          quoteBorder: "#f2a7bc",
          quoteBackground: "#2a2233",
          heading: "#7aa2f7",
          strong: "#ff9e64",
          listMarker: "#bb9af7",
          tableHeader: "#9ece6a",
        },
      },
    }),
  );
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-appearance-chat-size"),
  );
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="user-sample"] button'),
    undefined,
    { timeout: 5000 },
  );
  const after = await measure();

  // 正文、链接所在段落、表格文字、用户消息使用新字号与行距；标题保留 +2px 层级；行内代码为正文 -2px。
  assert.equal(after.paragraph.size, "22px");
  assert.equal(after.paragraph.leading, "39.6px");
  assert.match(after.paragraph.family, /^Georgia/);
  assert.equal(after.heading.size, "24px");
  assert.equal(after.inlineCode.size, "20px");
  assert.equal(after.cell.size, "22px");
  assert.equal(after.user.size, "22px");
  assert.equal(after.user.leading, "39.6px");
  assert.equal(after.userExpandable, true, "字号变大后折叠判定随自然高度更新");
  // 代码块、代码块标题、表格操作按钮与非聊天 Markdown 不受影响；根字号与 --ui-font-size 不变。
  assert.deepEqual(after.code, before.code);
  assert.equal(after.codeHeader.size, before.codeHeader.size);
  assert.equal(after.codeHeader.family, before.codeHeader.family);
  assert.equal(after.tableButton.size, before.tableButton.size);
  assert.deepEqual(after.plainParagraph, before.plainParagraph);
  assert.equal(after.rootFontSize, before.rootFontSize);
  assert.equal(after.inlineUiFontSize, before.inlineUiFontSize, "不修改全局 --ui-font-size");
  // 引用块使用专用颜色与底色。
  assert.equal(after.quote.color, "rgb(216, 207, 232)");
  assert.equal(after.quote.border, "rgb(242, 167, 188)");
  assert.equal(after.quote.background, "rgb(42, 34, 51)");
  // Markdown 元素颜色：默认与原样式一致（加粗继承段落色），设置后使用各自颜色。
  assert.equal(before.strong.color, before.paragraph.color);
  assert.equal(after.heading.color, "rgb(122, 162, 247)");
  assert.equal(after.strong.color, "rgb(255, 158, 100)");
  assert.equal(after.marker, "rgb(187, 154, 247)");
  assert.equal(after.olMarker, "rgb(187, 154, 247)");
  assert.equal(after.th.color, "rgb(158, 206, 106)");

  // 刷新后保持；窄屏无横向溢出。
  await page.reload();
  await page.locator('[data-testid="assistant-sample"] [data-markdown-blockquote]').waitFor();
  assert.equal((await measure()).paragraph.size, "22px");
  await page.getByTestId("chat-sample").scrollIntoViewIfNeeded();
  await mkdir(".run-logs/appearance", { recursive: true });
  await page.screenshot({ path: ".run-logs/appearance/chat-typography-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: ".run-logs/appearance/chat-typography-mobile.png" });
  await page.setViewportSize({ width: 1100, height: 1000 });

  // 设置页输入：越界取边界，留空恢复继承。
  const size = page.getByRole("textbox", { name: "正文字号（12–28 px）" });
  await size.fill("40");
  await size.press("Enter");
  assert.equal(await size.inputValue(), "28");
  assert.equal((await measure()).paragraph.size, "28px");
  await size.fill("");
  await size.press("Enter");
  assert.equal(await size.inputValue(), "");
  assert.equal((await measure()).paragraph.size, before.paragraph.size);

  // 恢复默认移除全部覆盖。
  await page.getByRole("button", { name: "恢复自定义外观默认值" }).click();
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-appearance-chat-leading"),
  );
  const reset = await measure();
  assert.deepEqual(reset.paragraph, before.paragraph);
  assert.deepEqual(reset.quote, before.quote);
  for (const key of ["heading", "strong", "th"]) assert.equal(reset[key].color, before[key].color);
  assert.equal(reset.marker, before.marker);
  assert.deepEqual(reset.user, before.user);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 聊天正文字体/字号/行距、Markdown 标题/加粗/列表符号/表头颜色、标题层级、行内代码、表格文字、用户消息折叠更新、代码块与按钮及非聊天 Markdown 不变、引用块颜色、刷新、窄屏、输入边界、恢复默认。",
  );
} finally {
  clearTimeout(timer);
  await browser.close();
}
