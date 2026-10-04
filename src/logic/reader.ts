/**
 * 解卦引擎：按《周易》源书整理的十一层次序，把一次起卦的结果解读成结构化文本。
 *
 * 层次（对应《从起卦到解卦》梳理）：
 *  1 卦辞（彖辞）        2 彖传：一卦之时义      3 卦象与卦德
 *  4 大象传（君子以…）   5 卦主                  6 动爻
 *  7 动爻定位（当位/中/比承乘/应/世应）            8 爻辞与判词
 *  9 变卦（之正）       10 世应六亲               11 还归于人：避凶趋吉
 *
 * 源书依据：《系辞上》"知者观其彖辞，则思过半矣"、"吉凶者，言乎其失得也"、
 * "吉凶悔吝者，生乎动者也"；《读〈易〉需要了解的一些基本术语》"中正比应""世应""卦主""卦德"。
 */

import { YIJING_BY_ID, type YijingHexagram, type YijingYao } from '@/data/yijing.generated'
import { BAGUA, type BaguaName } from '@/data/bagua'
import type { HexagramShape } from '@/data/hexagrams'
import {
  castFromBazi,
  liuQin,
  liuShenStart,
  LIU_SHEN,
  najiaOf,
  palaceOf,
  palaceWuXing,
  yaoTitle,
  type Casting,
} from './qigua'
import type { BaziResult } from './bazi'
import type { WuXing } from '@/data/ganzhi'

const POS_NAME = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const POS_MEANING = [
  '事物之始，象"潜藏待时"，本末未明',
  '下卦之中，居臣民位，柔中则多誉',
  '下卦之偏，刚健自主，故"三多凶"',
  '上卦之下，近君之位，故"四多惧"',
  '上卦之中，居君位，中正则多功',
  '一卦之终，象事物之结局，过极则变',
]

export interface YaoReading {
  /** 0..5 */
  index: number
  /** 爻题，如「九四」 */
  title: string
  /** 爻辞原文 */
  text: string
  /** 阴阳 */
  yin: boolean
  /** 是否当位（阳居阳位、阴居阴位） */
  zheng: boolean
  /** 是否得中（二、五） */
  zhong: boolean
  /** 是否动爻 */
  moving: boolean
  /** 是否世爻 / 应爻 */
  shi: boolean
  ying: boolean
  /** 与应爻是否阴阳相应 */
  youYing: boolean
  /** 纳甲地支 */
  naZhi: string
  /** 六亲 */
  liuQin: string
  /** 六神 */
  liuShen: string
  /** 与邻爻的承乘关系描述 */
  chengCheng: string
  /** 位置说明 */
  posNote: string
}

export interface ReadingSection {
  /** 层次标题 */
  title: string
  /** 源书依据或说明 */
  basis?: string
  /** 正文段落 */
  paragraphs: string[]
  /** 需要突出显示的原文（可空） */
  quote?: string
}

export interface Reading {
  text: YijingHexagram
  /** 十一层 */
  sections: ReadingSection[]
  /** 六爻明细 */
  yaos: YaoReading[]
  /** 综合结论（吉凶悔吝的取舍） */
  verdict: string
  /** 动爻爻辞（无动爻则为空） */
  movingText: string
  /** 是否宜行 */
  advice: string[]
  /** 宫与世应 */
  palace: { palace: BaguaName; type: string; wuxing: WuXing; shiIndex: number; yingIndex: number }
}

function zhengOf(lines: number[], i: number): boolean {
  // 初、三、五为阳位（奇），二、四、上为阴位（偶）
  const yangPos = i % 2 === 0
  return yangPos ? lines[i] === 1 : lines[i] === 0
}

function allZheng(lines: number[]): boolean {
  return lines.every((_, i) => zhengOf(lines, i))
}

export function buildReading(c: Casting, bazi: BaziResult): Reading {
  const text = YIJING_BY_ID.get(c.ben.meta.number)
  if (!text) throw new Error(`语料缺该卦：${c.ben.meta.name}`)

  const palace = palaceOf(c.ben.meta)
  const najia = najiaOf(c.ben)
  const shen0 = liuShenStart(bazi.pillars[2].gan)

  const yaos: YaoReading[] = c.ben.lines.map((v, i) => {
    const zheng = zhengOf(c.ben.lines, i)
    const shi = i === palace.shiIndex
    const ying = i === palace.yingIndex
    const other = i < 3 ? i + 3 : i - 3
    const youYing = c.ben.lines[i] !== c.ben.lines[other]
    // 承乘：阴在阳下曰承（吉），阴在阳上曰乘（不吉）
    let chengCheng = '—'
    const below = i > 0 ? c.ben.lines[i - 1] : null
    const above = i < 5 ? c.ben.lines[i + 1] : null
    const self = c.ben.lines[i]
    const parts: string[] = []
    if (below !== null && self === 0 && below === 1) parts.push('下承阳（顺）')
    if (below !== null && self === 1 && below === 0) parts.push('下乘阴（顺）')
    if (above !== null && self === 0 && above === 1) parts.push('上承阳（顺）')
    if (above !== null && self === 1 && above === 0) parts.push('上乘阴（顺）')
    if (below !== null && self === 1 && below === 1) parts.push('下比阳（同刚）')
    if (above !== null && self === 0 && above === 0) parts.push('上比阴（同柔）')
    if (parts.length) chengCheng = parts.join('、')

    return {
      index: i,
      title: yaoTitle(c.ben.lines, i),
      text: text.yaoCi[i]?.text ?? '',
      yin: v === 0,
      zheng,
      zhong: i === 1 || i === 4,
      moving: i === c.movingIndex,
      shi,
      ying,
      youYing,
      naZhi: najia[i],
      liuQin: liuQin(palace.palace, c.yaoWuXing[i]),
      liuShen: LIU_SHEN[(shen0 + i) % 6],
      chengCheng,
      posNote: POS_MEANING[i],
    }
  })

  const moving = c.movingIndex >= 0 ? yaos[c.movingIndex] : null
  const movingText = moving?.text ?? ''
  const guaCiQuote = text.guaCi

  // 变卦：是否"六爻皆正而有应"（古法"之正"的完成态）
  let bianNote = ''
  if (c.bian) {
    const bianAllZheng = allZheng(c.bian.lines)
    const bianAllYing = c.bian.lines.every((_, i) => {
      const o = i < 3 ? i + 3 : i - 3
      return c.bian!.lines[i] !== c.bian!.lines[o]
    })
    const bianText = YIJING_BY_ID.get(c.bian.meta.number)
    bianNote = bianAllZheng
      ? `变卦《${c.bian.meta.name}》六爻皆当位${bianAllYing ? '而有应' : ''}——源书所谓"变正则悔亡、无咎"，故此卦纵有悔吝，亦可通过"变"来化解。`
      : `变卦《${c.bian.meta.name}》尚未六爻皆正，说明转机存在但未完成，须持续调整方能"之正"。`
    if (bianText) bianNote += ` 之卦卦辞：${bianText.guaCi}`
  } else {
    bianNote = '六爻皆不动，依古法"以卦辞断事"，只就本卦卦辞与卦德取义，不涉之卦。'
  }

  // 用九 / 用六：仅《乾》《坤》之特例（源书《乾》"用九"注：《乾》六爻皆九则以"用九"断事）
  let yongNote = ''
  if (c.ben.meta.number === 1 && c.staticCast === false && c.allMoving) {
    yongNote = '《乾》六爻皆九，六爻皆变而为《坤》，依古筮法当以"用九"断事：见群龙无首，吉。'
  } else if (c.ben.meta.number === 2 && c.staticCast === false && c.allMoving) {
    yongNote = '《坤》六爻皆六，六爻皆变而为《乾》，依古筮法当以"用六"断事：利永贞。'
  } else if (c.ben.meta.number === 1 && c.staticCast) {
    yongNote = '《乾》六爻皆七（不变），依古筮法以卦辞断事。'
  } else if (c.ben.meta.number === 2 && c.staticCast) {
    yongNote = '《坤》六爻皆八（不变），依古筮法以卦辞断事。'
  }

  const sections: ReadingSection[] = [
    {
      title: '第一步 · 定问',
      basis: '《蒙》"初筮告，再三渎，渎则不告"',
      paragraphs: [
        `所问之事以一次诚心起卦为准，反复追问即是亵渎。本次以 ${bazi.solarText} 出生的四柱为据，日主 ${bazi.dayMaster}${bazi.dayMasterWuXing}。`,
        '世爻代表占问者本人，应爻象征所问之事、人、时、地、物——下文"世应"一步会指出它们的具体位置。',
      ],
    },
    {
      title: '第二步 · 卦辞（彖辞）',
      basis: '《系辞下》"知者观其彖辞，则思过半矣"',
      paragraphs: [
        `本卦《${c.ben.meta.name}》（第 ${c.ben.meta.number} 卦，${c.ben.fullName}）：${guaCiQuote}`,
      ],
      quote: guaCiQuote,
    },
    {
      title: '第三步 · 彖传：一卦之时义',
      basis: '《系辞》"变通者，趣时者也"；解卦须先看一卦之"时"',
      paragraphs: [
        `《彖》曰：${text.tuanZhuan}`,
        '读彖传要在抓住"时"字：同一道理，时机不同则吉凶不同。若传中有"××之时大矣哉"，即为一卦的着眼处。',
      ],
    },
    {
      title: '第四步 · 卦象与卦德',
      basis: '《说卦》"乾，健也；坤，顺也；震，动也；巽，入也；坎，陷也；离，丽也；艮，止也；兑，说也"',
      paragraphs: [
        `本卦下卦为${c.ben.lower.name}（${c.ben.lower.image}），卦德"${c.ben.lower.virtue}"——${c.ben.lower.virtueDetail}；上卦为${c.ben.upper.name}（${c.ben.upper.image}），卦德"${c.ben.upper.virtue}"——${c.ben.upper.virtueDetail}。`,
        `合而观之，是"内${c.ben.lower.virtue}而外${c.ben.upper.virtue}"之象：${c.ben.upper.image}在上、${c.ben.lower.image}在下，事情的态势即由此二者的相互关系推出。`,
        `八宫归属：《${c.ben.meta.name}》属${palace.palace}宫（${palace.type}），宫之五行为${palaceWuXing(palace.palace)}。`,
      ],
    },
    {
      title: '第五步 · 大象传：落到"君子以…"',
      basis: '《象》释卦象者六十四则，给出的是行为准则',
      paragraphs: [
        `《象》曰：${text.xiangZhuan}`,
        '这一步把占问从"结果预测"转为"当下该怎么做"：卦辞言吉凶，大象言修身。',
      ],
      quote: text.xiangZhuan,
    },
    {
      title: '第六步 · 卦主',
      basis: '卦主有两义：成卦之主、意义之主；"多以二、五爻为主"',
      paragraphs: [
        `本卦${c.ben.lower.name === c.ben.upper.name ? '为八纯卦，上下同体，' : ''}意义之主一般在二、五两爻。本卦二爻为${yaos[1].title}（${yaos[1].zheng ? '当位' : '失位'}${yaos[1].zhong ? '、得中' : ''}），五爻为${yaos[4].title}（${yaos[4].zheng ? '当位' : '失位'}${yaos[4].zhong ? '、得中' : ''}）。`,
        `世爻在${POS_NAME[palace.shiIndex]}（${yaos[palace.shiIndex].title}），为"一卦之主"，代表占问者本人；应爻在${POS_NAME[palace.yingIndex]}（${yaos[palace.yingIndex].title}），象征所问之事。`,
      ],
    },
    {
      title: '第七步 · 动爻',
      basis: '《系辞》"吉凶悔吝者，生乎动者也"；"以变动之爻的爻辞来判断吉凶"',
      paragraphs: [
        moving
          ? `本次动爻为第 ${c.movingIndex + 1} 爻（${moving.title}）：${movingText}`
          : '本次六爻皆不动。依古法，六爻皆静则以卦辞断事。',
        yongNote,
      ].filter(Boolean),
      quote: movingText || undefined,
    },
    {
      title: '第八步 · 动爻定位（当位 · 中 · 比承乘 · 应）',
      basis: '《系辞下》"二多誉，四多惧…三多凶，五多功"；古法"中正比应"',
      paragraphs: moving
        ? [
            `${moving.title}：${moving.zheng ? '当位（阳居阳位、阴居阴位），象遵循正道，多吉或无咎' : '不当位（失位），象悖逆正道，多凶、吝、悔；但可"变得正"'}。`,
            moving.zhong
              ? '居上下卦之中，"其卦气最为纯粹"，为一卦中最重要之位。'
              : `不居二、五，故不得"中"。${moving.posNote}。`,
            `与应爻${moving.youYing ? '一阴一阳，故"相应"，事情有呼应、有着落' : '俱阴或俱阳，为"敌应"，象无人接应、着力无处'}。`,
            `比的关系：${moving.chengCheng}。按古法"比以阳上而阴下为宜"，阴承阳多吉，阴乘阳多不吉。`,
            `纳甲：${moving.naZhi}（${c.yaoWuXing[moving.index]}），六亲为${moving.liuQin}，六神为${moving.liuShen}。`,
          ]
        : [
            '六爻皆静，无须定位动爻；但仍可看二、五两爻的当位与得中，以定一卦之平顺程度。',
            `二爻${yaos[1].title}${yaos[1].zheng ? '当位' : '失位'}${yaos[1].zhong ? '、得中' : ''}；五爻${yaos[4].title}${yaos[4].zheng ? '当位' : '失位'}${yaos[4].zhong ? '、得中' : ''}。`,
          ],
    },
    {
      title: '第九步 · 判词：吉凶悔吝怎么读',
      basis: '《系辞上》"吉凶者，言乎其失得也；悔吝者，言乎其小疵也。无咎者，善补过也"',
      paragraphs: [
        `动爻辞中的判词按源书通例解读：吉凶＝得失（当位则得、失位则失）；悔吝＝小疵，尚可补救；无咎＝善于补过；贞＝守正则胜。`,
        `本卦动爻${moving ? (moving.zheng ? '当位' : '失位') : '（无动爻）'}，故其判词分量应结合"当位否、得中否、有应否"三者同看，而非孤立取字面。`,
      ],
    },
    {
      title: '第十步 · 变卦（之正）',
      basis: '源书"之正"说：本有其悔，变正则无悔；本有其咎，变正则无咎',
      paragraphs: [
        c.bian
          ? `动爻 ${moving?.title} 阴阳既变，本卦《${c.ben.meta.name}》即成之卦《${c.bian.meta.name}》（${c.bian.fullName}）。`
          : '无动爻，故无之卦。',
        bianNote,
      ],
    },
    {
      title: '第十一步 · 还归于人：避凶趋吉',
      basis: '《系辞上》"居则观其象而玩其辞，动则观其变而玩其占"',
      paragraphs: [
        '源书反复申明：占筮不是宿命，而是劝善惩恶、避凶趋吉。故解卦的落点是"当下该怎么做"，而非"结果一定如何"。',
        '《系辞》评析亦引荀子"善为《易》者不占"、武王伐纣占得"大凶"而太公视为"枯骨朽木"——占辞终究服从于人事判断。',
      ],
    },
  ]

  // 综合结论
  const zhengCount = yaos.filter((y) => y.zheng).length
  const verdictParts: string[] = []
  verdictParts.push(
    `本卦《${c.ben.meta.name}》，${zhengCount} 爻当位、${6 - zhengCount} 爻失位`,
  )
  if (moving) {
    verdictParts.push(
      `动爻${moving.title}${moving.zheng ? '当位' : '失位'}${moving.zhong ? '、得中' : ''}，${moving.youYing ? '有应' : '无应（敌应）'}`,
    )
  } else {
    verdictParts.push('六爻皆静，以卦辞断')
  }
  if (c.bian) verdictParts.push(`之卦《${c.bian.meta.name}》`)
  const verdict = verdictParts.join('；') + '。'

  // 落地建议（据卦德与动爻位置综合，属本项目的应用性延伸）
  const advice: string[] = []
  advice.push(`取"内${c.ben.lower.virtue}外${c.ben.upper.virtue}"之象：先安内（${c.ben.lower.virtueDetail.split('，')[0]}），再向外（${c.ben.upper.virtueDetail.split('，')[0]}）。`)
  if (moving) {
    advice.push(
      moving.zheng
        ? `动爻当位，宜守正而行，"贞"字是本次的关键。`
        : `动爻失位，宜先"之正"——调整自身位置与做法，再谈进取。`,
    )
    if (!moving.youYing) advice.push('动爻无应（敌应），事情的回应可能迟缓或缺人接应，宜自备后手，不宜孤军深入。')
  } else {
    advice.push('六爻皆静，局面稳定，宜守不宜攻；重点在卦辞与大象所示的行为准则。')
  }
  if (c.bian) advice.push(`留意之卦《${c.bian.meta.name}》所示方向，那是事情的下一阶段形态。`)
  advice.push('《蒙》曰"初筮告，再三渎"：一事一占，得卦后重在践行，不宜反复起卦求证。')

  return {
    text,
    sections,
    yaos,
    verdict,
    movingText,
    advice,
    palace: {
      palace: palace.palace,
      type: palace.type,
      wuxing: palaceWuXing(palace.palace),
      shiIndex: palace.shiIndex,
      yingIndex: palace.yingIndex,
    },
  }
}

/** 便捷：由八字直接得到"起卦 + 解卦"的完整结果 */
export function divine(bazi: BaziResult) {
  const casting = castFromBazi(bazi)
  return { casting, reading: buildReading(casting, bazi) }
}
