# 引用块颜色

状态：已实现，单元与组件 E2E 通过；未在完整登录后工作区验收。

## 背景

用户在带背景图的界面中看不清 Markdown 引用块（`>`）。引用块由 `markdown-blockquote.tsx` 渲染，文字用 `--color-foreground-subtle`、竖线用 `--color-border`。主题默认辅助文字是正文颜色的 60% 透明度，叠在背景图上可读性差；而修改 `secondaryText`/`border` 会影响全部辅助文字和边框。

## 产品规则

新增三个浅深色独立的颜色键，仍为 `version: 1`：

| 颜色键            | 变量                        | 作用                                             |
| ----------------- | --------------------------- | ------------------------------------------------ |
| `quoteText`       | `--appearance-quote-text`   | 引用块文字                                       |
| `quoteBorder`     | `--appearance-quote-border` | 引用块左侧竖线                                   |
| `quoteBackground` | `--appearance-quote-bg`     | 引用块底色；设置时增加上下与右侧内边距和右侧圆角 |

- 未设置时回退到组件原有的 `--color-foreground-subtle`、`--color-border`，无底色，默认外观不变。
- 作用于所有使用 `MarkdownBlockquote`（`[data-markdown-blockquote]`）的位置，包括对话、预览与分享页。
- 颜色仍为六位十六进制；底色不透明，需要半透明效果时选择接近面板的颜色。

## 实现

- `appearanceSettings.ts`：三个颜色键映射到外观层私有变量（引用块没有既有语义变量）。
- `appearanceEnvironment.ts`：当前模式设置了 `quoteBackground` 时在根元素设置 `data-appearance-quote-bg`，否则移除。
- `appearance.css`：`[data-markdown-blockquote]` 使用带回退的变量；`[data-appearance-quote-bg]` 下启用底色、内边距与圆角。样式文件未分层，因此优先于组件的 Tailwind 工具类；回退值与工具类一致。
- 状态所有者与时序不变：仍为 ZCode store 的 `appearanceSettings`。

## 验收

1. 默认配置下引用块颜色、边框、背景与改动前一致。
2. 设置三色后计算样式对应改变；浅色未配置时回到原样；恢复默认移除覆盖与根属性。
3. 设置页颜色网格出现三项，中英文文案齐全；JSON 可合并、导出往返。
