export const BROADCAST_FIELDS = new Set([
  "theme",
  "locale",
  "uiFontSizePx",
  "interfaceMode",
  "appearanceSettings",
  "appearanceThemes",
]);

export type BroadcastField =
  | "theme"
  | "locale"
  | "uiFontSizePx"
  | "interfaceMode"
  | "appearanceSettings"
  | "appearanceThemes";
