/**
 * 八字（四柱）排盘引擎。
 *
 * 历法与节气交由 lunar-typescript 处理（年柱以立春为界、月柱以十二节为界），
 * 本项目只负责把排盘结果整理成界面与起卦所需的形状，并补上五行/十神/藏干等标注。
 *
 * 说明：五行、十神、藏干、纳音、空亡等属子平（四柱）体系，源书《周易》未涉及，
 * 本引擎据通行子平法实现，仅用于给占断提供"日主"与五行背景。
 */

import { Solar } from 'lunar-typescript'
import {
  DI_ZHI,
  GAN_WUXING,
  SHENG,
  KE,
  ZHI_WUXING,
  ZHI_YINYANG,
  GAN_YINYANG,
  shiShen,
  type WuXing,
  type YinYang,
} from '@/data/ganzhi'

export type PillarKey = 'year' | 'month' | 'day' | 'time'

export interface Pillar {
  key: PillarKey
  /** 柱名 */
  label: string
  /** 干支，如「己巳」 */
  ganZhi: string
  gan: string
  zhi: string
  ganWuXing: WuXing
  zhiWuXing: WuXing
  ganYinYang: YinYang
  /** 天干十神（日柱为「日主」） */
  shiShenGan: string
  /** 地支藏干及其十神 */
  hidden: { gan: string; wuxing: WuXing; shiShen: string }[]
  /** 纳音 */
  naYin: string
  /** 旬空（空亡） */
  xunKong: string
  /** 地势（长生十二宫） */
  diShi: string
}

export interface BaziResult {
  /** 输入的公历时刻，如「1990-01-01 12:00」 */
  solarText: string
  /** 农历文本 */
  lunarText: string
  /** 生肖 */
  shengXiao: string
  /** 四柱，年月日时 */
  pillars: Pillar[]
  /** 日主天干 */
  dayMaster: string
  /** 日主五行 */
  dayMasterWuXing: WuXing
  /** 日主阴阳 */
  dayMasterYinYang: YinYang
  /** 五行个数统计 */
  wuxingCount: Record<WuXing, number>
  /** 命宫 / 胎元 */
  mingGong: string
  taiYuan: string
}

export interface BirthInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const HIDDEN_LABEL: Record<PillarKey, (e: any) => string[]> = {
  year: (e) => e.getYearHideGan(),
  month: (e) => e.getMonthHideGan(),
  day: (e) => e.getDayHideGan(),
  time: (e) => e.getTimeHideGan(),
}

const SHI_SHEN_ZHI: Record<PillarKey, (e: any) => string[]> = {
  year: (e) => e.getYearShiShenZhi(),
  month: (e) => e.getMonthShiShenZhi(),
  day: (e) => e.getDayShiShenZhi(),
  time: (e) => e.getTimeShiShenZhi(),
}

const SHI_SHEN_GAN: Record<PillarKey, (e: any) => string> = {
  year: (e) => e.getYearShiShenGan(),
  month: (e) => e.getMonthShiShenGan(),
  day: () => '日主',
  time: (e) => e.getTimeShiShenGan(),
}

const PILLAR_LABEL: Record<PillarKey, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  time: '时柱',
}

/**
 * 排八字。
 * 年柱以立春换年、月柱以十二节换月，均由 lunar-typescript 内部处理，
 * 故年初/月末出生者不会排错柱。
 */
export function computeBazi(input: BirthInput): BaziResult {
  const solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()
  const dayMaster = ec.getDayGan()

  const spec: { key: PillarKey; get: () => { gan: string; zhi: string; naYin: string; xunKong: string; diShi: string } }[] = [
    {
      key: 'year',
      get: () => ({
        gan: ec.getYearGan(), zhi: ec.getYearZhi(), naYin: ec.getYearNaYin(),
        xunKong: ec.getYearXunKong(), diShi: ec.getYearDiShi(),
      }),
    },
    {
      key: 'month',
      get: () => ({
        gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), naYin: ec.getMonthNaYin(),
        xunKong: ec.getMonthXunKong(), diShi: ec.getMonthDiShi(),
      }),
    },
    {
      key: 'day',
      get: () => ({
        gan: ec.getDayGan(), zhi: ec.getDayZhi(), naYin: ec.getDayNaYin(),
        xunKong: ec.getDayXunKong(), diShi: ec.getDayDiShi(),
      }),
    },
    {
      key: 'time',
      get: () => ({
        gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), naYin: ec.getTimeNaYin(),
        xunKong: ec.getTimeXunKong(), diShi: ec.getTimeDiShi(),
      }),
    },
  ]

  const pillars: Pillar[] = spec.map(({ key, get }) => {
    const v = get()
    const hideGans = HIDDEN_LABEL[key](ec)
    const shiShenZhis = SHI_SHEN_ZHI[key](ec)
    return {
      key,
      label: PILLAR_LABEL[key],
      ganZhi: v.gan + v.zhi,
      gan: v.gan,
      zhi: v.zhi,
      ganWuXing: GAN_WUXING[v.gan],
      zhiWuXing: ZHI_WUXING[v.zhi],
      ganYinYang: GAN_YIN_YANG_SAFE(v.gan),
      shiShenGan: key === 'day' ? '日主' : SHI_SHEN_GAN[key](ec),
      hidden: hideGans.map((g, i) => ({
        gan: g,
        wuxing: GAN_WUXING[g],
        shiShen: shiShenZhis[i] ?? shiShen(dayMaster, g),
      })),
      naYin: v.naYin,
      xunKong: v.xunKong,
      diShi: v.diShi,
    }
  })

  const wuxingCount: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of pillars) {
    wuxingCount[p.ganWuXing] += 1
    wuxingCount[p.zhiWuXing] += 1
  }

  return {
    solarText: `${input.year}-${pad(input.month)}-${pad(input.day)} ${pad(input.hour)}:${pad(input.minute)}`,
    lunarText: lunar.toString(),
    shengXiao: lunar.getYearShengXiao(),
    pillars,
    dayMaster,
    dayMasterWuXing: GAN_WUXING[dayMaster],
    dayMasterYinYang: GAN_YIN_YANG_SAFE(dayMaster),
    wuxingCount,
    mingGong: ec.getMingGong(),
    taiYuan: ec.getTaiYuan(),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function GAN_YIN_YANG_SAFE(gan: string): YinYang {
  return GAN_YINYANG[gan] ?? '阳'
}

/** 日主与其他五行的关系（用于判断旺衰倾向的文字描述） */
export function relationToDayMaster(dayMaster: string, other: WuXing): string {
  const me = GAN_WUXING[dayMaster]
  if (me === other) return '同我（比劫）'
  if (SHENG[me] === other) return '我生（食伤）'
  if (KE[me] === other) return '我克（财）'
  if (KE[other] === me) return '克我（官杀）'
  return '生我（印）'
}

/** 地支藏干表（子平通行），用于展示与取用 */
export const ZHI_HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
}

/** 地支对应时辰 */
export function zhiToHourRange(zhi: string): string {
  const idx = DI_ZHI.indexOf(zhi as (typeof DI_ZHI)[number])
  if (idx < 0) return ''
  const start = (idx * 2 + 23) % 24
  const end = (start + 2) % 24
  return `${pad(start)}:00–${pad(end)}:00`
}

/** 十二时辰名称 */
export const SHI_CHEN: Record<string, string> = {
  子: '夜半', 丑: '鸡鸣', 寅: '平旦', 卯: '日出', 辰: '食时', 巳: '隅中',
  午: '日中', 未: '日昳', 申: '晡时', 酉: '日入', 戌: '黄昏', 亥: '人定',
}

// ── 时辰区间 ───────────────────────────────────────────────────────────
// 十二时辰每辰两小时，子时跨夜（23:00–01:00）起算，故时支下标即区间序号，
// 起始钟点为 (下标 × 2 + 23) mod 24。
// 八字按时辰取时柱：同一时辰内排盘结果完全相同，因此让用户选"两小时区间"
// 比填具体钟点更贴合实际精度，也免去"记不清几点几分"的困扰。

export interface HourBlock {
  /** 0..11，对应子..亥 */
  index: number
  /** 时支，如「巳」 */
  zhi: string
  /** 时支在时辰中的别称，如「隅中」 */
  name: string
  /** 起始小时（0–23） */
  startHour: number
  /** 结束小时（0–23） */
  endHour: number
  /** 区间文本，如「09:00–11:00」 */
  range: string
  /** 下拉选项标签，如「09:00–11:00 巳时（隅中）」 */
  label: string
}

/** 十二个时辰区间，自子时起 */
export const HOUR_BLOCKS: HourBlock[] = DI_ZHI.map((zhi, i) => {
  const startHour = (i * 2 + 23) % 24
  const endHour = (startHour + 2) % 24
  const range = `${pad(startHour)}:00–${pad(endHour)}:00`
  return {
    index: i,
    zhi,
    name: SHI_CHEN[zhi],
    startHour,
    endHour,
    range,
    label: `${range} ${zhi}时（${SHI_CHEN[zhi]}）`,
  }
})

/** 由钟点（0–23）取所属时辰区间 */
export function blockByHour(hour: number): HourBlock {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  // 子时自 23 点起，故先 +1 再折半
  return HOUR_BLOCKS[Math.floor(((h + 1) % 24) / 2)]
}

/** 由区间序号取起点钟点（用于表单回填） */
export function hourOfBlock(index: number): number {
  return HOUR_BLOCKS[((index % 12) + 12) % 12].startHour
}
