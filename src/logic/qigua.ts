/**
 * 八字起卦：由生辰八字推出本卦、动爻与变卦。
 *
 * ⚠ 方法学声明（务必与"源书内容"区分）
 * ------------------------------------------------------------------
 * 源书《周易》（杨天才、张善文 译注）只讲**大衍筮法**（蓍草十八变），不讲八字起卦；
 * 由八字推卦属后起的数术做法，古无定法。本项目采用的映射规则如下，**可追溯、可复算**：
 *
 *  上卦 ← 年柱天干，用「纳甲」天干配卦表（虞翻月体纳甲）
 *          甲/壬→乾  乙/癸→坤  丙→艮  丁→兑  戊→坎  己→离  庚→震  辛→巽
 *  下卦 ← 日柱天干，用同上纳甲表
 *  动爻 ← (日干序 + 时支序) mod 6 + 1
 *          日干为"我"（子平日主），时支为所问之事的当下位置，两者相加取六爻之位。
 *  变卦 ← 动爻阴阳互易所得之卦（即源书所称的"之卦"，古法"之正"）
 *
 * 之所以用"年干定上卦、日干定下卦"：年柱象天、象来处，日柱象我、象当下，
 * 与《系辞》"六爻之动，三极之道也"的天人相配思路一致。
 * ------------------------------------------------------------------
 * 若需改回源书原法，请用 castByDayan() 的大衍筮法（此处一并实现，供对照）。
 */

import { Solar } from 'lunar-typescript'
import { GAN_TO_BAGUA, NA_JIA_ZHI, BAGUA, type BaguaName } from '@/data/bagua'
import {
  HEXAGRAM_META,
  metaByLines,
  metaByName,
  shapeOf,
  type HexagramMeta,
  type HexagramShape,
} from '@/data/hexagrams'
import { DI_ZHI, TIAN_GAN, WUXING_COLOR, type WuXing } from '@/data/ganzhi'
import type { BaziResult } from './bazi'

export interface CastOrigin {
  /** 上卦由何而来 */
  upperFrom: { label: string; gan: string; bagua: BaguaName; rule: string }
  /** 下卦由何而来 */
  lowerFrom: { label: string; gan: string; bagua: BaguaName; rule: string }
  /** 动爻由何而来 */
  movingFrom: { label: string; expression: string; index: number }
}

export interface Casting {
  /** 本卦 */
  ben: HexagramShape
  /** 变卦（之卦）；无动爻时为 null */
  bian: HexagramShape | null
  /** 动爻序号，0=初爻 … 5=上爻；无动爻时为 -1 */
  movingIndex: number
  /** 是否六爻皆不动（以卦辞断） */
  staticCast: boolean
  /** 是否六爻皆动（大衍筮法中六爻皆九或皆六，乾坤有"用九/用六"之特例） */
  allMoving: boolean
  /** 依据说明 */
  origin: CastOrigin
  /** 六爻的纳甲地支（自初至上） */
  najia: string[]
  /** 六爻五行 */
  yaoWuXing: WuXing[]
}

/**
 * 时支序（0 起）对 8 取模后对应的下卦，如 巳（序 5）→ 巽。
 * 用显式表而非 Object.values 的遍历顺序，保证与声明一致、可读可查。
 */
const ZHI_MOD8_BAGUA: BaguaName[] = ['坤', '震', '坎', '兑', '艮', '巽', '离', '乾']

/** 八卦三画字符串（左起即初爻），用于拼装 guaXiang */
const TRIGRAM_LINES: Record<BaguaName, string> = {
  乾: '111', 兑: '110', 离: '101', 震: '100',
  巽: '011', 坎: '010', 艮: '001', 坤: '000',
}

const POS = ['初', '二', '三', '四', '五', '上']

/** 由上下卦取卦：guaXiang = 下卦三画 + 上卦三画 */
export function metaNameOf(lower: BaguaName, upper: BaguaName): string {
  const guaXiang = TRIGRAM_LINES[lower] + TRIGRAM_LINES[upper]
  const m = HEXAGRAM_META.find((h) => h.guaXiang === guaXiang)
  if (!m) throw new Error(`未知上下卦组合：${lower}下${upper}上`)
  return m.name
}

/** 动爻位置的中文名，如「九四」 */
export function yaoTitle(lines: number[], index: number): string {
  const pos = index === 0 ? '初' : index === 5 ? '上' : POS[index]
  const num = lines[index] === 1 ? '九' : '六'
  return index === 0 || index === 5 ? pos + num : num + pos
}

/** 由八字起卦 */
export function castFromBazi(bazi: BaziResult): Casting {
  const yearGan = bazi.pillars[0].gan
  const dayGan = bazi.pillars[2].gan
  const timeZhi = bazi.pillars[3].zhi

  const upper = GAN_TO_BAGUA[yearGan]
  const lower = GAN_TO_BAGUA[dayGan]
  if (!upper || !lower) throw new Error(`纳甲表中无此天干：${yearGan} / ${dayGan}`)

  const ganIdx = TIAN_GAN.indexOf(dayGan as (typeof TIAN_GAN)[number])
  const zhiIdx = DI_ZHI.indexOf(timeZhi as (typeof DI_ZHI)[number])
  const movingIndex = (ganIdx + zhiIdx) % 6

  // 语料的 guaXiang 是"左起即初爻"的六位字符串，故直接用三画字符串拼接，
  // 避免与数值 bit（bit0 = 初爻）的位序混淆。
  const ben = shapeOf(metaByName(metaNameOf(lower, upper)))

  const movedLines = [...ben.lines]
  movedLines[movingIndex] = movedLines[movingIndex] === 1 ? 0 : 1
  const bianMeta = metaByLines(movedLines)
  const bian = shapeOf(bianMeta)

  return {
    ben,
    bian,
    movingIndex,
    staticCast: false,
    allMoving: false,
    origin: {
      upperFrom: {
        label: '年柱天干',
        gan: yearGan,
        bagua: upper,
        rule: `纳甲：${yearGan} 纳 ${upper}（${BAGUA[upper].image}）`,
      },
      lowerFrom: {
        label: '日柱天干',
        gan: dayGan,
        bagua: lower,
        rule: `纳甲：${dayGan} 纳 ${lower}（${BAGUA[lower].image}）`,
      },
      movingFrom: {
        label: '日干 + 时支',
        expression: `(${dayGan}=${ganIdx + 1} + ${timeZhi}=${zhiIdx + 1}) mod 6 = ${movingIndex + 1}`,
        index: movingIndex,
      },
    },
    najia: najiaOf(ben),
    yaoWuXing: najiaOf(ben).map((z) => zhiWuXing(z)),
  }
}

/** 六爻纳甲地支（自初至上） */
export function najiaOf(shape: HexagramShape): string[] {
  const lowerZhi = NA_JIA_ZHI[shape.lower.name]
  const upperZhi = NA_JIA_ZHI[shape.upper.name]
  return [...lowerZhi, ...upperZhi]
}

function zhiWuXing(zhi: string): WuXing {
  const map: Record<string, WuXing> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
  }
  return map[zhi] ?? '土'
}

/** 八宫卦：返回 { palace, shiIndex, yingIndex, type } */
export interface PalaceInfo {
  /** 所属宫（八纯卦之一） */
  palace: BaguaName
  /** 世爻序号 0..5 */
  shiIndex: number
  /** 应爻序号 0..5 */
  yingIndex: number
  /** 卦的类型 */
  type: '本宫卦' | '一世' | '二世' | '三世' | '四世' | '五世' | '游魂' | '归魂'
}

// 京房八宫卦次序（每宫八卦，依本宫卦、一世…五世、游魂、归魂排列）。
// 世爻位置随之固定：本宫卦在上爻，一世至五世依次在初、二、三、四、五爻，
// 游魂在四爻，归魂在三爻——与源书《读〈易〉需要了解的一些基本术语》所述一致。
//
// 归属与次序均与语料 qingshano/yijing-data 的 gongName 字段逐一核对一致
// （该语料八宫各 8 卦，合计 64 卦无重复）。
const PALACE_ORDER: { palace: BaguaName; members: string[] }[] = [
  { palace: '乾', members: ['乾', '姤', '遁', '否', '观', '剥', '晋', '大有'] },
  { palace: '坎', members: ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师'] },
  { palace: '艮', members: ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐'] },
  { palace: '震', members: ['震', '豫', '解', '恒', '升', '井', '大过', '随'] },
  { palace: '巽', members: ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊'] },
  { palace: '离', members: ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人'] },
  { palace: '坤', members: ['坤', '复', '临', '泰', '大壮', '夬', '需', '比'] },
  { palace: '兑', members: ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹'] },
]

const TYPE_NAMES: PalaceInfo['type'][] = [
  '本宫卦', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂',
]
const SHI_BY_STEP = [5, 0, 1, 2, 3, 4, 3, 2]

const PALACE_MAP: ReadonlyMap<string, PalaceInfo> = (() => {
  const m = new Map<string, PalaceInfo>()
  for (const { palace, members } of PALACE_ORDER) {
    if (members.length !== 8) throw new Error(`${palace}宫成员数应为 8`)
    members.forEach((name, step) => {
      if (m.has(name)) throw new Error(`八宫卦重复归属：${name}`)
      const shi = SHI_BY_STEP[step]
      m.set(name, {
        palace,
        shiIndex: shi,
        yingIndex: (shi + 3) % 6,
        type: TYPE_NAMES[step],
      })
    })
  }
  if (m.size !== 64) throw new Error(`八宫卦表应覆盖 64 卦，实为 ${m.size}`)
  return m
})()

export function palaceOf(meta: HexagramMeta): PalaceInfo {
  const info = PALACE_MAP.get(meta.name)
  if (!info) throw new Error(`八宫卦表缺 ${meta.name}`)
  return info
}

/** 八纯卦的五行（宫的五行为该纯卦本宫卦的五行） */
export function palaceWuXing(palace: BaguaName): WuXing {
  return BAGUA[palace].wuxing
}

/** 六亲：以宫的五行为"我"，看各爻纳甲五行与我的关系 */
export function liuQin(palace: BaguaName, yaoWuXing: WuXing): string {
  const me = BAGUA[palace].wuxing
  if (me === yaoWuXing) return '兄弟'
  const sheng: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const ke: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  if (sheng[me] === yaoWuXing) return '子孙'
  if (ke[me] === yaoWuXing) return '妻财'
  if (ke[yaoWuXing] === me) return '官鬼'
  return '父母'
}

/** 六神（青龙…玄武），依日干起 */
export const LIU_SHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const

export function liuShenStart(dayGan: string): number {
  // 甲乙起青龙，丙丁起朱雀，戊起勾陈，己起螣蛇，庚辛起白虎，壬癸起玄武
  const table: Record<string, number> = {
    甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
  }
  return table[dayGan] ?? 0
}

/**
 * 大衍筮法（源书原法）：蓍草十八变，三变一爻。
 * 供"按古法起卦"对照使用；返回六爻（自初至上）与其老少属性。
 */
export function castByDayan(random: () => number = Math.random): {
  lines: number[]
  values: number[]
} {
  const values: number[] = []
  for (let yao = 0; yao < 6; yao++) {
    let stalks = 49
    let remains = 0
    for (let change = 0; change < 3; change++) {
      const left = 1 + Math.floor(random() * (stalks - 1))
      const right = stalks - left
      const rightAfter = right - 1                 // 挂一
      const leftRem = left % 4 || 4
      const rightRem = rightAfter % 4 || 4
      remains += 1 + leftRem + rightRem             // 挂一 + 两处归奇
      stalks = stalks - (1 + leftRem + rightRem)
    }
    // 三变之余 = 24/28/32/36 策 -> 六/七/八/九
    const v = stalks / 4
    values.push(v)
  }
  const lines = values.map((v) => (v === 7 || v === 9 ? 1 : 0))
  return { lines, values }
}

/** 由六爻值（6/7/8/9）取卦与动爻 */
export function castFromValues(values: number[]): Casting {  const lines = values.map((v) => (v === 7 || v === 9 ? 1 : 0))
  const ben = shapeOf(metaByLines(lines))
  const moving = values.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0)
  const movedLines = [...lines]
  for (const i of moving) movedLines[i] = movedLines[i] === 1 ? 0 : 1
  return {
    ben,
    bian: moving.length ? shapeOf(metaByLines(movedLines)) : null,
    movingIndex: moving.length ? moving[0] : -1,
    staticCast: moving.length === 0,
    allMoving: moving.length === 6,
    origin: {
      upperFrom: { label: '大衍筮法', gan: '', bagua: ben.upper.name, rule: '蓍草十八变所得' },
      lowerFrom: { label: '大衍筮法', gan: '', bagua: ben.lower.name, rule: '蓍草十八变所得' },
      movingFrom: {
        label: '变爻',
        expression: moving.length ? `第 ${moving.map((i) => i + 1).join('、')} 爻为变爻` : '六爻皆不变',
        index: moving.length ? moving[0] : -1,
      },
    },
    najia: najiaOf(ben),
    yaoWuXing: najiaOf(ben).map(zhiWuXing),
  }
}

/** 日卦：由某一天之日柱与当下时柱推得的卦（"今日之卦"） */
export interface DayCast {
  casting: Casting
  /** 该日日期文本，如「2026年10月5日」 */
  dateText: string
  /** 该日农历 */
  lunarText: string
  /** 该日干支（日柱） */
  dayGanZhi: string
  /** 当下时柱干支 */
  hourGanZhi: string
  /** 时辰区间文本，如「09:00–11:00」 */
  hourRange: string
  /** 时支 */
  hourZhi: string
  /** 推法说明 */
  note: string
}

/**
 * 每日之卦：无需生辰，由**当日日柱**与**当下时柱**推卦。
 *
 * 推法（与八字起卦同一结构，只是把"年柱"换成"日柱"）：
 *   上卦 ← 当日日干（纳甲天干配卦）
 *   下卦 ← 当下时支（3 画 = (时支序 mod 8)，序数自 0 起：子=坤…亥=乾）
 *   动爻 ← (时干序 + 时支序) mod 6 + 1
 *
 * 之所以用"时支序 mod 8"给下卦：时支共 12 个而八卦只有 8 个，取模后
 * 子→坤、丑→震、寅→坎、卯→兑、辰→艮、巳→巽、午→离、未→乾（申酉戌亥再循环），
 * 规则单一、可复算。代价是十二时辰只走遍八卦，申时会与子时同卦——
 * 但同日内日柱相同、动爻仍随时干时支变化，故结果不会与子时重合。
 *
 * 同一时辰区间内结果完全一致；换时辰或换日子则自动变化。
 */
export function castByDay(when: Date = new Date()): DayCast {
  const solar = Solar.fromYmdHms(
    when.getFullYear(), when.getMonth() + 1, when.getDate(), when.getHours(), when.getMinutes(), 0,
  )
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()

  const dayGan = ec.getDayGan()
  const dayZhi = ec.getDayZhi()
  const hourGan = ec.getTimeGan()
  const hourZhi = ec.getTimeZhi()

  const upper = GAN_TO_BAGUA[dayGan]
  if (!upper) throw new Error(`纳甲表中无此天干：${dayGan}`)

  const zhiIdx = DI_ZHI.indexOf(hourZhi as (typeof DI_ZHI)[number])
  // 时支序（0 起）对 8 取模 -> 下卦
  const lower = ZHI_MOD8_BAGUA[zhiIdx % 8]

  const ganIdx = TIAN_GAN.indexOf(hourGan as (typeof TIAN_GAN)[number])
  const movingIndex = (ganIdx + zhiIdx) % 6

  const ben = shapeOf(metaByName(metaNameOf(lower, upper)))
  const movedLines = [...ben.lines]
  movedLines[movingIndex] = movedLines[movingIndex] === 1 ? 0 : 1
  const bian = shapeOf(metaByLines(movedLines))

  const block = hourBlockOf(hourZhi)

  return {
    casting: {
      ben,
      bian,
      movingIndex,
      staticCast: false,
      allMoving: false,
      origin: {
        upperFrom: {
          label: '当日日干',
          gan: dayGan,
          bagua: upper,
          rule: `纳甲：${dayGan} 纳 ${upper}（${BAGUA[upper].image}）`,
        },
        lowerFrom: {
          label: '当下时支',
          gan: '',
          bagua: lower,
          rule: `时支 ${hourZhi}（序 ${zhiIdx + 1}）mod 8 = ${zhiIdx % 8} → ${lower}`,
        },
        movingFrom: {
          label: '时干 + 时支',
          expression: `(${hourGan}=${ganIdx + 1} + ${hourZhi}=${zhiIdx + 1}) mod 6 = ${movingIndex + 1}`,
          index: movingIndex,
        },
      },
      najia: najiaOf(ben),
      yaoWuXing: najiaOf(ben).map(zhiWuXing),
    },
    dateText: `${when.getFullYear()}年${when.getMonth() + 1}月${when.getDate()}日`,
    lunarText: lunar.toString(),
    dayGanZhi: dayGan + dayZhi,
    hourGanZhi: hourGan + hourZhi,
    hourRange: block.range,
    hourZhi,
    note: `当日日柱 ${dayGan}${dayZhi}、当下时柱 ${hourGan}${hourZhi}（${block.range}）`,
  }
}

/** 由三画数值取卦名（bagua.ts 的 bits：bit0 = 初爻） */
function baguaNameByBits(bits: number): BaguaName {
  const found = (Object.keys(BAGUA) as BaguaName[]).find((k) => BAGUA[k].bits === bits)
  if (!found) throw new Error(`未知三画：${bits}`)
  return found
}

function hourBlockOf(zhi: string) {
  const idx = DI_ZHI.indexOf(zhi as (typeof DI_ZHI)[number])
  const startHour = (idx * 2 + 23) % 24
  const endHour = (startHour + 2) % 24
  const pad = (n: number) => String(n).padStart(2, '0')
  return { range: `${pad(startHour)}:00–${pad(endHour)}:00` }
}

export { WUXING_COLOR }
