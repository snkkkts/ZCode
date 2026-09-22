# Markdown 元素颜色

状态：已实现，单元与组件 E2E 通过；未在完整登录后工作区验收。

## 目标

让对话与预览中的 Markdown 结构元素可单独配色，补齐“高度可定制”中文字颜色细化的缺口。此前标题、加粗、列表符号、表头只能跟随正文或辅助文字颜色。

## 产品规则

新增四个浅深色独立的颜色键，仍为 `version: 1`：

| 颜色键        | 变量                           | 作用位置                  | 未设置时                      |
| ------------- | ------------------------------ | ------------------------- | ----------------------------- |
| `heading`     | `--appearance-md-heading`      | Markdown 标题 h1–h6       | 继承正文颜色                  |
| `strong`      | `--appearance-md-strong`       | 加粗文字 `**…**`          | 继承所在文字颜色              |
| `listMarker`  | `--appearance-md-marker`       | 有序/无序列表的编号与圆点 | `--color-foreground-subtlest` |
| `tableHeader` | `--appearance-md-table-header` | 表格表头文字              | `--color-foreground-subtlest` |

- 作用于所有 Streamdown Markdown（对话、预览、分享页等），与引用块颜色一致；不影响代码块内容、语法高亮和设置界面自身。
- 颜色为六位十六进制；空值或缺省继承。未设置时回退值与组件原样式一致，默认外观不变。

## 实现

- `appearanceSettings.ts`：四个键映射到外观层私有变量（这些元素没有可复用的既有语义变量）。
- `appearance.css`：`[data-streamdown^="heading-"]`、`[data-streamdown="strong"]`、列表 `::marker`、`[data-streamdown="table"] th` 使用带回退的变量；样式未分层，优先于组件工具类。
- `message.tsx`：聊天自定义的 `strong` 组件补 `data-streamdown="strong"`，与 Streamdown 默认输出一致，便于统一选择。
- 状态所有者与时序不变：ZCode store 的 `appearanceSettings`。

## 验收

1. 默认配置下四类元素颜色与改动前一致。
2. 设置后计算颜色对应改变；浅深色独立；恢复默认回到原样。
3. 设置页颜色网格新增四项，中英文文案齐全；JSON 合并与导出往返。
