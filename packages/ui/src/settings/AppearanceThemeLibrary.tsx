import { useState } from "react";
import { nanoid } from "nanoid";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Card, CardContent } from "@/components/ui/card.js";
import { resolveTheme } from "@/useTheme.js";
import { BUILTIN_APPEARANCE_PALETTES } from "@/lib/appearancePalettes.js";
import {
  MAX_APPEARANCE_THEMES,
  MAX_APPEARANCE_THEME_NAME_LENGTH,
  applyAppearancePalette,
  applyAppearanceTheme,
  createAppearanceTheme,
  duplicateThemeName,
  normalizeAppearanceThemeName,
  type AppearanceTheme,
} from "@/lib/appearanceThemes.js";

/** 主题方案：内置配色一键套用，以及用户方案的保存、应用、覆盖、重命名、复制、删除。 */
export function AppearanceThemeLibrary({ onBeforeApply }: { onBeforeApply: () => void }) {
  const settings = useZCodeStore((state) => state.appearanceSettings);
  const setSettings = useZCodeStore((state) => state.setAppearanceSettings);
  const themes = useZCodeStore((state) => state.appearanceThemes);
  const setThemes = useZCodeStore((state) => state.setAppearanceThemes);
  const mode = resolveTheme(useZCodeStore((state) => state.theme));
  const { intl } = useZCodeIntl();
  const message = (key: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `settings.appearanceThemes.${key}` }, values);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<{ key: string; name?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const full = themes.length >= MAX_APPEARANCE_THEMES;

  const saveThemes = (next: AppearanceTheme[], success: { key: string; name?: string }) => {
    setConfirmDelete(null);
    const ok = setThemes(next);
    setStatus(ok ? success : { key: "saveFailed" });
    return ok;
  };
  const applySettings = (next: typeof settings, name: string) => {
    setConfirmDelete(null);
    onBeforeApply();
    setStatus(setSettings(next) ? { key: "applied", name } : { key: "applyFailed" });
  };

  const saveNew = () => {
    const name = normalizeAppearanceThemeName(newName);
    if (!name || full) return;
    if (
      saveThemes([...themes, createAppearanceTheme(nanoid(12), name, settings)], {
        key: "saved",
        name,
      })
    )
      setNewName("");
  };

  return (
    <section className="min-w-0 space-y-3" aria-label={message("title")}>
      <h3 className="text-ui-lg font-semibold">{message("title")}</h3>
      <p className="text-ui-base text-foreground-subtle">{message("description")}</p>
      {status && (
        <p
          role={status.key.endsWith("Failed") ? "alert" : "status"}
          className={
            status.key.endsWith("Failed")
              ? "text-ui-base text-destructive"
              : "text-ui-base text-foreground-subtle"
          }
        >
          {message(status.key, { name: status.name ?? "" })}
        </p>
      )}
      <Card className="border border-border bg-card py-0 shadow-none">
        <CardContent className="space-y-5 p-4">
          <div className="space-y-2">
            <p className="text-ui-base font-medium">{message("builtin")}</p>
            <p className="text-ui-sm text-foreground-subtle">{message("builtinHelp")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUILTIN_APPEARANCE_PALETTES.map((palette) => {
                const colors = palette.colors[mode];
                return (
                  <Button
                    key={palette.id}
                    variant="outline"
                    className="h-auto min-w-0 justify-start gap-2 py-2"
                    aria-label={message("applyPalette", { name: palette.name })}
                    onClick={() =>
                      applySettings(applyAppearancePalette(palette, settings), palette.name)
                    }
                  >
                    <span className="flex shrink-0 overflow-hidden rounded-sm border border-border">
                      {[colors.background, colors.foreground, colors.brand, colors.math].map(
                        (color, index) => (
                          <span
                            key={index}
                            aria-hidden="true"
                            className="size-4"
                            style={{ backgroundColor: color }}
                          />
                        ),
                      )}
                    </span>
                    <span className="truncate">{palette.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-ui-base font-medium">{message("mine")}</p>
            <p className="text-ui-sm text-foreground-subtle">
              {message("mineHelp", { max: MAX_APPEARANCE_THEMES })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={newName}
                maxLength={MAX_APPEARANCE_THEME_NAME_LENGTH}
                placeholder={message("namePlaceholder")}
                aria-label={message("newName")}
                className="min-w-0 flex-1"
                onChange={(event) => setNewName(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveNew();
                }}
              />
              <Button disabled={full || !normalizeAppearanceThemeName(newName)} onClick={saveNew}>
                {message("saveNew")}
              </Button>
            </div>
            {themes.length === 0 ? (
              <p className="text-ui-sm text-foreground-subtle">{message("empty")}</p>
            ) : (
              <ul className="space-y-2" aria-label={message("mine")}>
                {themes.map((theme) => (
                  <li
                    key={theme.id}
                    className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <Input
                      key={theme.name}
                      defaultValue={theme.name}
                      maxLength={MAX_APPEARANCE_THEME_NAME_LENGTH}
                      aria-label={message("rename", { name: theme.name })}
                      className="min-w-0 flex-1 basis-40"
                      onBlur={(event) => {
                        const name = normalizeAppearanceThemeName(event.currentTarget.value);
                        // 非法名称或保存失败时恢复原名，输入框始终显示实际保存的名称。
                        if (!name || name === theme.name) {
                          event.currentTarget.value = theme.name;
                          return;
                        }
                        const ok = saveThemes(
                          themes.map((item) => (item.id === theme.id ? { ...item, name } : item)),
                          { key: "renamed", name },
                        );
                        if (!ok) event.currentTarget.value = theme.name;
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                    <Button
                      size="sm"
                      aria-label={message("applyTheme", { name: theme.name })}
                      onClick={() =>
                        applySettings(applyAppearanceTheme(theme, settings), theme.name)
                      }
                    >
                      {message("apply")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={message("overwriteTheme", { name: theme.name })}
                      onClick={() =>
                        saveThemes(
                          themes.map((item) =>
                            item.id === theme.id
                              ? createAppearanceTheme(item.id, item.name, settings)
                              : item,
                          ),
                          { key: "overwritten", name: theme.name },
                        )
                      }
                    >
                      {message("overwrite")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={full}
                      aria-label={message("duplicateTheme", { name: theme.name })}
                      onClick={() => {
                        const name = duplicateThemeName(
                          theme.name,
                          themes.map((item) => item.name),
                          message("copySuffix"),
                        );
                        saveThemes([...themes, { ...theme, id: nanoid(12), name }], {
                          key: "duplicated",
                          name,
                        });
                      }}
                    >
                      {message("duplicate")}
                    </Button>
                    <Button
                      size="sm"
                      variant={confirmDelete === theme.id ? "destructive" : "ghost"}
                      aria-label={message(
                        confirmDelete === theme.id ? "confirmDeleteTheme" : "deleteTheme",
                        { name: theme.name },
                      )}
                      onClick={() => {
                        if (confirmDelete !== theme.id) {
                          setConfirmDelete(theme.id);
                          return;
                        }
                        saveThemes(
                          themes.filter((item) => item.id !== theme.id),
                          { key: "deleted", name: theme.name },
                        );
                      }}
                    >
                      {message(confirmDelete === theme.id ? "confirmDelete" : "delete")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
