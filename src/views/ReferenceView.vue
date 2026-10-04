<script setup lang="ts">
/**
 * 卦典：六十四卦一览，可查看每卦的卦辞、彖传、大象传与六爻（含小象）。
 * 数据源：qingshano/yijing-data（MIT）。
 */
import { computed, ref } from 'vue'
import { YIJING, type YijingHexagram } from '@/data/yijing.generated'
import { shapeByNumber } from '@/data/hexagrams'
import { palaceOf } from '@/logic/qigua'
import { metaByNumber } from '@/data/hexagrams'

const keyword = ref('')
const palaceFilter = ref('全部')
const selectedId = ref<number | null>(null)

const PALACES = ['全部', '乾', '坎', '艮', '震', '巽', '离', '坤', '兑']

interface Row {
  hex: YijingHexagram
  palace: string
  type: string
  shi: number
  ying: number
  hu: string
  cuo: string
  zong: string
}

const NAME_BY_ID = new Map(YIJING.map((h) => [h.id, h.name]))

const rows = computed<Row[]>(() =>
  YIJING.map((hex) => {
    const p = palaceOf(metaByNumber(hex.id))
    return {
      hex,
      palace: p.palace,
      type: p.type,
      shi: p.shiIndex,
      ying: p.yingIndex,
      hu: NAME_BY_ID.get(hex.huGua) ?? '—',
      cuo: NAME_BY_ID.get(hex.cuoGua) ?? '—',
      zong: NAME_BY_ID.get(hex.zongGua) ?? '—',
    }
  }),
)

const filtered = computed(() =>
  rows.value.filter((r) => {
    if (palaceFilter.value !== '全部' && r.palace !== palaceFilter.value) return false
    const k = keyword.value.trim()
    if (!k) return true
    const h = r.hex
    return (
      h.name.includes(k) ||
      h.fullName.includes(k) ||
      h.guaCi.includes(k) ||
      h.tuanZhuan.includes(k) ||
      h.xiangZhuan.includes(k) ||
      h.yaoCi.some((y) => y.text.includes(k) || y.xiaoXiang.includes(k))
    )
  }),
)

const current = computed(() => rows.value.find((r) => r.hex.id === selectedId.value) ?? null)

/** 爻画：自下而上渲染，'1' 为阳 */
function linesOf(guaXiang: string) {
  return guaXiang.split('').map((c) => c === '1')
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <header class="panel-head">
        <h1>六十四卦卦典</h1>
        <p class="lead">
          卦辞、彖传、大象传、六爻爻辞与小象传取自开源结构化语料
          <a href="https://github.com/qingshano/yijing-data" target="_blank" rel="noreferrer">qingshano/yijing-data</a>
          （MIT）。八宫归属、世应位置与互／错／综关系同步采用该语料并已与本项目逐条校验。
        </p>
      </header>

      <div class="filters">
        <input
          v-model="keyword"
          class="search"
          type="search"
          placeholder="搜索卦名、卦辞、彖传或爻辞，如「潜龙」「利涉大川」"
        />
        <div class="palaces">
          <button
            v-for="p in PALACES"
            :key="p"
            class="pbtn"
            :class="{ on: palaceFilter === p }"
            @click="palaceFilter = p"
          >
            {{ p }}{{ p === '全部' ? '' : '宫' }}
          </button>
        </div>
      </div>

      <p class="count">共 {{ filtered.length }} 卦</p>

      <div class="grid">
        <button
          v-for="r in filtered"
          :key="r.hex.id"
          class="card"
          :class="{ on: selectedId === r.hex.id }"
          @click="selectedId = r.hex.id"
        >
          <span class="c-head">
            <span class="c-name">{{ r.hex.name }}</span>
            <span class="c-no">{{ r.hex.id }}</span>
          </span>
          <span class="c-gua" aria-hidden="true">
            <i
              v-for="(on, i) in linesOf(r.hex.guaXiang).slice().reverse()"
              :key="i"
              class="c-line"
              :class="{ on }"
            />
          </span>
          <span class="c-sub">{{ r.hex.fullName }}</span>
          <span class="c-palace">{{ r.palace }}宫 · {{ r.type }}</span>
        </button>
      </div>
    </section>

    <section v-if="current" class="panel detail">
      <header class="detail-head">
        <h2>
          第 {{ current.hex.id }} 卦 · {{ current.hex.name }}
          <small>{{ current.hex.fullName }}</small>
        </h2>
        <button class="btn ghost" @click="selectedId = null">关闭</button>
      </header>

      <div class="detail-meta">
        <span>{{ current.palace }}宫（{{ current.type }}）</span>
        <span>世爻 {{ current.shi + 1 }} · 应爻 {{ current.ying + 1 }}</span>
        <span>爻画 {{ current.hex.guaXiang }}（左起初爻）</span>
      </div>

      <div class="relations">
        <span>互卦 <b>{{ current.hu }}</b></span>
        <span>错卦（旁通）<b>{{ current.cuo }}</b></span>
        <span>综卦（反对）<b>{{ current.zong }}</b></span>
      </div>

      <div class="block">
        <h3>卦辞</h3>
        <p class="jing">{{ current.hex.guaCi }}</p>
      </div>

      <div class="block">
        <h3>彖传</h3>
        <p class="jing">{{ current.hex.tuanZhuan }}</p>
      </div>

      <div class="block">
        <h3>大象传</h3>
        <p class="jing">{{ current.hex.xiangZhuan }}</p>
      </div>

      <div class="block">
        <h3>六爻爻辞与小象</h3>
        <ol class="yao-list">
          <li v-for="(y, i) in current.hex.yaoCi" :key="i">
            <span class="yt">{{ y.position }}</span>
            <span class="yx">
              <b>{{ y.text }}</b>
              <em>象曰：{{ y.xiaoXiang }}</em>
            </span>
          </li>
        </ol>
      </div>
    </section>
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
  font-size: 1.4rem;
  letter-spacing: 0.04em;
}
.panel-head .lead {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--gu-text-soft);
}
.panel-head a {
  color: var(--gu-primary);
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin: 1rem 0 0.6rem;
}
.search {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--gu-line);
  border-radius: 9px;
  background: var(--gu-surface-2);
  color: var(--gu-text);
  font-size: 0.92rem;
  font-family: inherit;
}
.search:focus {
  outline: 2px solid color-mix(in srgb, var(--gu-primary) 45%, transparent);
  outline-offset: 1px;
}
.palaces {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pbtn {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--gu-line);
  background: var(--gu-surface-2);
  color: var(--gu-text-soft);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
}
.pbtn.on {
  background: var(--gu-primary);
  border-color: var(--gu-primary);
  color: #fff;
}
.count {
  margin: 0 0 0.8rem;
  font-size: 0.8rem;
  color: var(--gu-text-mute);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 0.55rem;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.65rem;
  border: 1px solid var(--gu-line);
  border-radius: 10px;
  background: var(--gu-surface-2);
  color: var(--gu-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.card:hover {
  border-color: var(--gu-primary-line);
}
.card.on {
  border-color: var(--gu-primary);
  background: var(--gu-primary-soft);
}
.c-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.c-name {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.c-no {
  font-size: 0.72rem;
  color: var(--gu-text-mute);
}
.c-gua {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0.2rem 0;
}
.c-line {
  height: 3px;
  width: 100%;
  border-radius: 2px;
  background: var(--gu-surface-3);
}
.c-line.on {
  background: var(--gu-yao);
}
.c-sub {
  font-size: 0.75rem;
  color: var(--gu-text-soft);
}
.c-palace {
  font-size: 0.7rem;
  color: var(--gu-text-mute);
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
.detail-head h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--gu-primary);
}
.detail-head small {
  font-size: 0.8rem;
  color: var(--gu-text-mute);
  margin-left: 0.5rem;
  font-weight: 400;
}
.detail-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--gu-text-mute);
  margin-bottom: 0.5rem;
}
.relations {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--gu-text-soft);
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  background: var(--gu-surface-2);
  margin-bottom: 1rem;
}
.relations b {
  color: var(--gu-primary);
  margin-left: 0.25rem;
}
.block {
  margin-bottom: 1rem;
}
.block h3 {
  margin: 0 0 0.35rem;
  font-size: 0.86rem;
  color: var(--gu-text-mute);
  font-weight: 500;
  letter-spacing: 0.06em;
}
.jing {
  margin: 0;
  padding: 0.6rem 0.85rem;
  border-left: 3px solid var(--gu-primary-line);
  background: var(--gu-surface-2);
  border-radius: 0 8px 8px 0;
  font-size: 1rem;
  line-height: 1.9;
  letter-spacing: 0.02em;
}
.yao-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.yao-list li {
  display: flex;
  gap: 0.8rem;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  background: var(--gu-surface-2);
  font-size: 0.92rem;
  line-height: 1.8;
}
.yt {
  flex: 0 0 2.4rem;
  color: var(--gu-primary);
  font-weight: 600;
}
.yx {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.yx b {
  font-weight: 600;
}
.yx em {
  font-style: normal;
  font-size: 0.82rem;
  color: var(--gu-text-mute);
}
.btn {
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--gu-line);
  background: var(--gu-surface-2);
  color: var(--gu-text);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn.ghost {
  background: transparent;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  }
}
</style>
