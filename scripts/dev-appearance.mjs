import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = resolve(root, ".zcode-runtime/appearance-dev");
const userData = join(base, "electron");
const sessionData = join(base, "session");
await Promise.all([base, userData, sessionData].map((path) => mkdir(path, { recursive: true })));
console.log(`[appearance-dev] isolated data: ${base}`);
// 第二实例复用同一环境以唤回已有窗口，避免桌面入口反复清理 out 并重新构建。
const showExisting = process.argv.includes("--show-existing");
const command = showExisting
  ? join(root, "node_modules/electron/dist/electron.exe")
  : process.execPath;
const args = showExisting
  ? [join(root, "packages/desktop")]
  : [join(root, "scripts/dev-desktop-env.mjs"), "test"];
const child = spawn(command, args, {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    ...(showExisting ? { ELECTRON_RENDERER_URL: "http://localhost:5174" } : {}),
    ZCODE_DESKTOP_HOME_DIR: base,
    ZCODE_DATA_BASE_DIR: base,
    ZCODE_DESKTOP_USER_DATA_DIR: userData,
    ZCODE_DESKTOP_SESSION_DATA_DIR: sessionData,
    ZCODE_DESKTOP_APPLICATION_NAME: "ZCode Preview Dev",
    ZCODE_DESKTOP_DISABLE_SHELL_INTEGRATION: "1",
  },
});
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
