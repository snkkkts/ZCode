import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { Input } from "@/components/ui/input.js";
import {
  CHAT_FONT_SIZE_RANGE,
  CHAT_LINE_HEIGHT_RANGE,
  normalizeAppearanceSettings,
  type AppearanceSettings,
} from "@/lib/appearanceSettings.js";

type ChatKey = "chatFontFamily" | "chatFontSize" | "chatLineHeight";

/** 聊天正文独立排版：字体、字号、行距。留空表示继承，状态仍由外观设置的唯一 setter 保存。 */
export function ChatTypographySettings({
  settings,
  save,
}: {
  settings: AppearanceSettings;
  save: (patch: Partial<AppearanceSettings>) => boolean;
}) {
  const { intl } = useZCodeIntl();
  const message = (key: string, values?: Record<string, number>) =>
    intl.formatMessage({ id: `settings.customAppearance.${key}` }, values);
  const display = (key: ChatKey) =>
    key === "chatFontFamily" ? settings[key] : settings[key] ? String(settings[key]) : "";

  const commit = (key: ChatKey, raw: string, input: HTMLInputElement) => {
    const text = raw.trim();
    const value = key === "chatFontFamily" ? text : text ? Number(text) : 0;
    const accepted = normalizeAppearanceSettings({ ...settings, [key]: value })[key];
    // 让输入框显示实际接受的值（越界取边界、非法回退继承），保存失败时恢复原值。
    const ok = save({ [key]: accepted });
    const shown = ok ? { ...settings, [key]: accepted } : settings;
    input.value =
      key === "chatFontFamily" ? String(shown[key]) : shown[key] ? String(shown[key]) : "";
  };

  const fields: { key: ChatKey; label: string; placeholder: string; numeric: boolean }[] = [
    {
      key: "chatFontFamily",
      label: message("chatFont"),
      placeholder: message("chatInherit"),
      numeric: false,
    },
    {
      key: "chatFontSize",
      label: message("chatFontSize", {
        min: CHAT_FONT_SIZE_RANGE[0],
        max: CHAT_FONT_SIZE_RANGE[1],
      }),
      placeholder: message("chatInherit"),
      numeric: true,
    },
    {
      key: "chatLineHeight",
      label: message("chatLineHeight", {
        min: CHAT_LINE_HEIGHT_RANGE[0],
        max: CHAT_LINE_HEIGHT_RANGE[1],
      }),
      placeholder: message("chatInherit"),
      numeric: true,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-ui-base font-medium">{message("chatTypography")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(({ key, label, placeholder, numeric }) => (
          <label key={key} className="block min-w-0 space-y-2 text-ui-base">
            <span>{label}</span>
            <Input
              key={display(key)}
              defaultValue={display(key)}
              inputMode={numeric ? "numeric" : undefined}
              maxLength={numeric ? 3 : 160}
              placeholder={placeholder}
              aria-label={label}
              onBlur={(event) => commit(key, event.currentTarget.value, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
        ))}
      </div>
      <p className="text-ui-sm text-foreground-subtle">{message("chatTypographyHelp")}</p>
    </div>
  );
}
