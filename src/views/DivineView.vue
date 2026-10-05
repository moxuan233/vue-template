<script setup lang="ts">
/**
 * 起卦页：
 *  一、八字起卦（输入生辰 → 排四柱 → 起卦 → 解卦）
 *  二、每日之卦（无须生辰，由当日日柱与当下时柱推卦，每天/每时辰自动更新）
 *  三、解卦结果下方附「大白话版」小结
 */
import { computed, onMounted, reactive, ref } from 'vue'
import {
  blockByHour,
  computeBazi,
  HOUR_BLOCKS,
  hourOfBlock,
  SHI_CHEN,
  zhiToHourRange,
  type BaziResult,
} from '@/logic/bazi'
import {
  castByDay,
  castByDayan,
  castFromBazi,
  castFromValues,
  palaceOf,
  type Casting,
  type DayCast,
} from '@/logic/qigua'
import { buildPlainTalk, buildReading, type PlainTalk, type Reading } from '@/logic/reader'
import { WUXING_COLOR, ZHI_LIU_CHONG, ZHI_LIU_HE } from '@/data/ganzhi'
import GuaDiagram from '@/components/GuaDiagram.vue'

const now = new Date()
const form = reactive({
  year: 1990,
  month: 1,
  day: 1,
  /** 时辰区间序号 0..11（子..亥） */
  blockIndex: blockByHour(12).index,
  question: '',
})

const bazi = ref<BaziResult | null>(null)
const casting = ref<Casting | null>(null)
const reading = ref<Reading | null>(null)
const plain = ref<PlainTalk | null>(null)
const error = ref('')
const showAllLayers = ref(false)
const activeLayer = ref<number | null>(null)

/** 每日之卦 */
const dayCast = ref<DayCast | null>(null)
const dayReading = ref<Reading | null>(null)
const dayPlain = ref<PlainTalk | null>(null)
const dayError = ref('')

function loadDayCast() {
  dayError.value = ''
  try {
    const dc = castByDay(new Date())
    dayCast.value = dc
    dayReading.value = buildReading(
      dc.casting,
      null,
      `${dc.dateText}　${dc.note}`,
    )
    dayPlain.value = buildPlainTalk(dayReading.value, dc.casting)
  } catch (e) {
    dayError.value = e instanceof Error ? e.message : String(e)
    dayCast.value = null
    dayReading.value = null
    dayPlain.value = null
  }
}

onMounted(loadDayCast)

function run() {
  error.value = ''
  try {
    const b = computeBazi({
      year: form.year,
      month: form.month,
      day: form.day,
      hour: hourOfBlock(form.blockIndex),
      minute: 0,
    })
    bazi.value = b
    const c = castFromBazi(b)
    casting.value = c
    reading.value = buildReading(c, b)
    plain.value = buildPlainTalk(reading.value, c)
    activeLayer.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    bazi.value = null
    casting.value = null
    reading.value = null
    plain.value = null
  }
}

/** 按源书原法（大衍筮法）起卦，用于对照 */
function runDayan() {
  error.value = ''
  try {
    const b = computeBazi({
      year: form.year,
      month: form.month,
      day: form.day,
      hour: hourOfBlock(form.blockIndex),
      minute: 0,
    })
    bazi.value = b
    const { values } = castByDayan()
    const c = castFromValues(values)
    casting.value = c
    reading.value = buildReading(c, b)
    plain.value = buildPlainTalk(reading.value, c)
    activeLayer.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function reset() {
  bazi.value = null
  casting.value = null
  reading.value = null
  plain.value = null
  error.value = ''
}

const yaos = computed(() => reading.value?.yaos ?? [])

/** 变卦的世应位置（八宫归属随之改变，故单独取） */
const bianInfo = computed(() => {
  const bian = casting.value?.bian
  if (!bian) return { shi: -1, ying: -1 }
  const p = palaceOf(bian.meta)
  return { shi: p.shiIndex, ying: p.yingIndex }
})

/** 动爻对应的小象与判词摘要 */
const movingYao = computed(() => yaos.value.find((y) => y.moving) ?? null)

/** 日主与其他地支的合冲提示 */
const zhiRelations = computed(() => {
  if (!bazi.value) return []
  const zhis = bazi.value.pillars.map((p) => p.zhi)
  const out: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      if (ZHI_LIU_HE[zhis[i]] === zhis[j]) out.push(`${zhis[i]}${zhis[j]}相合`)
      if (ZHI_LIU_CHONG[zhis[i]] === zhis[j]) out.push(`${zhis[i]}${zhis[j]}相冲`)
    }
  }
  return out
})

/** 每日之卦的世应 */
const dayBianInfo = computed(() => {
  const bian = dayCast.value?.casting.bian
  if (!bian) return { shi: -1, ying: -1 }
  const p = palaceOf(bian.meta)
  return { shi: p.shiIndex, ying: p.yingIndex }
})
const dayYaos = computed(() => dayReading.value?.yaos ?? [])
</script>

<template>
  <div class="page">
    <section class="panel">
      <header class="panel-head">
        <h1>八字起卦 · 解卦</h1>
        <p class="lead">
          输入生辰，排出四柱，依"年干定上卦、日干定下卦、日干与时支定动爻"起卦，
          再按《周易》源书整理的十一步次序解卦。
        </p>
      </header>

      <div class="form">
        <label class="field">
          <span>出生年</span>
          <input v-model.number="form.year" type="number" min="1900" max="2100" />
        </label>
        <label class="field">
          <span>月</span>
          <input v-model.number="form.month" type="number" min="1" max="12" />
        </label>
        <label class="field">
          <span>日</span>
          <input v-model.number="form.day" type="number" min="1" max="31" />
        </label>
        <label class="field">
          <span>出生时辰（两小时区间）</span>
          <select v-model.number="form.blockIndex">
            <option v-for="b in HOUR_BLOCKS" :key="b.index" :value="b.index">
              {{ b.label }}
            </option>
          </select>
        </label>
        <label class="field wide">
          <span>所问何事（可不填，仅作记录）</span>
          <input v-model="form.question" type="text" placeholder="如：今年是否宜换工作" />
        </label>
      </div>

      <div class="actions">
        <button class="btn primary" @click="run">起卦解卦</button>
        <button class="btn" @click="runDayan">改用大衍筮法（源书原法）</button>
        <button v-if="bazi" class="btn ghost" @click="reset">清空</button>
      </div>
      <p class="hint">
        公历生日。时辰按传统十二时辰分档（每档两小时，子时跨夜 23:00–01:00）——
        八字按时辰取时柱，同一时辰内排盘结果相同，故选区间比填具体钟点更贴合实际。
        年柱以立春换年、月柱以十二节换月，由历法库自动处理。
      </p>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <!-- 每日之卦：无须生辰，随日期自动更新 -->
    <section class="panel day-panel">
      <div class="panel-head row">
        <h2>每日之卦</h2>
        <button class="btn ghost small" @click="loadDayCast">刷新</button>
      </div>
      <p v-if="dayError" class="err">{{ dayError }}</p>
      <template v-else-if="dayCast && dayReading && dayPlain">
        <div class="day-meta">
          <span class="day-date">{{ dayCast.dateText }}</span>
          <span>{{ dayCast.lunarText }}</span>
          <span class="chip">日柱 {{ dayCast.dayGanZhi }}</span>
          <span class="chip">时柱 {{ dayCast.hourGanZhi }}</span>
          <span class="chip">{{ dayCast.hourRange }}</span>
        </div>

        <div class="day-body">
          <GuaDiagram
            :ben="dayCast.casting.ben"
            :bian="dayCast.casting.bian"
            :yaos="dayYaos"
            :bian-shi="dayBianInfo.shi"
            :bian-ying="dayBianInfo.ying"
          />
          <div class="day-plain">
            <p class="onel"><b>一句话</b>{{ dayPlain.oneLine }}</p>
            <p><b>关键提醒</b>{{ dayPlain.keyPoint }}</p>
            <p><b>走向</b>{{ dayPlain.trend }}</p>
          </div>
        </div>

        <details class="day-more">
          <summary>看这一卦的完整十一步解卦</summary>
          <ol class="layers compact">
            <li v-for="(s, i) in dayReading.sections" :key="i" class="layer">
              <div class="layer-body static">
                <p class="layer-sub">{{ s.title }}</p>
                <p v-if="s.basis" class="basis">依据：{{ s.basis }}</p>
                <blockquote v-if="s.quote" class="quote">{{ s.quote }}</blockquote>
                <p v-for="(t, j) in s.paragraphs" :key="j">{{ t }}</p>
              </div>
            </li>
          </ol>
        </details>

        <p class="hint">
          推法：上卦 ← 当日日干（纳甲）；下卦 ← 当下时支序 mod 8；动爻 ← (时干序 + 时支序) mod 6。
          与八字起卦同一结构，只是把"年柱"换成"日柱"。同一时辰内结果一致，换时辰或换日子自动变化。
        </p>
      </template>
    </section>

    <template v-if="bazi && casting && reading">
      <!-- 四柱 -->
      <section class="panel">
        <h2>一、四柱排盘</h2>
        <div class="meta-line">
          <span>公历 {{ bazi.solarText }}</span>
          <span>农历 {{ bazi.lunarText }}</span>
          <span>生肖 {{ bazi.shengXiao }}</span>
          <span>命宫 {{ bazi.mingGong }}</span>
          <span>胎元 {{ bazi.taiYuan }}</span>
        </div>
        <div class="pillars">
          <div v-for="p in bazi.pillars" :key="p.key" class="pillar" :class="{ day: p.key === 'day' }">
            <div class="p-label">{{ p.label }}</div>
            <div class="p-gan" :style="{ color: WUXING_COLOR[p.ganWuXing] }">
              {{ p.gan }}<em>{{ p.shiShenGan }}</em>
            </div>
            <div class="p-zhi" :style="{ color: WUXING_COLOR[p.zhiWuXing] }">
              {{ p.zhi }}
            </div>
            <div class="p-sub">{{ p.ganWuXing }}{{ p.zhiWuXing }} · {{ p.naYin }}</div>
            <div class="p-sub">空亡 {{ p.xunKong }} · {{ p.diShi }}</div>
            <div class="p-hidden">
              <span v-for="h in p.hidden" :key="h.gan" :style="{ color: WUXING_COLOR[h.wuxing] }">
                {{ h.gan }}<em>{{ h.shiShen }}</em>
              </span>
            </div>
            <div v-if="p.key === 'time'" class="p-sub">
              {{ SHI_CHEN[p.zhi] }} {{ zhiToHourRange(p.zhi) }}
            </div>
          </div>
        </div>

        <div class="wuxing-bar">
          <span class="wb-title">五行分布</span>
          <span
            v-for="(n, k) in bazi.wuxingCount"
            :key="k"
            class="wb-item"
            :style="{ color: WUXING_COLOR[k as keyof typeof WUXING_COLOR] }"
          >
            {{ k }} {{ n }}
          </span>
          <span class="wb-note">
            日主 {{ bazi.dayMaster }}（{{ bazi.dayMasterWuXing }}·{{ bazi.dayMasterYinYang }}）
          </span>
        </div>
        <div v-if="zhiRelations.length" class="meta-line">
          <span v-for="r in zhiRelations" :key="r" class="chip">{{ r }}</span>
        </div>
      </section>

      <!-- 起卦依据 -->
      <section class="panel">
        <h2>二、起卦依据</h2>
        <ul class="origin">
          <li>
            <b>上卦</b>：{{ casting.origin.upperFrom.label }} <code>{{ casting.origin.upperFrom.gan }}</code>
            → {{ casting.origin.upperFrom.bagua }}（{{ casting.origin.upperFrom.rule }}）
          </li>
          <li>
            <b>下卦</b>：{{ casting.origin.lowerFrom.label }} <code>{{ casting.origin.lowerFrom.gan }}</code>
            → {{ casting.origin.lowerFrom.bagua }}（{{ casting.origin.lowerFrom.rule }}）
          </li>
          <li>
            <b>动爻</b>：{{ casting.origin.movingFrom.label }}
            <code>{{ casting.origin.movingFrom.expression }}</code>
            → 第 {{ casting.origin.movingFrom.index + 1 }} 爻
          </li>
        </ul>
        <p class="hint">
          上卦取年干、下卦取日干，用的是虞翻"月体纳甲"的天干配卦表（甲壬乾、乙癸坤、丙艮、丁兑、戊坎、己离、庚震、辛巽）；
          动爻以日干（子平日主，象"我"）加时支（象当下之时位）取六爻之位。此映射法古无定法，本页把推导过程全部列出以便复核。
        </p>
      </section>

      <!-- 卦象 -->
      <section class="panel">
        <h2>三、卦象</h2>
        <GuaDiagram
          :ben="casting.ben"
          :bian="casting.bian"
          :yaos="yaos"
          :bian-shi="bianInfo.shi"
          :bian-ying="bianInfo.ying"
          show-najia
        />
        <div class="verdict">
          <b>综合</b>{{ reading.verdict }}
        </div>
      </section>

      <!-- 解卦十一层 -->
      <section class="panel">
        <div class="panel-head row">
          <h2>四、解卦（十一步）</h2>
          <label class="toggle">
            <input v-model="showAllLayers" type="checkbox" />
            展开全部
          </label>
        </div>
        <ol class="layers">
          <li
            v-for="(s, i) in reading.sections"
            :key="i"
            class="layer"
            :class="{ open: showAllLayers || activeLayer === i }"
          >
            <button class="layer-head" @click="activeLayer = activeLayer === i ? null : i">
              <span class="layer-title">{{ s.title }}</span>
              <span class="layer-caret">{{ showAllLayers || activeLayer === i ? '−' : '+' }}</span>
            </button>
            <div v-show="showAllLayers || activeLayer === i" class="layer-body">
              <p v-if="s.basis" class="basis">依据：{{ s.basis }}</p>
              <blockquote v-if="s.quote" class="quote">{{ s.quote }}</blockquote>
              <p v-for="(p, j) in s.paragraphs" :key="j">{{ p }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- 六爻明细 -->
      <section class="panel">
        <h2>五、六爻明细</h2>
        <div class="table-scroll">
          <table class="yao-table">
            <thead>
              <tr>
                <th>爻位</th><th>爻辞</th><th>当位</th><th>中</th><th>比承乘</th>
                <th>应</th><th>世应</th><th>纳甲</th><th>六亲</th><th>六神</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="y in [...yaos].reverse()" :key="y.index" :class="{ mv: y.moving }">
                <td class="c">
                  {{ y.title }}
                  <em v-if="y.moving" class="mk-move">动</em>
                </td>
                <td class="txt">{{ y.text || '（原书此爻残缺）' }}</td>
                <td class="c" :class="y.zheng ? 'good' : 'bad'">{{ y.zheng ? '当位' : '失位' }}</td>
                <td class="c">{{ y.zhong ? '中' : '—' }}</td>
                <td class="txt">{{ y.chengCheng }}</td>
                <td class="c" :class="y.youYing ? 'good' : 'bad'">{{ y.youYing ? '有应' : '敌应' }}</td>
                <td class="c">
                  <em v-if="y.shi" class="mk-shi">世</em>
                  <em v-if="y.ying" class="mk-ying">应</em>
                </td>
                <td class="c">{{ y.naZhi }}</td>
                <td class="c">{{ y.liuQin }}</td>
                <td class="c">{{ y.liuShen }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">
          世爻代表占问者本人，应爻象征所问之事。本卦属{{ reading.palace.palace }}宫（{{ reading.palace.type }}），
          世在{{ reading.palace.shiIndex + 1 }}爻、应在{{ reading.palace.yingIndex + 1 }}爻。
        </p>
      </section>

      <!-- 建议 -->
      <section class="panel">
        <h2>六、落到行动</h2>
        <ul class="advice">
          <li v-for="(a, i) in reading.advice" :key="i">{{ a }}</li>
        </ul>
        <div v-if="movingYao" class="focus">
          <span class="focus-label">本次关键</span>
          <p>
            <b>{{ movingYao.title }}</b>：{{ movingYao.text }}
          </p>
          <p class="hint">{{ movingYao.posNote }}</p>
        </div>
      </section>

      <!-- 大白话版 -->
      <section v-if="plain" class="panel plain-panel">
        <header class="panel-head">
          <h2>七、大白话版</h2>
          <p class="plain-lead">把上面的术语翻成日常说法：顺不顺、该进还是该守、下一步会怎样。</p>
        </header>

        <p class="oneliner">{{ plain.oneLine }}</p>

        <div class="plain-block">
          <h3>眼下的处境</h3>
          <p v-for="(t, i) in plain.situation" :key="i">{{ t }}</p>
        </div>

        <div class="plain-block key">
          <h3>关键提醒</h3>
          <p>{{ plain.keyPoint }}</p>
        </div>

        <div class="plain-cols">
          <div class="plain-block dos">
            <h3>该做的</h3>
            <ul>
              <li v-for="(t, i) in plain.dos" :key="i">{{ t }}</li>
            </ul>
          </div>
          <div class="plain-block donts">
            <h3>不该做的</h3>
            <ul>
              <li v-for="(t, i) in plain.donts" :key="i">{{ t }}</li>
            </ul>
          </div>
        </div>

        <div class="plain-block">
          <h3>走向</h3>
          <p>{{ plain.trend }}</p>
        </div>

        <div class="plain-block">
          <h3>时间与耐心</h3>
          <p>{{ plain.timing }}</p>
        </div>

        <p class="plain-closing">{{ plain.closing }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
.panel {
  border: 1px solid var(--gu-line);
  border-radius: 14px;
  background: var(--gu-surface);
  padding: 1.2rem 1.3rem;
}
.panel-head h1 {
  margin: 0 0 0.4rem;
  font-size: 1.5rem;
  letter-spacing: 0.04em;
}
.panel-head p.lead {
  margin: 0;
  color: var(--gu-text-soft);
  font-size: 0.92rem;
  line-height: 1.7;
}
.panel-head.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
h2 {
  margin: 0 0 0.9rem;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  color: var(--gu-primary);
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.7rem;
  margin: 1rem 0 0.9rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.field.wide {
  grid-column: 1 / -1;
}
.field span {
  font-size: 0.78rem;
  color: var(--gu-text-mute);
}
.field input,
.field select {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--gu-line);
  border-radius: 8px;
  background: var(--gu-surface-2);
  color: var(--gu-text);
  font-size: 0.95rem;
  font-family: inherit;
}
.field input:focus,
.field select:focus {
  outline: 2px solid color-mix(in srgb, var(--gu-primary) 45%, transparent);
  outline-offset: 1px;
}
.actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.btn {
  padding: 0.55rem 1.1rem;
  border-radius: 9px;
  border: 1px solid var(--gu-line);
  background: var(--gu-surface-2);
  color: var(--gu-text);
  font-size: 0.92rem;
  font-family: inherit;
  cursor: pointer;
}
.btn:hover {
  border-color: var(--gu-primary-line);
}
.btn.primary {
  background: var(--gu-primary);
  border-color: var(--gu-primary);
  color: #fff;
}
.btn.ghost {
  background: transparent;
}
.btn.small {
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
}

/* ── 每日之卦 ── */
.day-panel {
  border-color: var(--gu-primary-line);
  background: linear-gradient(180deg, var(--gu-primary-soft), var(--gu-surface) 42%);
}
.day-panel h2 {
  margin-bottom: 0;
}
.day-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  align-items: center;
  font-size: 0.84rem;
  color: var(--gu-text-soft);
  margin: 0.7rem 0 1rem;
}
.day-date {
  font-size: 1rem;
  font-weight: 700;
  color: var(--gu-primary);
}
.day-body {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.day-body > :first-child {
  /* 卦象区需要放下"本卦 + 变卦"两栏 */
  flex: 3 1 560px;
}
.day-plain {
  flex: 2 1 300px;
  min-width: 260px;
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--gu-line);
  border-radius: 10px;
  background: var(--gu-surface-2);
  font-size: 0.9rem;
  line-height: 1.85;
}
.day-plain p {
  margin: 0 0 0.55rem;
}
.day-plain p:last-child {
  margin-bottom: 0;
}
.day-plain b {
  display: block;
  font-size: 0.76rem;
  color: var(--gu-primary);
  letter-spacing: 0.06em;
  margin-bottom: 0.1rem;
}
.day-plain .onel {
  padding-bottom: 0.55rem;
  border-bottom: 1px dashed var(--gu-line);
  font-size: 0.98rem;
  font-weight: 600;
}
.day-more {
  margin-top: 1rem;
  border-top: 1px solid var(--gu-line);
  padding-top: 0.7rem;
}
.day-more summary {
  cursor: pointer;
  font-size: 0.86rem;
  color: var(--gu-primary);
  list-style: none;
}
.day-more summary::-webkit-details-marker {
  display: none;
}
.day-more summary::before {
  content: '▸ ';
}
.day-more[open] summary::before {
  content: '▾ ';
}
.layers.compact {
  margin-top: 0.7rem;
}
.layers.compact .layer {
  border: 0;
  background: transparent;
}
.layer-body.static {
  padding: 0.4rem 0 0.7rem;
}
.layer-sub {
  margin: 0 0 0.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--gu-primary);
}

/* ── 大白话版 ── */
.plain-panel {
  border-color: color-mix(in srgb, var(--gu-accent) 30%, var(--gu-line));
}
.plain-panel h2 {
  color: var(--gu-accent);
  margin-bottom: 0.3rem;
}
.plain-lead {
  margin: 0 0 1rem;
  font-size: 0.84rem;
  color: var(--gu-text-mute);
}
.oneliner {
  margin: 0 0 1.1rem;
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--gu-accent);
  background: color-mix(in srgb, var(--gu-accent) 8%, transparent);
  border-radius: 0 10px 10px 0;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.75;
}
.plain-block {
  margin-bottom: 1rem;
}
.plain-block h3 {
  margin: 0 0 0.3rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--gu-text-mute);
}
.plain-block p {
  margin: 0.25rem 0;
  font-size: 0.94rem;
  line-height: 1.9;
  color: var(--gu-text-soft);
}
.plain-block.key p {
  padding: 0.6rem 0.85rem;
  border-radius: 9px;
  background: var(--gu-surface-2);
  color: var(--gu-text);
}
.plain-block ul {
  margin: 0.2rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.94rem;
  line-height: 1.9;
  color: var(--gu-text-soft);
}
.plain-block li {
  margin-bottom: 0.25rem;
}
.plain-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.plain-block.dos h3 {
  color: var(--gu-good);
}
.plain-block.donts h3 {
  color: var(--gu-warn);
}
.plain-closing {
  margin: 0.4rem 0 0;
  padding-top: 0.8rem;
  border-top: 1px dashed var(--gu-line);
  font-size: 0.84rem;
  line-height: 1.9;
  color: var(--gu-text-mute);
}
@media (max-width: 640px) {
  .plain-cols {
    grid-template-columns: 1fr;
  }
}
.hint {
  margin: 0.7rem 0 0;
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--gu-text-mute);
}
.err {
  margin: 0.7rem 0 0;
  color: var(--gu-danger);
  font-size: 0.88rem;
}
.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.1rem;
  font-size: 0.84rem;
  color: var(--gu-text-soft);
  margin-bottom: 0.9rem;
}
.chip {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--gu-surface-3);
  border: 1px solid var(--gu-line);
  font-size: 0.78rem;
}
.pillars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.7rem;
}
.pillar {
  border: 1px solid var(--gu-line);
  border-radius: 10px;
  padding: 0.7rem 0.6rem;
  background: var(--gu-surface-2);
  text-align: center;
}
.pillar.day {
  border-color: var(--gu-primary-line);
  background: var(--gu-primary-soft);
}
.p-label {
  font-size: 0.76rem;
  color: var(--gu-text-mute);
  margin-bottom: 0.35rem;
}
.p-gan,
.p-zhi {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.p-gan em,
.p-hidden em {
  font-style: normal;
  font-size: 0.66rem;
  margin-left: 0.15rem;
  opacity: 0.85;
}
.p-sub {
  font-size: 0.7rem;
  color: var(--gu-text-mute);
  margin-top: 0.25rem;
}
.p-hidden {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
  font-size: 0.74rem;
}
.wuxing-bar {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex-wrap: wrap;
  margin-top: 0.9rem;
  font-size: 0.88rem;
}
.wb-title {
  font-size: 0.78rem;
  color: var(--gu-text-mute);
}
.wb-item {
  font-weight: 700;
}
.wb-note {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--gu-text-mute);
}
.origin {
  margin: 0 0 0.4rem;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 2;
}
.origin code {
  background: var(--gu-surface-3);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}
.verdict {
  margin-top: 1rem;
  padding: 0.6rem 0.9rem;
  border-left: 3px solid var(--gu-primary);
  background: var(--gu-surface-2);
  border-radius: 0 8px 8px 0;
  font-size: 0.9rem;
}
.verdict b {
  margin-right: 0.5rem;
  color: var(--gu-primary);
}
.layers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.layer {
  border: 1px solid var(--gu-line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--gu-surface-2);
}
.layer.open {
  border-color: var(--gu-primary-line);
}
.layer-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem;
  background: transparent;
  border: 0;
  color: var(--gu-text);
  font-family: inherit;
  font-size: 0.94rem;
  text-align: left;
  cursor: pointer;
}
.layer-title {
  font-weight: 600;
}
.layer-caret {
  color: var(--gu-primary);
  font-size: 1.1rem;
  line-height: 1;
}
.layer-body {
  padding: 0 0.95rem 0.9rem;
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--gu-text-soft);
}
.layer-body p {
  margin: 0.35rem 0;
}
.basis {
  font-size: 0.78rem;
  color: var(--gu-text-mute);
}
.quote {
  margin: 0.5rem 0;
  padding: 0.5rem 0.8rem;
  border-left: 3px solid var(--gu-accent);
  background: var(--gu-surface);
  border-radius: 0 8px 8px 0;
  font-size: 0.92rem;
  color: var(--gu-text);
}
.table-scroll {
  overflow-x: auto;
}
.yao-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.yao-table th,
.yao-table td {
  border-bottom: 1px solid var(--gu-line);
  padding: 0.45rem 0.5rem;
  text-align: left;
  vertical-align: top;
}
.yao-table th {
  color: var(--gu-text-mute);
  font-weight: 500;
  font-size: 0.78rem;
  white-space: nowrap;
}
.yao-table tr.mv {
  background: color-mix(in srgb, var(--gu-accent) 10%, transparent);
}
.yao-table td.c {
  text-align: center;
  white-space: nowrap;
}
.yao-table td.txt {
  min-width: 12rem;
  line-height: 1.65;
}
.good {
  color: var(--gu-good);
}
.bad {
  color: var(--gu-warn);
}
.mk-move {
  font-style: normal;
  font-size: 0.68rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: var(--gu-accent);
  color: #fff;
  margin-left: 0.25rem;
}
.mk-shi {
  font-style: normal;
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: var(--gu-primary-soft);
  color: var(--gu-primary);
}
.mk-ying {
  font-style: normal;
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: var(--gu-surface-3);
  color: var(--gu-text-mute);
  margin-left: 0.2rem;
}
.advice {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.92rem;
  line-height: 2;
}
.focus {
  margin-top: 0.9rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--gu-primary-line);
  border-radius: 10px;
  background: var(--gu-primary-soft);
}
.focus-label {
  font-size: 0.76rem;
  color: var(--gu-primary);
  letter-spacing: 0.08em;
}
.focus p {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  line-height: 1.8;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: var(--gu-text-mute);
  cursor: pointer;
}
@media (max-width: 720px) {
  .pillars {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
