import { createRoot } from "react-dom/client";
import { StoreProvider, useZCodeStore } from "../../src/store/StoreProvider.js";
import { ZCodeIntlProvider } from "../../src/i18n/IntlProvider.js";
import { CustomAppearanceSettings } from "../../src/settings/CustomAppearanceSettings.js";
import { DesktopWindowFrame } from "../../src/DesktopWindowFrame.js";
import type { IBroadcastService, BroadcastMessage } from "@zcode/services";
import { TooltipProvider } from "../../src/components/ui/tooltip.js";
import { MessageResponse } from "../../src/components/ai-elements/message.js";
import { ConversationUserInputBody } from "../../src/v4/ConversationUserInputBody.js";
import "../../src/styles.css";

// 真实聊天正文组件样本：助手正文与 ConversationRowView 一样显式接入 appearance-chat-text，
// 另一份不接入，用于确认非聊天 Markdown 不受聊天排版影响。
const SAMPLE_MARKDOWN = [
  "## 标题样本",
  "",
  "正文段落，含 [链接](https://example.com)、**加粗** 与 `行内代码`。",
  "",
  "- 无序项",
  "1. 有序项",
  "",
  "> 引用块样本",
  "",
  "| 列 | 值 |",
  "| --- | --- |",
  "| a | 1 |",
  "",
  "```ts",
  "const x = 1;",
  "```",
].join("\n");
const SAMPLE_USER_TEXT = Array.from({ length: 4 }, (_, i) => `用户消息第 ${i + 1} 行`).join("\n");

const channel = new BroadcastChannel("appearance-integration-test");
let sent = 0;
const broadcast: IBroadcastService = {
  send: async (message) => {
    sent += 1;
    document.documentElement.dataset.broadcastCount = String(sent);
    channel.postMessage(message);
  },
  onMessage: (listener) => {
    const handler = (event: MessageEvent<BroadcastMessage>) => listener(event.data);
    channel.addEventListener("message", handler);
    return { dispose: () => channel.removeEventListener("message", handler) };
  },
  acquireClaim: async () => ({ status: "unavailable" }),
  commitClaim: async () => {},
  releaseClaim: async () => {},
  tryClaim: async () => false,
};

function Preview() {
  const setTheme = useZCodeStore((s) => s.setTheme);
  return (
    <DesktopWindowFrame title="Appearance fixture">
      <div className="flex h-full gap-2 p-2">
        <aside
          className="hidden w-44 shrink-0 rounded-lg bg-sidebar p-4 sm:block"
          data-testid="sidebar"
        >
          侧栏预览
        </aside>
        <main className="min-w-0 flex-1 overflow-auto rounded-lg bg-panel p-4" data-testid="panel">
          <nav className="mb-4 flex flex-wrap gap-4 text-ui-base">
            <button onClick={() => setTheme("zai-light")}>切换浅色</button>
            <button onClick={() => setTheme("zai-dark")}>切换深色</button>
            <button onClick={() => setTheme("system")}>跟随系统</button>
          </nav>
          <section className="mx-auto mb-6 max-w-3xl space-y-4" data-testid="chat-sample">
            <div data-testid="user-sample">
              <ConversationUserInputBody contentText={SAMPLE_USER_TEXT} rowId={1}>
                {SAMPLE_USER_TEXT}
              </ConversationUserInputBody>
            </div>
            <div data-testid="assistant-sample">
              <MessageResponse className="appearance-chat-text">{SAMPLE_MARKDOWN}</MessageResponse>
            </div>
            <div data-testid="plain-sample">
              <MessageResponse>{SAMPLE_MARKDOWN}</MessageResponse>
            </div>
          </section>
          <div className="mx-auto max-w-3xl">
            <CustomAppearanceSettings />
          </div>
        </main>
      </div>
    </DesktopWindowFrame>
  );
}

createRoot(document.getElementById("root")!).render(
  <StoreProvider broadcastService={broadcast}>
    <ZCodeIntlProvider initialLocale="zh-CN">
      <TooltipProvider>
        <Preview />
      </TooltipProvider>
    </ZCodeIntlProvider>
  </StoreProvider>,
);
