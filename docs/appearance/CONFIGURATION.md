# 外观配置代码使用说明

> 不想写 JSON？“设置 → 外观 → 自定义外观 → 主题方案”可以一键套用 7 套内置配色，或把当前外观保存为自己的方案并随时切换（方案不含背景图片，应用时保留当前背景），规则见 [themes.spec.md](themes.spec.md)。

在“设置 → 外观 → 自定义外观”底部使用“外观配置代码（JSON）”。开发预览也提供相同入口。

- **代码框**：始终显示当前已保存的配置（不含背景图片）。直接修改某一项，停止输入约 0.5 秒后自动检查并应用；错误显示在下方，不改变当前配置。
- **立即应用**：不等待，马上应用代码框内容。
- **合并规则**：只有写出的字段会改变，未写出的字段和背景图片保持不变，所以可以只粘贴片段，例如 `{"mathScale": 110}`。颜色按浅深色、按键逐项合并；某颜色写 `""` 表示删除覆盖、恢复继承主题。`"backgroundImage": ""` 清除背景图片。要从零开始，先点“恢复自定义外观默认值”。
- **导出并复制**：复制包含背景图片的完整配置，用于分享或备份，代码框内容不变；剪贴板不可用时完整配置会放入代码框，手动复制即可。
- 应用主题模式、UI 字号、代码语法高亮和终端设置不在该格式内，不随导入改变。
- 图片以 data URL 随配置携带，不依赖原文件路径。因此带图片的代码可能较长；图片上限 2 MiB，代码上限约 3 MiB。
- 这是 ZCode 自定义格式，使用方式类似代码式主题导入，不保证兼容其他软件的主题代码。

下面的例子可以直接粘贴。它未写背景图片，因此已有背景保持不变；写出的字段会覆盖当前值，浅深色配色都会保存，切换应用主题可预览对应模式。

```json
{
  "version": 1,
  "fontFamily": "Microsoft YaHei, Segoe UI",
  "panelOpacity": 85,
  "sidebarOpacity": 75,
  "colors": {
    "light": {
      "background": "#f5f7fb",
      "foreground": "#202c3a"
    },
    "dark": {
      "background": "#17202d",
      "panel": "#202c3a",
      "foreground": "#e4edf6",
      "secondaryText": "#9bacc1",
      "brand": "#8bb8ff"
    }
  }
}
```

| 字段                             | 可用值                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `version`                        | 可省略；写出时必须为 `1`                                |
| `backgroundImage`                | 空字符串，或由导出生成的 PNG/JPEG/WebP data URL         |
| `backgroundFit`                  | `cover` 或 `contain`                                    |
| `overlay`                        | 0–100 的整数，背景遮罩                                  |
| `blur`                           | 0–30 的整数，模糊像素值                                 |
| `panelOpacity`、`sidebarOpacity` | 0–100 的整数，100 为完全不透明                          |
| `fontFamily`                     | 最长 160 字符的字体名称列表，逗号分隔，空字符串继承默认 |
| `codeFontFamily`                 | 代码字体，规则同 `fontFamily`；追加在原等宽字体栈之前   |
| `mathBold`                       | `true` 或 `false`，公式使用 KaTeX 粗体字形              |
| `mathScale`                      | 80–160 的整数，公式相对正文的字号百分比，默认 121       |
| `chatFontFamily`                 | 聊天正文字体，规则同 `fontFamily`；空字符串继承界面字体 |
| `chatFontSize`                   | `0` 继承；或 12–28 的整数 px，聊天正文字号              |
| `chatLineHeight`                 | `0` 继承；或 100–240 的整数百分比，聊天正文行距         |
| `colors.light`、`colors.dark`    | 浅深色覆盖，值为六位十六进制颜色                        |

可用颜色键及作用位置：

| 颜色键            | 覆盖的变量                     | 作用位置                                          |
| ----------------- | ------------------------------ | ------------------------------------------------- |
| `background`      | `--color-background`           | 窗口底层及对话区背景；不覆盖终端原有背景          |
| `sidebar`         | `--color-sidebar`              | 左侧会话与任务栏                                  |
| `panel`           | `--color-panel`                | 主面板结构背景；截图显示对话区主要是 `background` |
| `card`            | `--color-card`                 | 卡片、代码块、工具调用块                          |
| `input`           | `--color-input`                | 输入框、下拉框、选中卡片底色                      |
| `brand`           | `--color-brand`                | 发送等强调按钮、高亮动画                          |
| `foreground`      | `--color-foreground`           | 正文文字；不覆盖终端原有文字色                    |
| `secondaryText`   | `--color-foreground-subtle`    | 说明、时间、提示等次要文字                        |
| `border`          | `--color-border`               | 分割线及卡片、输入框、菜单、标签页边框            |
| `link`            | `--color-icon-blue`            | 对话中的链接与文件链接                            |
| `inlineCode`      | `--color-markdown-inline-code` | 对话中行内代码底色（按 50% 透明度绘制）           |
| `primary`         | `--color-primary`              | 主按钮等主要操作填充色                            |
| `primaryText`     | `--color-primary-foreground`   | 主要操作填充色上的文字与图标                      |
| `math`            | `--appearance-math-color`      | 对话中的 LaTeX 公式（KaTeX）                      |
| `quoteText`       | `--appearance-quote-text`      | Markdown 引用块文字                               |
| `quoteBorder`     | `--appearance-quote-border`    | Markdown 引用块左侧竖线                           |
| `quoteBackground` | `--appearance-quote-bg`        | Markdown 引用块底色（设置后增加内边距）           |
| `heading`         | `--appearance-md-heading`      | Markdown 标题 h1–h6                               |
| `strong`          | `--appearance-md-strong`       | Markdown 加粗文字                                 |
| `listMarker`      | `--appearance-md-marker`       | 列表编号与圆点                                    |
| `tableHeader`     | `--appearance-md-table-header` | 表格表头文字                                      |

将某一颜色键设为 `""` 即可清除该覆盖并继承当前主题；省略或删除键会保留之前保存的值。未知字段会被拒绝，以免拼写错误被静默忽略。代码语法高亮、弹出菜单背景和终端配色目前仍来自主题，不在该格式内。

聊天正文排版（`chatFontFamily`、`chatFontSize`、`chatLineHeight`）只作用于对话中的用户消息和助手回复：标题保持原有 +4/+2/0px 层级，行内代码比正文小 2px；代码块、按钮、输入框、终端和其他面板中的 Markdown 不受影响。

公式也可在内容中单独着色或加粗，例如 `\color{#c0392b}{f''(x)}`、`\boldsymbol{f'(x)}`；这些写法优先于上面的全局公式设置。
