/**
 * 天干地支、五行、十神等基础数据。
 * 五行/生克/十神为本项目自建（源书未涉），八卦与纳甲部分见 bagua.ts。
 */

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export type TianGan = (typeof TIAN_GAN)[number]
export type DiZhi = (typeof DI_ZHI)[number]
export type WuXing = '木' | '火' | '土' | '金' | '水'
export type YinYang = '阳' | '阴'
export type ShiShen =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '偏财'
  | '正财'
  | '七杀'
  | '正官'
  | '偏印'
  | '正印'

/** 天干 → 五行 */
export const GAN_WUXING: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

/** 天干 → 阴阳 */
export const GAN_YINYANG: Record<string, YinYang> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
}

/** 地支 → 五行 */
export const ZHI_WUXING: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

/** 地支 → 阴阳（以序数奇偶定，子为阳） */
export const ZHI_YINYANG: Record<string, YinYang> = Object.fromEntries(
  DI_ZHI.map((z, i) => [z, i % 2 === 0 ? '阳' : '阴']),
) as Record<string, YinYang>

/** 五行相生：木→火→土→金→水→木 */
export const SHENG: Record<WuXing, WuXing> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
}

/** 五行相克：木克土、土克水、水克火、火克金、金克木 */
export const KE: Record<WuXing, WuXing> = {
  木: '土', 土: '水', 水: '火', 火: '金', 金: '木',
}

/** 地支六合 */
export const ZHI_LIU_HE: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌',
  戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

/** 地支六冲 */
export const ZHI_LIU_CHONG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}

/** 三合局 */
export const ZHI_SAN_HE: { zhis: string[]; wuxing: WuXing }[] = [
  { zhis: ['申', '子', '辰'], wuxing: '水' },
  { zhis: ['亥', '卯', '未'], wuxing: '木' },
  { zhis: ['寅', '午', '戌'], wuxing: '火' },
  { zhis: ['巳', '酉', '丑'], wuxing: '金' },
]

/**
 * 十神：以日干为主体，看另一天干与它的生克与阴阳异同。
 * 同我：比肩（同阴阳）/ 劫财（异阴阳）
 * 我生：食神（同）/ 伤官（异）
 * 我克：偏财（同）/ 正财（异）
 * 克我：七杀（同）/ 正官（异）
 * 生我：偏印（同）/ 正印（异）
 */
export function shiShen(dayGan: string, other: string): ShiShen {
  const me = GAN_WUXING[dayGan]
  const it = GAN_WUXING[other]
  const same = GAN_YINYANG[dayGan] === GAN_YINYANG[other]
  if (me === it) return same ? '比肩' : '劫财'
  if (SHENG[me] === it) return same ? '食神' : '伤官'
  if (KE[me] === it) return same ? '偏财' : '正财'
  if (KE[it] === me) return same ? '七杀' : '正官'
  return same ? '偏印' : '正印'
}

/** 十神简称，用于表格紧凑显示 */
export const SHI_SHEN_SHORT: Record<ShiShen, string> = {
  比肩: '比', 劫财: '劫', 食神: '食', 伤官: '伤',
  偏财: '才', 正财: '财', 七杀: '杀', 正官: '官',
  偏印: '枭', 正印: '印',
}

/** 五行 → 主题色（用于界面着色） */
export const WUXING_COLOR: Record<WuXing, string> = {
  木: '#3f9c6d',
  火: '#c8503c',
  土: '#a8823c',
  金: '#8a8f98',
  水: '#3a6ea5',
}
