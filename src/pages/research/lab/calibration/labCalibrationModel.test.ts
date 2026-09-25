/**
 * The parsers over the two documents the research API serves. Fixtures are
 * made up in the documents' own shape — the page reads the live text, so
 * these hold the format, not a round.
 */
import { describe, expect, it } from 'vitest'
import {
  countNote,
  parseBlueprintContracts,
  parseCalibration,
  rowTally,
  STATE_ORDER,
  talliesDisagree,
} from './labCalibrationModel'

const BLUEPRINT = `# Research 蓝图

## 4. 契约

| 编号 | 契约 |
|---|---|
| C-F1 | 任何分析原语全系统只有一份实现 |
| C-F2 | 基础层不知道 objective |
| C-R1 | 每个"后来怎么样了"的问题有且只有一个定义 |
| C-U1 | seat 与导航一致 |
`

const CALIBRATION = `# Research 校准

## 1. 现状数字

| 面 | 标的 |
|---|---|
| C-F1 | this table is §1, not a contract row |

## 2. 契约状态

### 基础层

| 编号 | 状态 | 证据 |
|---|---|---|
| C-F1 | ⚠️ | **原语已落地**：\`lenses/screen.py\`，\\|slope\\| 保留字面竖线 |
| C-F2 | ✅ | 无 objective 依赖 |

### 实绩层

| 编号 | 状态 | 证据 |
|---|---|---|
| C-R1 | ❌ | 十处实现 |
| C-R9 | ?? | 状态符号认不出 |

### UI

| 编号 | 状态 | 证据 |
|---|---|---|
| C-U1 | ⏳ | 等数据 |

**计数**：✅ 1\u3000⚠️ 1\u3000❌ 2\u3000⏳ 0，共 4 条。

## 3. 已知差距与最小改动（未排序）

| 契约 | 差距 | 最小改动 |
|---|---|---|
| C-A1 / C-F1 | 智囊自己读表 | harness 改为经 \`lenses/\` 取读数 |
| C-R1 | 实绩十个实现 | 一个 track_record 模块 |

## 3b. 选项（供讨论）

| 契约 | 不是差距表 | 不读 |
|---|---|---|
| C-F5 | x | y |
`

describe('parseBlueprintContracts', () => {
  it('reads each contract’s wording by its id', () => {
    const c = parseBlueprintContracts(BLUEPRINT)
    expect(c.size).toBe(4)
    expect(c.get('C-F2')).toBe('基础层不知道 objective')
  })
})

describe('parseCalibration', () => {
  const parsed = parseCalibration(CALIBRATION, parseBlueprintContracts(BLUEPRINT))

  it('reads §2 only, one row per contract, with the blueprint’s wording beside the state', () => {
    expect(parsed.rows.map((r) => [r.id, r.state, r.layer])).toEqual([
      ['C-F1', 'warn', 'F'],
      ['C-F2', 'ok', 'F'],
      ['C-R1', 'fail', 'R'],
      ['C-U1', 'ramp', 'U'],
    ])
    expect(parsed.rows[0].contract).toBe('任何分析原语全系统只有一份实现')
  })

  it('keeps the evidence as written, a literal pipe included', () => {
    expect(parsed.rows[0].evidence).toBe('**原语已落地**：`lenses/screen.py`，|slope| 保留字面竖线')
  })

  it('leaves out a row whose state it cannot read, and names it rather than guessing', () => {
    expect(parsed.unread).toEqual(['C-R9'])
    expect(parsed.rows.map((r) => r.id)).not.toContain('C-R9')
  })

  it('reads §3’s fix list and stops at the next section', () => {
    expect(parsed.fixes.map((f) => f.ids)).toEqual(['C-A1 / C-F1', 'C-R1'])
    expect(parsed.fixes[0].fix).toBe('harness 改为经 `lenses/` 取读数')
  })

  it('reads the roll-up the document states, and the panel draws only when it disagrees', () => {
    expect(parsed.docTally).toEqual({ ok: 1, warn: 1, fail: 2, ramp: 0 })
    const rows = rowTally(parsed.rows)
    expect(rows).toEqual({ ok: 1, warn: 1, fail: 1, ramp: 1 })
    expect(talliesDisagree(parsed.docTally!, rows)).toBe(true)
    expect(countNote(parsed.docTally!, rows)).toContain('= 4')
    expect(talliesDisagree(rows, rows)).toBe(false)
  })

  it('says it found no roll-up rather than inventing one', () => {
    expect(parseCalibration('## 2. 契约状态\n\n| C-F1 | ✅ | x |\n', new Map()).docTally).toBeNull()
  })

  it('keeps states on the four-lamp vocabulary', () => {
    expect(STATE_ORDER).toEqual(['ok', 'warn', 'fail', 'ramp'])
  })
})
