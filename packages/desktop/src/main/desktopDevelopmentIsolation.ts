import { join } from "node:path";

/** 与设置服务共用显式 home 约定，防止早期 bootstrap 把独立开发实例导向日常数据。 */
export function resolveDesktopBootstrapSettingsPath(
  fallbackHome: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return join(env.ZCODE_DESKTOP_HOME_DIR?.trim() || fallbackHome, ".zcode", "v2", "setting.json");
}

export function isDesktopShellIntegrationDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ZCODE_DESKTOP_DISABLE_SHELL_INTEGRATION === "1";
}
