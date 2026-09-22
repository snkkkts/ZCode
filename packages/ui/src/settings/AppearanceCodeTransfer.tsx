import { useEffect, useMemo, useRef, useState } from "react";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { Button } from "@/components/ui/button.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
  parseAppearancePatch,
  serializeAppearanceCode,
  serializeAppearanceEditorCode,
  MAX_APPEARANCE_CODE_LENGTH,
} from "@/lib/appearanceTransfer.js";
import { decodeAppearanceBackground } from "@/lib/appearanceBackground.js";

/** 停止输入后自动应用的等待时间；太短会在输入到一半时频繁报错。 */
const APPLY_DELAY_MS = 500;

export function AppearanceCodeTransfer({ onBeforeImport }: { onBeforeImport: () => void }) {
  const settings = useZCodeStore((state) => state.appearanceSettings);
  const setSettings = useZCodeStore((state) => state.setAppearanceSettings);
  const { intl } = useZCodeIntl();
  const message = (key: string) => intl.formatMessage({ id: `settings.appearanceCode.${key}` });
  const view = useMemo(() => serializeAppearanceEditorCode(settings), [settings]);
  // 代码框只持有草稿；dirty 表示用户正在编辑，此时不以已接受配置覆盖输入。
  const [draft, setDraft] = useState(view);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);
  const lastApply = useRef<Promise<boolean> | undefined>(undefined);
  const latest = useRef(settings);

  // 合并以应用时刻的已接受配置为底；配置被其他控件或窗口修改时，进行中的旧请求失效。
  useEffect(() => {
    latest.current = settings;
    sequence.current += 1;
    setBusy(false);
  }, [settings]);
  useEffect(() => {
    if (!dirty) setDraft(view);
  }, [view, dirty]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      pending.current = false;
      sequence.current += 1;
    },
    [],
  );

  const apply = (code: string): Promise<boolean> => {
    clearTimeout(timer.current);
    pending.current = false;
    lastApply.current = applyNow(code);
    return lastApply.current;
  };

  const applyNow = async (code: string): Promise<boolean> => {
    const current = ++sequence.current;
    setBusy(true);
    try {
      const base = latest.current;
      const next = parseAppearancePatch(code, base);
      if (next.backgroundImage && next.backgroundImage !== base.backgroundImage)
        await decodeAppearanceBackground(next.backgroundImage);
      if (current !== sequence.current) return false;
      if (JSON.stringify(next) === JSON.stringify(base)) {
        setStatus("");
        return true;
      }
      onBeforeImport();
      if (!setSettings(next)) {
        setStatus("saveFailed");
        return false;
      }
      setStatus("imported");
      return true;
    } catch (error) {
      if (current !== sequence.current) return false;
      setField(error instanceof Error ? error.message : "JSON");
      setStatus("invalid");
      return false;
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  };

  const exportCode = async () => {
    const output = serializeAppearanceCode(settings);
    try {
      await navigator.clipboard.writeText(output);
      setStatus("copied");
    } catch {
      // 剪贴板不可用时把含图片的完整配置放入代码框，供手动复制；不触发自动应用。
      clearTimeout(timer.current);
      pending.current = false;
      lastApply.current = undefined;
      sequence.current += 1;
      setDraft(output);
      setDirty(true);
      setStatus("manualCopy");
    }
  };

  const isError = status === "invalid" || status === "saveFailed";
  return (
    <div className="space-y-3 border-t border-border pt-5">
      <label className="block space-y-2 text-ui-base font-medium">
        <span>{message("title")}</span>
        <Textarea
          value={draft}
          maxLength={MAX_APPEARANCE_CODE_LENGTH}
          spellCheck={false}
          className="h-56 min-h-40 resize-y font-mono [field-sizing:fixed]"
          placeholder={'{\n  "mathScale": 110\n}'}
          onChange={(event) => {
            const code = event.currentTarget.value;
            clearTimeout(timer.current);
            sequence.current += 1;
            setBusy(false);
            setStatus("");
            setDraft(code);
            setDirty(true);
            pending.current = true;
            timer.current = setTimeout(() => void apply(code), APPLY_DELAY_MS);
          }}
          onBlur={() => {
            // 失焦时立即应用尚未触发的修改；成功或无错误时回到当前配置视图，失败则保留草稿供修改。
            if (!dirty) return;
            const result = pending.current ? apply(draft) : lastApply.current;
            void (result ?? Promise.resolve(true)).then((ok) => {
              if (ok) setDirty(false);
            });
          }}
        />
      </label>
      <p className="text-ui-sm text-foreground-subtle">{message("help")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void exportCode()}>
          {message("export")}
        </Button>
        <Button disabled={busy || !draft.trim()} onClick={() => void apply(draft)}>
          {message(busy ? "importing" : "import")}
        </Button>
      </div>
      {status && (
        <p
          role={status === "saveFailed" ? "alert" : "status"}
          className={
            isError ? "text-ui-base text-destructive" : "text-ui-base text-foreground-subtle"
          }
        >
          {status === "invalid"
            ? intl.formatMessage({ id: "settings.appearanceCode.invalid" }, { field })
            : message(status)}
        </p>
      )}
    </div>
  );
}
