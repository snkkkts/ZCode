# 公式外观与 `$f'$` 行内公式修复

状态：已实现，单元与组件 E2E 通过；未在完整登录后工作区用真实对话做视觉验收。

## 背景

用户截图中 LaTeX 公式与正文同色，无法统一调整公式颜色或粗细；同时 `$f'$` 原样显示美元符号，而 `$f''(x)$` 正常渲染。

- LaTeX 本身可用 `\color{#hex}{…}`、`\boldsymbol{…}` 修改单个公式，但无法统一控制全部公式，需要外观配置。
- `$f'$` 的原因：`message.tsx` 中 `isLikelySingleDollarMath` 判断 `$...$` 是否为公式时，不认识撇号 `'`，把 `f'` 当普通文本并转义 `$`。

## 产品规则

在 `AppearanceSettings`（仍为 `version: 1`）新增：

| 字段            | 取值               | 默认  | 作用                                      |
| --------------- | ------------------ | ----- | ----------------------------------------- |
| `colors.*.math` | 六位十六进制颜色   | 继承  | KaTeX 公式颜色，浅深色独立                |
| `mathBold`      | `true` / `false`   | false | 公式使用 KaTeX 自带粗体字形               |
| `mathScale`     | 80–160 的整数（%） | 121   | 公式相对正文的字号；121 与 KaTeX 默认一致 |

- 字重只提供常规/粗体两档：KaTeX_Main 与 KaTeX_Math 只有 400/700 字形，中间字重会由浏览器合成，效果模糊。
- 公式内显式写法（`\color`、`\mathbf`、`\boldsymbol` 等）由 KaTeX 写成内联样式或专用类，优先于全局设置。
- 未设置时不投影变量，`.katex` 回退到 KaTeX 原值，默认外观不变。
- 导入严格校验：`mathBold` 必须是布尔值，`mathScale` 越界或非整数拒绝。

## 实现与所有者

- 状态所有者不变：ZCode store 的 `appearanceSettings`。
- `appearanceSettings.ts`：`math` 颜色映射到外观层私有变量 `--appearance-math-color`（KaTeX 没有既有语义变量）；新增 `mathBold`、`mathScale` 及边界常量。
- `appearanceEnvironment.ts`：偏离默认时设置 `--appearance-math-weight`、`--appearance-math-size`，投影前统一移除。
- `appearance.css`：`:root .katex` 消费上述变量。`katex.min.css` 在 `appearance.css` 之后导入，且 `.katex` 用 `font` 简写重置字号和字重，因此需要 `:root` 提高优先级。
- `$f'$` 修复：把 `$...$` 预处理纯函数从 `message.tsx` 原样移到 `packages/ui/src/lib/messageSingleDollarMath.ts`（便于单元测试），新增规则“单个字母 + 1~3 个撇号且无空白”视为公式。

```mermaid
flowchart LR
  UI[开关 / 滑块 / 颜色 / JSON 导入] --> V[校验归一化]
  V --> P[持久化成功]
  P --> S[ZCode store]
  S --> D["--appearance-math-* 变量"]
  D --> K[":root .katex 规则"]
```

## 验收场景

1. 默认配置下公式字号、字重、颜色与改动前一致；恢复默认后回到 KaTeX 默认。
2. 设置公式颜色、加粗、字号后，`.katex` 计算样式对应改变；浅色未配置时继承正文。
3. 合法字段导入导出往返；`mathBold` 非布尔、`mathScale` 越界或非整数、未知颜色键被拒绝。
4. `$f'$`、`$f''$`、`$y'''$` 渲染为公式；`$it's$`、`$f ''$`、价格文本与行内代码中的 `$` 保持原有行为。
5. 设置页新增开关、滑块与颜色项，中英文文案齐全，窄屏无横向溢出。
