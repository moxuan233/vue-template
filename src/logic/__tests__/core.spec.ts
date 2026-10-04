/**
 * 核心逻辑回归测试。
 * 运行：npx vitest run
 */
import { describe, expect, it } from 'vitest'
import { computeBazi } from '@/logic/bazi'
import { castFromBazi, castFromValues, palaceOf, yaoTitle, castByDayan } from '@/logic/qigua'
import { buildReading } from '@/logic/reader'
import { YIJING, YIJING_BY_ID, YIJING_BY_NAME } from '@/data/yijing.generated'
import { HEXAGRAM_META, shapeByNumber, metaByNumber, metaByLines } from '@/data/hexagrams'
import { BAGUA } from '@/data/bagua'

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
  it('八卦二进制与卦符对应', () => {
    expect(BAGUA.乾.bits).toBe(0b111)
    expect(BAGUA.坤.bits).toBe(0b000)
    expect(BAGUA.震.bits).toBe(0b100)
    expect(BAGUA.巽.bits).toBe(0b011)
    expect(BAGUA.坎.bits).toBe(0b010)
    expect(BAGUA.离.bits).toBe(0b101)
    expect(BAGUA.艮.bits).toBe(0b001)
    expect(BAGUA.兑.bits).toBe(0b110)
  })
})
