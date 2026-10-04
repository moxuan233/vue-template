# 周易起卦解卦

一个用 Vue 3 + TypeScript + Vite 写成的《周易》占筮站点：**输入生辰 → 排出四柱 → 起卦 → 解卦**，
并附完整的六十四卦卦典与方法说明。

## 功能

| 页面 | 路径 | 内容 |
| --- | --- | --- |
| 起卦 | `/` | 输入公历生辰 → 四柱排盘（干支、十神、藏干、纳音、空亡、命宫胎元、五行分布）→ 起卦依据 → 卦象图 → **解卦十一步** → 六爻明细（当位·中·比承乘·应·世应·纳甲·六亲·六神）→ 行动建议。可切换「改用大衍筮法」按古法起卦 |
| 卦典 | `/gua` | 六十四卦一览，按八宫筛选、全文搜索（卦名/卦辞/彖传/爻辞）。每卦可查看卦辞、彖传、大象传、六爻爻辞与小象，以及互卦／错卦／综卦 |
| 方法 | `/method` | 起卦法、动爻判定、解卦十一层次序的完整说明，以及数据来源与边界声明 |

## 起卦法

**八字纳甲法**（默认）：上卦取年柱天干、下卦取日柱天干，用虞翻「月体纳甲」的天干配卦表
（甲壬乾、乙癸坤、丙艮、丁兑、戊坎、己离、庚震、辛巽）；动爻取 `(日干序 + 时支序) mod 6`；
变卦（之卦）由动爻阴阳互易而得。页面会把每一步推导印出来，便于复核。

**大衍筮法**（可切换，源书原法）：蓍草四十九策，四营为一变、三变一爻、十八变一卦，
九揲为老阳、七揲为少阳、六揲为老阴、八揲为少阴；六爻皆静以卦辞断，乾坤另有「用九／用六」之例。

> 说明：由八字推卦属后起数术，古无定法。本项目把所用映射规则完全公开并列在页面与
> `src/logic/qigua.ts` 的注释中，属**本项目自建**内容，请勿当作原书内容。

## 解卦次序

按《周易》原书整理的十一层：

```
① 定问            《蒙》"初筮告，再三渎，渎则不告"
② 卦辞（彖辞）     《系辞下》"知者观其彖辞，则思过半矣"
③ 彖传            一卦之"时义"
④ 卦象与卦德      《说卦》乾健、坤顺、震动、巽入、坎陷、离丽、艮止、兑说
⑤ 大象传          "君子以…"：从预测转为行为准则
⑥ 卦主            成卦之主 / 意义之主；多以二、五爻为主
⑦ 动爻            《系辞》"吉凶悔吝者，生乎动者也"
⑧ 动爻定位        当位 · 中 · 比承乘 · 应（古法"中正比应"）
⑨ 判词            吉凶＝得失；悔吝＝小疵；无咎＝善补过
⑩ 变卦（之正）     "本有其悔，变正则无悔"
⑪ 还归于人        避凶趋吉，落在行动
```

## 数据来源

- **卦爻辞、彖传、大象传、小象传、八宫归属、互／错／综关系**：
  [qingshano/yijing-data](https://github.com/qingshano/yijing-data)（MIT License），
  64 卦 / 384 爻，字段完整。
- **解卦方法与术语**：《周易》原书《系辞》《说卦》及书前《读〈易〉需要了解的一些基本术语》。
- **自建内容**：四柱（五行、十神、藏干、纳音、空亡、命宫胎元）、纳甲起卦映射、六亲六神、八宫世应推导。

详见 [`THIRD_PARTY_LICENSES/README.md`](THIRD_PARTY_LICENSES/README.md)。

## 目录结构

```
src/
├── data/
│   ├── yijing.generated.ts   语料生成的 64 卦全文（由 tools/gen_yijing_ts.py 产生）
│   ├── hexagrams.ts          爻画形状工具（由语料派生，含上下卦、全名）
│   ├── bagua.ts              八卦：卦象、卦德、方位、纳甲
│   └── ganzhi.ts             干支、五行、十神
├── logic/
│   ├── bazi.ts               八字排盘（历法与节气交由 lunar-typescript）
│   ├── qigua.ts              起卦：纳甲法 / 大衍筮法、八宫世应、纳甲六亲六神
│   ├── reader.ts             解卦引擎：输出十一个层次
│   └── __tests__/core.spec.ts  回归测试（23 项）
├── components/GuaDiagram.vue 卦象图（本卦 / 变卦，含动爻与世应标记）
└── views/                    DivineView / ReferenceView / MethodView
```

## 开发

```sh
npm install
npm run dev          # 开发服务器
npm run build        # 类型检查 + 生产构建
npm run type-check   # 仅类型检查
npx vitest run       # 回归测试
```

### 数据再生与校验

```sh
# 由 yijing-data 语料重新生成 src/data/yijing.generated.ts（含校勘）
python tools/gen_yijing_ts.py

# 校验语料自洽性（爻画唯一性、爻题阴阳、八宫分布、互错综定义）
python tools/verify_yijing_data.py

# 校验代码中的八宫表与语料 gongName 完全一致
python tools/verify_palace_vs_corpus.py
```

脚本默认读取 `../yijing-data`（即 `git clone https://github.com/qingshano/yijing-data` 到仓库同级目录）。

### 端到端冒烟测试

```sh
npm run dev                       # 另开一个终端，默认 5173
BASE_URL=http://localhost:5173 node tools/e2e-smoke.mjs
```

覆盖三个页面的渲染、交互与控制台错误检查（需 `npx playwright install chromium`）。

## 许可与声明

第三方数据许可见 [`THIRD_PARTY_LICENSES/`](THIRD_PARTY_LICENSES/)。

占筮为参考，人事为本。源书亦引荀子「善为《易》者不占」，以及武王伐纣占得「大凶」而太公视为
「枯骨朽木」——**占辞终究服从于人事判断**。
