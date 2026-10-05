/**
 * 六十四卦的形状工具：由 yijing.generated.ts 的语料派生，不再手工维护爻画。
 *
 * 爻画约定：语料 `guaXiang` 为六位字符串，**左起即初爻**（1 阳 / 0 阴）。
 * `bits` 是其数值形式（bit5 = 初爻），与 guaXiang 一一对应。
 */

import { baguaByLines, type Bagua } from './bagua'
import {
  YIJING,
  YIJING_BY_ID,
  YIJING_BY_NAME,
  type YijingHexagram,
} from './yijing.generated'

export interface HexagramMeta {
  /** 卦序 1-64 */
  number: number
  /** 卦名 */
  name: string
  /** 六位爻画字符串，左起即初爻 */
  guaXiang: string
  /** 爻画数值：bit5 = 初爻 */
  bits: number
}

export interface HexagramShape {
  /** 语料原始记录 */
  data: YijingHexagram
  meta: HexagramMeta
  /** 六爻，自初爻至上爻：1 = 阳爻，0 = 阴爻 */
  lines: number[]
  /** 下卦（内卦） */
  lower: Bagua
  /** 上卦（外卦） */
  upper: Bagua
  /** 卦全名，如「水雷屯」 */
  fullName: string
}

/** 六十四卦的元数据（由语料派生，保证与爻画一致） */
export const HEXAGRAM_META: HexagramMeta[] = YIJING.map((h) => ({
  number: h.id,
  name: h.name,
  guaXiang: h.guaXiang,
  bits: h.bits,
}))

const META_BY_NUMBER = new Map(HEXAGRAM_META.map((m) => [m.number, m]))
const META_BY_NAME = new Map(HEXAGRAM_META.map((m) => [m.name, m]))
const META_BY_BITS = new Map(HEXAGRAM_META.map((m) => [m.bits, m]))

if (META_BY_BITS.size !== 64) {
  throw new Error(`六十四卦爻画存在重复：仅 ${META_BY_BITS.size} 个唯一组合`)
}

export function metaByNumber(n: number): HexagramMeta {
  const m = META_BY_NUMBER.get(n)
  if (!m) throw new Error(`未知卦序：${n}`)
  return m
}

export function metaByName(name: string): HexagramMeta {
  const m = META_BY_NAME.get(name)
  if (!m) throw new Error(`未知卦名：${name}`)
  return m
}

export function metaByBits(bits: number): HexagramMeta {
  const m = META_BY_BITS.get(bits & 0b111111)
  if (!m) throw new Error(`未知爻画：${bits.toString(2)}`)
  return m
}

/** 由爻画（六位数组，自初爻至上爻，1 = 阳、0 = 阴）取卦 */
export function metaByLines(lines: number[]): HexagramMeta {
  const guaXiang = lines.map((v) => (v ? '1' : '0')).join('')
  const m = HEXAGRAM_META.find((h) => h.guaXiang === guaXiang)
  if (!m) throw new Error(`未知爻画组合：${guaXiang}`)
  return m
}

function baguaOf(three: string): Bagua {
  // three 左起即初爻，与 bagua.ts 的 lines 同序，直接查表
  return baguaByLines(three)
}

export function shapeOf(meta: HexagramMeta): HexagramShape {
  const data = YIJING_BY_ID.get(meta.number)
  if (!data) throw new Error(`语料缺少第 ${meta.number} 卦`)
  const lines = data.guaXiang.split('').map((c) => (c === '1' ? 1 : 0))
  const lower = baguaOf(data.guaXiang.slice(0, 3))
  const upper = baguaOf(data.guaXiang.slice(3, 6))
  return { data, meta, lines, lower, upper, fullName: data.fullName }
}

export function shapeByNumber(n: number): HexagramShape {
  return shapeOf(metaByNumber(n))
}

export function shapeByName(name: string): HexagramShape {
  return shapeOf(metaByName(name))
}

export { YIJING, YIJING_BY_ID, YIJING_BY_NAME }
export type { YijingHexagram }
