/**
 * 八卦（八经卦）基础数据。
 *
 * 卦象、卦德（乾健、坤顺、震动、巽入、坎陷、离丽、艮止、兑说）出自《说卦》
 * （周易.OCR.md「乾，健也；坤，顺也……」），方位与四时出自《说卦》「帝出乎震」章。
 *
 * 「纳甲」表见下方 NA_JIA，用于八字→卦的推导（详见 logic/qigua.ts 的说明）。
 */

import type { DiZhi, WuXing } from './ganzhi'

export type BaguaName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤'

export interface Bagua {
  /** 卦名 */
  name: BaguaName
  /** 卦符（自下而上三画，1=阳爻，0=阴爻） */
  symbol: string
  /** 三画二进制，自下而上，如 乾=111、震=100（初爻在下） */
  bits: number
  /** 自然之象（《说卦》） */
  image: string
  /** 卦德（《说卦》） */
  virtue: string
  /** 卦德的行为含义，用于解卦第 3 层 */
  virtueDetail: string
  /** 后天八卦方位（《说卦》「帝出乎震」） */
  direction: string
  /** 四时节气（《说卦》八卦配四时） */
  season: string
  /** 家庭角色（《说卦》「乾道成男，坤道成女」） */
  family: string
  /** 阴阳卦（阳卦：乾震坎艮；阴卦：坤巽离兑），《系辞下》「阳卦大，阴卦小」 */
  yinyang: '阳卦' | '阴卦'
  /** 五行（本项目补充，源书未系统言及） */
  wuxing: WuXing
  /** 纳甲所纳之天干 */
  gan: string
}

/** 八经卦，索引即其二进制值（0..7） */
export const BAGUA: Record<BaguaName, Bagua> = {
  坤: {
    name: '坤', symbol: '☷', bits: 0b000, image: '地', virtue: '顺',
    virtueDetail: '柔顺、承载、包容，顺承天道而时行',
    direction: '西南', season: '夏秋之间', family: '母', yinyang: '阴卦', wuxing: '土', gan: '乙',
  },
  震: {
    name: '震', symbol: '☳', bits: 0b100, image: '雷', virtue: '动',
    virtueDetail: '震动、奋起、惊惧修省，动而免乎险',
    direction: '东', season: '正春', family: '长男', yinyang: '阳卦', wuxing: '木', gan: '庚',
  },
  坎: {
    name: '坎', symbol: '☵', bits: 0b010, image: '水', virtue: '陷',
    virtueDetail: '险陷、劳苦、流动，处险而能守中',
    direction: '北', season: '正冬', family: '中男', yinyang: '阳卦', wuxing: '水', gan: '戊',
  },
  兑: {
    name: '兑', symbol: '☱', bits: 0b110, image: '泽', virtue: '说',
    virtueDetail: '喜悦、和顺、言说，说以先民而民忘其劳',
    direction: '西', season: '正秋', family: '少女', yinyang: '阴卦', wuxing: '金', gan: '丁',
  },
  艮: {
    name: '艮', symbol: '☶', bits: 0b001, image: '山', virtue: '止',
    virtueDetail: '静止、抑止、界限，时止则止、时行则行',
    direction: '东北', season: '冬春之间', family: '少男', yinyang: '阳卦', wuxing: '土', gan: '丙',
  },
  巽: {
    name: '巽', symbol: '☴', bits: 0b011, image: '风', virtue: '入',
    virtueDetail: '进入、顺行、号令，风行无所不入',
    direction: '东南', season: '春末夏初', family: '长女', yinyang: '阴卦', wuxing: '木', gan: '辛',
  },
  离: {
    name: '离', symbol: '☲', bits: 0b101, image: '火', virtue: '丽',
    virtueDetail: '附丽、光明、文明，附于正而化成天下',
    direction: '南', season: '正夏', family: '中女', yinyang: '阴卦', wuxing: '火', gan: '己',
  },
  乾: {
    name: '乾', symbol: '☰', bits: 0b111, image: '天', virtue: '健',
    virtueDetail: '刚健、创造、自强不息，天行健而不息',
    direction: '西北', season: '秋冬之间', family: '父', yinyang: '阳卦', wuxing: '金', gan: '甲',
  },
}

/** 由三画二进制（初爻在最低位）取卦 */
export function baguaByBits(bits: number): Bagua {
  const found = Object.values(BAGUA).find((b) => b.bits === bits)
  if (!found) throw new Error(`未知的三画组合：${bits}`)
  return found
}

/**
 * 纳甲（月体纳甲）天干配卦表。
 *
 * 出处：虞翻月体纳甲说 —— 初三新月见于庚方，故震纳庚；初八上弦月见于丁方，故兑纳丁；
 * 十五望月见于甲方，故乾纳甲；十六月退于辛方，故巽纳辛；二十三下弦月见于丙方，故艮纳丙；
 * 三十日月没于乙方，故坤纳乙；离为日、坎为月，日月居中，故离纳己、坎纳戊。
 *
 * 说明：京房「纳甲」另以地支纳六爻（见 NA_JIA_ZHI），本项目的起卦法用其天干部分，
 * 与「日干定下卦、年干定上卦」的方案对应。
 */
export const GAN_TO_BAGUA: Record<string, BaguaName> = {
  甲: '乾', 乙: '坤', 丙: '艮', 丁: '兑',
  戊: '坎', 己: '离', 庚: '震', 辛: '巽',
  壬: '乾', 癸: '坤',
}

/** 八卦所纳地支（京房纳甲，自初爻至上爻），用于标注爻的地支 */
export const NA_JIA_ZHI: Record<BaguaName, [DiZhi, DiZhi, DiZhi]> = {
  乾: ['子', '寅', '辰'],
  坤: ['未', '巳', '卯'],
  震: ['子', '寅', '辰'],
  巽: ['丑', '亥', '酉'],
  坎: ['寅', '辰', '午'],
  离: ['卯', '丑', '亥'],
  艮: ['辰', '午', '申'],
  兑: ['巳', '卯', '丑'],
}
