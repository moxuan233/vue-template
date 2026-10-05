/**
 * 核心逻辑回归测试。
 * 运行：npx vitest run
 */
import { describe, expect, it } from 'vitest'
import { blockByHour, computeBazi, HOUR_BLOCKS, hourOfBlock } from '@/logic/bazi'
import {
  castByDay,
  castByDayan,
  castFromBazi,
  castFromValues,
  palaceOf,
  yaoTitle,
} from '@/logic/qigua'
import { buildPlainTalk, buildReading } from '@/logic/reader'
import { YIJING, YIJING_BY_ID, YIJING_BY_NAME } from '@/data/yijing.generated'
import { HEXAGRAM_META, shapeByNumber, metaByNumber, metaByLines } from '@/data/hexagrams'
import { BAGUA, baguaByLines } from '@/data/bagua'

const TRIG: Record<string, string> = {
  乾: '111', 兑: '110', 离: '101', 震: '100',
  巽: '011', 坎: '010', 艮: '001', 坤: '000',
}
const POS = ['初', '二', '三', '四', '五', '上']

describe('八字排盘', () => {
  it('1990-01-01 12:00 应为 己巳 丙子 丙寅 甲午（对照参考值）', () => {
    const b = computeBazi({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 })
    expect(b.pillars.map((p) => p.ganZhi)).toEqual(['己巳', '丙子', '丙寅', '甲午'])
    expect(b.dayMaster).toBe('丙')
    expect(b.dayMasterWuXing).toBe('火')
  })

  it('年柱以立春为界', () => {
    const before = computeBazi({ year: 2024, month: 2, day: 3, hour: 12, minute: 0 })
    const after = computeBazi({ year: 2024, month: 2, day: 5, hour: 12, minute: 0 })
    expect(before.pillars[0].gan).toBe('癸')
    expect(after.pillars[0].gan).toBe('甲')
  })

  it('四柱十神与五行计数自洽', () => {
    const b = computeBazi({ year: 1988, month: 8, day: 8, hour: 8, minute: 8 })
    expect(b.pillars.find((p) => p.key === 'day')!.shiShenGan).toBe('日主')
    expect(Object.values(b.wuxingCount).reduce((a, c) => a + c, 0)).toBe(8)
  })
})

describe('语料完整性（qingshano/yijing-data）', () => {
  it('64 卦，爻画唯一', () => {
    expect(YIJING.length).toBe(64)
    expect(new Set(YIJING.map((h) => h.guaXiang)).size).toBe(64)
    expect(HEXAGRAM_META.length).toBe(64)
  })

  it('每卦的上下卦与爻画前/后三位一致', () => {
    for (const h of YIJING) {
      expect(TRIG[h.lower], `${h.name} 下卦`).toBe(h.guaXiang.slice(0, 3))
      expect(TRIG[h.upper], `${h.name} 上卦`).toBe(h.guaXiang.slice(3, 6))
    }
  })

  it('六爻爻题阴阳与爻画逐一吻合，且爻辞、小象齐备', () => {
    for (const h of YIJING) {
      expect(h.yaoCi.length, h.name).toBe(6)
      h.yaoCi.forEach((y, i) => {
        const num = h.guaXiang[i] === '1' ? '九' : '六'
        const want = i === 0 || i === 5 ? POS[i] + num : num + POS[i]
        expect(y.position, `${h.name} 第${i + 1}爻`).toBe(want)
        expect(y.text.length, `${h.name} 第${i + 1}爻爻辞`).toBeGreaterThan(0)
        expect(y.xiaoXiang.length, `${h.name} 第${i + 1}爻小象`).toBeGreaterThan(0)
      })
      expect(h.guaCi.length, `${h.name} 卦辞`).toBeGreaterThan(0)
      expect(h.tuanZhuan.length, `${h.name} 彖传`).toBeGreaterThan(0)
      expect(h.xiangZhuan.length, `${h.name} 大象传`).toBeGreaterThan(0)
    }
  })

  it('八宫各 8 卦', () => {
    const count = new Map<string, number>()
    for (const h of YIJING) count.set(h.gongName, (count.get(h.gongName) ?? 0) + 1)
    expect(count.size).toBe(8)
    for (const [, n] of count) expect(n).toBe(8)
  })

  it('互卦 / 错卦 / 综卦符合数学定义', () => {
    const byGx = new Map(YIJING.map((h) => [h.guaXiang, h.id]))
    const flip = (gx: string) => gx.split('').map((c) => (c === '1' ? '0' : '1')).join('')
    for (const h of YIJING) {
      const gx = h.guaXiang
      expect(byGx.get(flip(gx)), `${h.name} 错卦`).toBe(h.cuoGua)
      expect(byGx.get(gx.split('').reverse().join('')), `${h.name} 综卦`).toBe(h.zongGua)
      expect(byGx.get(gx.slice(1, 4) + gx.slice(2, 5)), `${h.name} 互卦`).toBe(h.huGua)
    }
  })
})

describe('爻画与形状工具', () => {
  it('metaByLines 与 guaXiang 互逆', () => {
    for (const m of HEXAGRAM_META) {
      const lines = m.guaXiang.split('').map((c) => (c === '1' ? 1 : 0))
      expect(metaByLines(lines).number, m.name).toBe(m.number)
    }
  })

  it('shapeOf 的 lines 自初爻至上爻，与 guaXiang 一致', () => {
    for (let n = 1; n <= 64; n++) {
      const s = shapeByNumber(n)
      expect(s.lines.join('')).toBe(s.meta.guaXiang)
      expect(s.fullName).toBe(s.data.fullName)
    }
  })

  it('八纯卦上下同体', () => {
    for (const name of ['乾', '坤', '坎', '离', '震', '艮', '巽', '兑']) {
      const s = shapeByNumber(YIJING_BY_NAME.get(name)!.id)
      expect(s.lower.name, name).toBe(name)
      expect(s.upper.name, name).toBe(name)
      expect(palaceOf(s.meta).shiIndex, name).toBe(5)
    }
  })
})

describe('八宫卦', () => {
  const PALACES: Record<string, string[]> = {
    乾: ['乾', '姤', '遁', '否', '观', '剥', '晋', '大有'],
    坎: ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师'],
    艮: ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐'],
    震: ['震', '豫', '解', '恒', '升', '井', '大过', '随'],
    巽: ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊'],
    离: ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人'],
    坤: ['坤', '复', '临', '泰', '大壮', '夬', '需', '比'],
    兑: ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹'],
  }
  const SHI = [5, 0, 1, 2, 3, 4, 3, 2]

  it('与标准八宫表一致，且与语料 gongName 一致', () => {
    const covered = new Set<string>()
    for (const [palace, members] of Object.entries(PALACES)) {
      members.forEach((name, step) => {
        const data = YIJING_BY_NAME.get(name)!
        expect(data.gongName, name).toBe(`${palace}宫`)
        const info = palaceOf(metaByNumber(data.id))
        expect(info.palace, name).toBe(palace)
        expect(info.shiIndex, `${name} 世爻`).toBe(SHI[step])
        expect(info.yingIndex, `${name} 应爻`).toBe((SHI[step] + 3) % 6)
        covered.add(name)
      })
    }
    expect(covered.size).toBe(64)
  })
})

describe('八字起卦', () => {
  it('1990-01-01 12:00：年干己纳离、日干丙纳艮，动爻由日干+时支定', () => {
    const b = computeBazi({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 })
    const c = castFromBazi(b)
    expect(c.ben.upper.name).toBe('离')
    expect(c.ben.lower.name).toBe('艮')
    expect(c.ben.meta.name).toBe(YIJING_BY_NAME.get('旅')!.name)
    expect(c.movingIndex).toBe((2 + 6) % 6)
  })

  it('纳甲配卦表：甲壬乾、乙癸坤、丙艮、丁兑、戊坎、己离、庚震、辛巽', () => {
    const table: Record<string, string> = {
      甲: '乾', 乙: '坤', 丙: '艮', 丁: '兑', 戊: '坎', 己: '离', 庚: '震', 辛: '巽', 壬: '乾', 癸: '坤',
    }
    for (const [gan, bagua] of Object.entries(table)) {
      const idx = '甲乙丙丁戊己庚辛壬癸'.indexOf(gan)
      const year = 1984 + idx // 1984 为甲子年
      const b = computeBazi({ year, month: 6, day: 15, hour: 12, minute: 0 })
      expect(b.pillars[0].gan, `${year}`).toBe(gan)
      expect(castFromBazi(b).origin.upperFrom.bagua, `${gan} 纳卦`).toBe(bagua)
    }
  })

  it('变卦由动爻阴阳互易得到，与原卦只差一爻', () => {
    const b = computeBazi({ year: 2000, month: 6, day: 15, hour: 9, minute: 30 })
    const c = castFromBazi(b)
    expect(c.bian).not.toBeNull()
    let diff = 0
    for (let i = 0; i < 6; i++) if (c.ben.lines[i] !== c.bian!.lines[i]) diff++
    expect(diff).toBe(1)
  })

  it('大衍筮法的爻值只可能是 6/7/8/9', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 400; i++) {
      const { values } = castByDayan()
      expect(values).toHaveLength(6)
      for (const v of values) {
        expect([6, 7, 8, 9]).toContain(v)
        seen.add(v)
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })

  it('六爻皆静 → 以卦辞断；六爻皆动 → allMoving 为真', () => {
    const still = castFromValues([7, 8, 7, 8, 7, 8])
    expect(still.staticCast).toBe(true)
    expect(still.bian).toBeNull()
    expect(still.allMoving).toBe(false)

    const all = castFromValues([9, 9, 9, 9, 9, 9])
    expect(all.allMoving).toBe(true)
    expect(all.staticCast).toBe(false)
    expect(all.ben.meta.name).toBe('乾')
    expect(all.bian!.meta.name).toBe('坤')

    const allYin = castFromValues([6, 6, 6, 6, 6, 6])
    expect(allYin.ben.meta.name).toBe('坤')
    expect(allYin.bian!.meta.name).toBe('乾')
  })
})

describe('解卦引擎', () => {
  it('输出十一个层次，动爻、世应各恰一处', () => {
    const b = computeBazi({ year: 1995, month: 3, day: 21, hour: 18, minute: 0 })
    const c = castFromBazi(b)
    const r = buildReading(c, b)
    expect(r.sections).toHaveLength(11)
    expect(r.yaos).toHaveLength(6)
    expect(r.yaos.filter((y) => y.moving)).toHaveLength(1)
    expect(r.yaos[c.movingIndex].moving).toBe(true)
    expect(r.yaos.filter((y) => y.shi)).toHaveLength(1)
    expect(r.yaos.filter((y) => y.ying)).toHaveLength(1)
    expect(r.advice.length).toBeGreaterThan(0)
    expect(r.verdict.length).toBeGreaterThan(0)
    // 爻辞取自语料
    expect(r.text.guaCi).toBe(YIJING_BY_ID.get(c.ben.meta.number)!.guaCi)
  })

  it('六爻全静也能出完整解卦', () => {
    const b = computeBazi({ year: 1970, month: 12, day: 31, hour: 23, minute: 0 })
    const c = castFromValues([8, 7, 8, 7, 8, 7])
    const r = buildReading(c, b)
    expect(r.sections).toHaveLength(11)
    expect(r.movingText).toBe('')
  })

  it('世应、六亲、六神、纳甲皆有值', () => {
    const b = computeBazi({ year: 2010, month: 10, day: 10, hour: 10, minute: 10 })
    const c = castFromBazi(b)
    const r = buildReading(c, b)
    for (const y of r.yaos) {
      expect(y.liuQin.length).toBeGreaterThan(0)
      expect(y.liuShen.length).toBeGreaterThan(0)
      expect(y.naZhi.length).toBeGreaterThan(0)
      expect(y.text.length).toBeGreaterThan(0)
    }
    expect(r.yaos[r.palace.shiIndex].shi).toBe(true)
    expect(r.yaos[r.palace.yingIndex].ying).toBe(true)
  })

  it('64 卦逐一出解卦均不抛错', () => {
    const b = computeBazi({ year: 1985, month: 5, day: 20, hour: 14, minute: 0 })
    for (let n = 1; n <= 64; n++) {
      const gx = YIJING_BY_ID.get(n)!.guaXiang
      const values = gx.split('').map((c) => (c === '1' ? 7 : 8))
      values[2] = gx[2] === '1' ? 9 : 6 // 令三爻动
      const c = castFromValues(values)
      const r = buildReading(c, b)
      expect(r.sections.length, `第${n}卦`).toBe(11)
      expect(r.yaos.filter((y) => y.moving).length, `第${n}卦动爻`).toBe(1)
    }
  })
})

describe('时辰区间', () => {
  it('十二个区间、每档两小时、子时跨夜', () => {
    expect(HOUR_BLOCKS).toHaveLength(12)
    const zi = HOUR_BLOCKS[0]
    expect(zi.zhi).toBe('子')
    expect(zi.startHour).toBe(23)
    expect(zi.endHour).toBe(1)
    expect(zi.range).toBe('23:00–01:00')
    for (const b of HOUR_BLOCKS) {
      expect((b.endHour - b.startHour + 24) % 24).toBe(2)
    }
    // 覆盖全天且不重叠
    const covered = new Set<number>()
    for (const b of HOUR_BLOCKS) {
      for (let k = 0; k < 2; k++) covered.add((b.startHour + k) % 24)
    }
    expect(covered.size).toBe(24)
  })

  it('钟点归属正确（含子时跨夜边界）', () => {
    expect(blockByHour(23).zhi).toBe('子')
    expect(blockByHour(0).zhi).toBe('子')
    expect(blockByHour(1).zhi).toBe('丑')
    expect(blockByHour(9).zhi).toBe('巳')
    expect(blockByHour(10).zhi).toBe('巳') // 10 时属 09:00–11:00 这一档
    expect(blockByHour(11).zhi).toBe('午')
    expect(blockByHour(22).zhi).toBe('亥')
    expect(hourOfBlock(blockByHour(10).index)).toBe(9)
    expect(hourOfBlock(0)).toBe(23)
  })
})

describe('每日之卦', () => {
  it('同一时辰内结果一致（可复算）', () => {
    const a = castByDay(new Date(2026, 9, 5, 10, 5, 0))
    const b = castByDay(new Date(2026, 9, 5, 10, 55, 0))
    expect(a.dayGanZhi).toBe(b.dayGanZhi)
    expect(a.hourGanZhi).toBe(b.hourGanZhi)
    expect(a.casting.ben.meta.name).toBe(b.casting.ben.meta.name)
    expect(a.casting.movingIndex).toBe(b.casting.movingIndex)
  })

  it('换时辰会换卦或换动爻', () => {
    const morning = castByDay(new Date(2026, 9, 5, 9, 0, 0))
    const evening = castByDay(new Date(2026, 9, 5, 21, 0, 0))
    const changed =
      morning.casting.ben.meta.name !== evening.casting.ben.meta.name ||
      morning.casting.movingIndex !== evening.casting.movingIndex
    expect(changed).toBe(true)
  })

  it('推法与声明的公式一致：上卦←日干、下卦←时支序 mod 8、动爻←(时干+时支) mod 6', () => {
    const dc = castByDay(new Date(2026, 9, 5, 10, 0, 0))
    const b = computeBazi({ year: 2026, month: 10, day: 5, hour: 9, minute: 0 })
    const dayGan = b.pillars[2].gan
    const hourZhi = b.pillars[3].zhi
    const hourGan = b.pillars[3].gan
    expect(dc.dayGanZhi.charAt(0)).toBe(dayGan)
    expect(dc.hourZhi).toBe(hourZhi)
    // 上卦 = 日干纳甲
    const GAN_TO_BAGUA: Record<string, string> = {
      甲: '乾', 乙: '坤', 丙: '艮', 丁: '兑', 戊: '坎', 己: '离', 庚: '震', 辛: '巽', 壬: '乾', 癸: '坤',
    }
    expect(dc.casting.ben.upper.name).toBe(GAN_TO_BAGUA[dayGan])
    const zhiIdx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(hourZhi)
    // 时支序（0 起）mod 8 取三画值：子=0→坤、丑=1→震、寅=2→坎、卯=3→兑、
    // 辰=4→艮、巳=5→巽、午=6→离、未=7→乾，其后循环
    expect(dc.casting.ben.lower.name).toBe(
      ['坤', '震', '坎', '兑', '艮', '巽', '离', '乾'][zhiIdx % 8],
    )
    const ganIdx = '甲乙丙丁戊己庚辛壬癸'.indexOf(hourGan)
    expect(dc.casting.movingIndex).toBe((ganIdx + zhiIdx) % 6)
  })

  it('可为每日之卦生成解卦与大白话（无需生辰）', () => {
    const dc = castByDay(new Date(2026, 9, 5, 10, 0, 0))
    const r = buildReading(dc.casting, null, `${dc.dateText}　${dc.note}`)
    expect(r.sections).toHaveLength(11)
    expect(r.yaos).toHaveLength(6)
    expect(r.sections[0].paragraphs[0]).toContain('每日之卦')
    for (const y of r.yaos) {
      expect(y.liuShen.length).toBeGreaterThan(0)
    }
    const p = buildPlainTalk(r, dc.casting)
    for (const v of [p.oneLine, p.keyPoint, p.trend, p.timing, p.closing]) {
      expect(v.length).toBeGreaterThan(0)
    }
    expect(p.situation.length).toBeGreaterThan(0)
    expect(p.dos.length).toBeGreaterThan(0)
    expect(p.donts.length).toBeGreaterThan(0)
  })

  it('全天 24 个钟点都能出结果（不抛错）', () => {
    for (let h = 0; h < 24; h++) {
      const dc = castByDay(new Date(2026, 9, 5, h, 0, 0))
      expect(dc.casting.ben.meta.name.length).toBeGreaterThan(0)
      expect(dc.casting.movingIndex).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('大白话版', () => {
  it('三种典型局面都能生成完整小结', () => {
    const b = computeBazi({ year: 1990, month: 1, day: 1, hour: 9, minute: 0 })
    const c1 = castFromBazi(b)
    expect(buildPlainTalk(buildReading(c1, b), c1).oneLine).toContain('之《')

    const c2 = castFromValues([7, 8, 7, 8, 7, 8])
    const p2 = buildPlainTalk(buildReading(c2, b), c2)
    expect(p2.situation.some((s) => s.includes('没动'))).toBe(true)

    const c3 = castFromValues([9, 9, 9, 9, 9, 9])
    const p3 = buildPlainTalk(buildReading(c3, b), c3)
    expect(p3.dos.length).toBeGreaterThan(0)
    expect(p3.trend.length).toBeGreaterThan(0)
  })

  it('64 卦 × 动爻均能生成大白话', () => {
    const b = computeBazi({ year: 1985, month: 5, day: 20, hour: 14, minute: 0 })
    for (let n = 1; n <= 64; n++) {
      const gx = YIJING_BY_ID.get(n)!.guaXiang
      const values = gx.split('').map((c) => (c === '1' ? 7 : 8))
      values[0] = gx[0] === '1' ? 9 : 6
      const c = castFromValues(values)
      const p = buildPlainTalk(buildReading(c, b), c)
      expect(p.oneLine.length, `第${n}卦`).toBeGreaterThan(10)
      expect(p.keyPoint.length, `第${n}卦关键提醒`).toBeGreaterThan(10)
      expect(p.dos.length, `第${n}卦该做`).toBeGreaterThan(0)
      expect(p.donts.length, `第${n}卦不该做`).toBeGreaterThan(0)
    }
  })
})

describe('yaoTitle 工具', () => {
  it('与语料爻题一致', () => {
    for (const h of YIJING) {
      const lines = h.guaXiang.split('').map((c) => (c === '1' ? 1 : 0))
      h.yaoCi.forEach((y, i) => {
        expect(yaoTitle(lines, i), `${h.name} 第${i + 1}爻`).toBe(y.position)
      })
    }
  })
})

describe('bagua 数据自洽', () => {
  it('三画字符串左起即初爻，与语料 guaXiang 前/后三位一致', () => {
    expect(BAGUA.乾.lines).toBe('111')
    expect(BAGUA.兑.lines).toBe('110')
    expect(BAGUA.离.lines).toBe('101')
    expect(BAGUA.震.lines).toBe('100')
    expect(BAGUA.巽.lines).toBe('011')
    expect(BAGUA.坎.lines).toBe('010')
    expect(BAGUA.艮.lines).toBe('001')
    expect(BAGUA.坤.lines).toBe('000')
    // bits 与 lines 严格对应：bit2 = 初爻（初爻在最左）
    for (const b of Object.values(BAGUA)) {
      const want =
        (Number(b.lines[0]) << 2) | (Number(b.lines[1]) << 1) | Number(b.lines[2])
      expect(b.bits, `${b.name} bits`).toBe(want)
    }
    // 八纯卦：六位爻画应为该卦三画自我拼接
    for (const name of ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']) {
      const h = YIJING_BY_NAME.get(name)!
      expect(h.guaXiang, `${name} 六画`).toBe(BAGUA[name as keyof typeof BAGUA].lines.repeat(2))
    }
  })

  it('baguaByLines 可查表，且覆盖八个三画组合', () => {
    const seen = new Set<string>()
    for (const b of Object.values(BAGUA)) {
      expect(baguaByLines(b.lines).name).toBe(b.name)
      seen.add(b.lines)
    }
    expect(seen.size).toBe(8)
  })
})
