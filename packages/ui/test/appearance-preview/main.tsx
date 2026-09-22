import { createRoot } from "react-dom/client";
import { StoreProvider, useZCodeStore } from "../../src/store/StoreProvider.js";
import { ZCodeIntlProvider } from "../../src/i18n/IntlProvider.js";
import { CustomAppearanceSettings } from "../../src/settings/CustomAppearanceSettings.js";
import { DesktopWindowFrame } from "../../src/DesktopWindowFrame.js";
import type { IBroadcastService, BroadcastMessage } from "@zcode/services";
import "../../src/styles.css";

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
      <Preview />
    </ZCodeIntlProvider>
  </StoreProvider>,
);
