import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMessageSingleDollarMath } from "../src/lib/messageSingleDollarMath.js";

test("撇号导数记号按公式保留，普通英文与价格仍转义", () => {
  for (const math of ["$f'$", "$f''$", "$y'''$", "$f''(x)$", "$x$", "$\\alpha$"]) {
    assert.equal(
      normalizeMessageSingleDollarMath(`再用 ${math} 的单调性`),
      `再用 ${math} 的单调性`,
    );
  }
  // 与既有行为一致：只转义判定失败的开头 `$`，其后的 `$` 不再成对，不会渲染为公式。
  assert.equal(normalizeMessageSingleDollarMath("costs $5 and $10"), "costs \\$5 and $10");
  assert.equal(normalizeMessageSingleDollarMath("$it's$"), "\\$it's$");
  assert.equal(normalizeMessageSingleDollarMath("$f ''$"), "\\$f ''$");
  assert.equal(normalizeMessageSingleDollarMath("`$f'$`"), "`$f'$`");
});
