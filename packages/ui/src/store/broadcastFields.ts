export const BROADCAST_FIELDS = new Set([
  "theme",
  "locale",
  "uiFontSizePx",
  "interfaceMode",
  "appearanceSettings",
]);

export type BroadcastField =
  | "theme"
  | "locale"
  | "uiFontSizePx"
  | "interfaceMode"
  | "appearanceSettings";
