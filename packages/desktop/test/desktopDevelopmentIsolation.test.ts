import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  resolveDesktopBootstrapSettingsPath,
  isDesktopShellIntegrationDisabled,
} from "../src/main/desktopDevelopmentIsolation.js";

test("隔离 home 优先，普通启动保留默认路径", () => {
  assert.equal(
    resolveDesktopBootstrapSettingsPath("normal", { ZCODE_DESKTOP_HOME_DIR: " isolated " }),
    join("isolated", ".zcode", "v2", "setting.json"),
  );
  assert.equal(
    resolveDesktopBootstrapSettingsPath("normal", {}),
    join("normal", ".zcode", "v2", "setting.json"),
  );
});
test("隔离启动明确禁止持久化系统集成，普通启动不变", () => {
  assert.equal(
    isDesktopShellIntegrationDisabled({ ZCODE_DESKTOP_DISABLE_SHELL_INTEGRATION: "1" }),
    true,
  );
  assert.equal(isDesktopShellIntegrationDisabled({}), false);
});
