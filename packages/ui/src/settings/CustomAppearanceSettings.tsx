import { useEffect, useRef, useState } from "react";
import { AppearanceCodeTransfer } from "./AppearanceCodeTransfer.js";
import { ChatTypographySettings } from "./ChatTypographySettings.js";
import { AppearanceThemeLibrary } from "./AppearanceThemeLibrary.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Switch } from "@/components/ui/switch.js";
import { Card, CardContent } from "@/components/ui/card.js";
import {
  APPEARANCE_COLOR_TOKENS,
  DEFAULT_APPEARANCE_SETTINGS,
  MAX_MATH_SCALE,
  MIN_MATH_SCALE,
  normalizeAppearanceSettings,
  type AppearanceColor,
} from "@/lib/appearanceSettings.js";
import { readAppearanceBackground } from "@/lib/appearanceBackground.js";

export function CustomAppearanceSettings() {
  const settings = useZCodeStore((state) => state.appearanceSettings);
  const setSettings = useZCodeStore((state) => state.setAppearanceSettings);
  const { intl } = useZCodeIntl();
  const message = (key: string) => intl.formatMessage({ id: `settings.customAppearance.${key}` });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [colorMode, setColorMode] = useState<"light" | "dark">("dark");
  const operation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      operation.current += 1;
    },
    [],
  );

  const save: typeof setSettings = (patch) => {
    const ok = setSettings(patch);
    setError(ok ? "" : "saveFailed");
    return ok;
  };
  const cancelImport = () => {
    operation.current += 1;
    setLoading(false);
  };

  const selectImage = async (file: File) => {
    const id = ++operation.current;
    setLoading(true);
    setError("");
    try {
      const backgroundImage = await readAppearanceBackground(file);
      // 新选择、清除、重置或卸载后的旧解码结果不能覆盖用户较新的操作。
      if (id === operation.current) save({ backgroundImage });
    } catch (cause) {
      if (id === operation.current) {
        const reason = cause instanceof Error ? cause.message : "decode";
        setError(["type", "size", "decode"].includes(reason) ? reason : "decode");
      }
    } finally {
      if (id === operation.current) setLoading(false);
    }
  };

  const setColor = (key: AppearanceColor, value: string) => {
    const colors = { ...settings.colors[colorMode] };
    if (value) colors[key] = value;
    else delete colors[key];
    save({ colors: { ...settings.colors, [colorMode]: colors } });
  };

  return (
    <section className="min-w-0 space-y-3" aria-label={message("title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-ui-lg font-semibold">{message("title")}</h3>
        <Button
          variant="outline"
          onClick={() => {
            cancelImport();
            save(DEFAULT_APPEARANCE_SETTINGS);
          }}
        >
          {message("reset")}
        </Button>
      </div>
      <p className="text-ui-base text-foreground-subtle">{message("description")}</p>
      {error && (
        <p role="alert" className="text-ui-base text-destructive">
          {message(error)}
        </p>
      )}
      <AppearanceThemeLibrary
        onBeforeApply={() => {
          cancelImport();
          setError("");
        }}
      />
      <Card className="border border-border bg-card py-0 shadow-none">
        <CardContent className="space-y-5 p-4">
          <div className="space-y-2">
            <p className="text-ui-base font-medium">{message("background")}</p>
            <p className="text-ui-sm text-foreground-subtle">{message("backgroundHelp")}</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-label={message("chooseImage")}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void selectImage(file);
                }}
              />
              <Button variant="outline" onClick={() => input.current?.click()}>
                {message(loading ? "loading" : "chooseImage")}
              </Button>
              <Button
                variant="ghost"
                disabled={!settings.backgroundImage && !loading}
                onClick={() => {
                  cancelImport();
                  save({ backgroundImage: "" });
                }}
              >
                {message("clearImage")}
              </Button>
            </div>
            {settings.backgroundImage && (
              <img
                src={settings.backgroundImage}
                alt={message("background")}
                className="h-24 w-full rounded-md object-cover"
              />
            )}
          </div>
          <label className="flex flex-wrap items-center justify-between gap-2 text-ui-base">
            {message("fit")}
            <select
              className="rounded-md border border-input-border bg-input p-2 text-ui-base"
              value={settings.backgroundFit}
              onChange={(e) =>
                save({ backgroundFit: e.target.value === "contain" ? "contain" : "cover" })
              }
            >
              <option value="cover">{message("cover")}</option>
              <option value="contain">{message("contain")}</option>
            </select>
          </label>
          {(["overlay", "blur", "panelOpacity", "sidebarOpacity"] as const).map((key) => (
            <label key={key} className="block space-y-2 text-ui-base">
              <span className="flex justify-between gap-2">
                <span>{message(key)}</span>
                <span className="tabular-nums">
                  {settings[key]}
                  {key === "blur" ? "px" : "%"}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={key === "blur" ? 30 : 100}
                step={1}
                value={settings[key]}
                aria-label={message(key)}
                className="w-full"
                onChange={(event) => save({ [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          {(["fontFamily", "codeFontFamily"] as const).map((key) => (
            <label key={key} className="block space-y-2 text-ui-base">
              <span>{message(key === "fontFamily" ? "font" : "codeFont")}</span>
              <Input
                key={settings[key]}
                defaultValue={settings[key]}
                maxLength={160}
                placeholder={
                  key === "fontFamily" ? "Microsoft YaHei, Segoe UI" : "JetBrains Mono, Consolas"
                }
                onBlur={(event) => {
                  const value = normalizeAppearanceSettings({
                    ...settings,
                    [key]: event.currentTarget.value,
                  })[key];
                  // 让输入草稿与实际接受值一致，保存失败时恢复原值。
                  event.currentTarget.value = save({ [key]: value }) ? value : settings[key];
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <span className="block text-ui-sm text-foreground-subtle">
                {message(key === "fontFamily" ? "fontHelp" : "codeFontHelp")}
              </span>
            </label>
          ))}
          <ChatTypographySettings settings={settings} save={save} />
          <div className="space-y-3">
            <label className="flex flex-wrap items-center justify-between gap-2 text-ui-base">
              {message("mathBold")}
              <Switch
                checked={settings.mathBold}
                aria-label={message("mathBold")}
                onCheckedChange={(mathBold) => save({ mathBold })}
              />
            </label>
            <label className="block space-y-2 text-ui-base">
              <span className="flex justify-between gap-2">
                <span>{message("mathScale")}</span>
                <span className="tabular-nums">{settings.mathScale}%</span>
              </span>
              <input
                type="range"
                min={MIN_MATH_SCALE}
                max={MAX_MATH_SCALE}
                step={1}
                value={settings.mathScale}
                aria-label={message("mathScale")}
                className="w-full"
                onChange={(event) => save({ mathScale: Number(event.target.value) })}
              />
            </label>
            <p className="text-ui-sm text-foreground-subtle">{message("mathHelp")}</p>
          </div>
          <label className="flex flex-wrap items-center justify-between gap-2 text-ui-base">
            {message("colors")}
            <select
              className="rounded-md border border-input-border bg-input p-2 text-ui-base"
              value={colorMode}
              onChange={(event) => setColorMode(event.target.value === "light" ? "light" : "dark")}
            >
              <option value="light">{message("light")}</option>
              <option value="dark">{message("dark")}</option>
            </select>
          </label>
          <p className="text-ui-sm text-foreground-subtle">{message("colorsHelp")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(APPEARANCE_COLOR_TOKENS) as AppearanceColor[]).map((key) => (
              <div key={key} className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="flex flex-1 items-center gap-2 text-ui-base">
                  <input
                    type="color"
                    value={settings.colors[colorMode][key] || "#808080"}
                    onChange={(event) => setColor(key, event.target.value)}
                    className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <span>{message(`color.${key}`)}</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!settings.colors[colorMode][key]}
                  aria-label={`${message("inherit")} ${message(`color.${key}`)}`}
                  onClick={() => setColor(key, "")}
                >
                  {message(settings.colors[colorMode][key] ? "resetColor" : "inherit")}
                </Button>
              </div>
            ))}
          </div>
          <AppearanceCodeTransfer
            onBeforeImport={() => {
              cancelImport();
              setError("");
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
