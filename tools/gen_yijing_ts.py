# -*- coding: utf-8 -*-
"""由 qingshano/yijing-data 生成前端数据模块 src/data/yijing.generated.ts。

数据来源：https://github.com/qingshano/yijing-data （MIT License）
- data/index.json          骨架索引（卦序、卦名、全名、八宫、爻画、上下卦）
- data/relations.json      互卦 / 错卦 / 综卦的 ID 映射
- data/hexagrams/NN.json   每卦的卦辞、彖传、大象传、六爻爻辞（爻辞内含小象）

约定：guaXiang 六位字符串 **左起即初爻**（与通行画卦自下而上的习惯一致），
故本模块同时给出 `bits`（数值形式，bit5 = 初爻）便于按位运算。
"""
import json
from pathlib import Path

ROOT = Path(r"D:\1\yijing-data")
OUT = Path(r"D:\1\vue-template\src\data\yijing.generated.ts")

POS = ["初", "二", "三", "四", "五", "上"]

# ── 校勘表 ──────────────────────────────────────────────────────────────
# 语料中少量明显讹字，依通行本《周易》字形改正；只改字形，不动句式与标点。
# (讹字, 正字, 依据)
ERRATA = [
    ("见龙再田", "见龙在田", "《乾》九二通行本作「见龙在田」，「再」为「在」之讹"),
    ("既鹿无虞", "即鹿无虞", "《屯》六三通行本作「即鹿无虞」，《正义》释「即」为追逐"),
    ("童仆", "童僕", "《旅》六二、九三「童僕」指僮仆，语料误用简繁混字"),
]


def apply_errata(text: str) -> str:
    """套用校勘表；逐条可回查（见 ERRATA 的说明）。"""
    out = text
    for old, new, _why in ERRATA:
        if old != new and old in out:
            out = out.replace(old, new)
    return out


idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
rel = {r["id"]: r for r in json.loads((ROOT / "data/relations.json").read_text(encoding="utf-8"))}

records = []
for row in sorted(idx, key=lambda r: r["id"]):
    hid = row["id"]
    d = json.loads((ROOT / f"data/hexagrams/{hid:02d}.json").read_text(encoding="utf-8"))
    gx = d["guaXiang"]
    assert len(gx) == 6 and set(gx) <= {"0", "1"}, gx

    bits = 0
    for i, ch in enumerate(gx):
        if ch == "1":
            bits |= 1 << (5 - i)

    yaos = []
    for i, y in enumerate(d["yaoCi"]):
        content = y["content"].strip()
        # 语料把"爻辞"与"象曰：…"（小象）合在一起，按首个"象曰"切分
        body, _, xiang = content.partition("象曰：")
        yaos.append({
            "position": y["position"].strip(),
            "text": body.strip(),
            "xiaoXiang": xiang.strip(),
        })

    # 校勘：按表改正语料中的讹字（见 ERRATA）
    for y in yaos:
        y["text"] = apply_errata(y["text"])
        y["xiaoXiang"] = apply_errata(y["xiaoXiang"])

    records.append({
        "id": hid,
        "name": d["name"],
        "fullName": d["fullName"],
        "gongName": d["gongName"],
        "guaXiang": gx,
        "bits": bits,
        "upper": d["upperGua"],
        "lower": d["lowerGua"],
        "guaCi": apply_errata(d["guaCi"].strip()),
        "tuanZhuan": apply_errata(d["tuanZhuan"].strip()),
        "xiangZhuan": apply_errata(d["xiangZhuan"].strip()),
        "yaoCi": yaos,
        "huGua": d["huGua"],
        "cuoGua": d["cuoGua"],
        "zongGua": d["zongGua"],
    })

# ---- 自检 ----
assert len(records) == 64
assert len({r["guaXiang"] for r in records}) == 64, "爻画重复"
for r in records:
    assert len(r["yaoCi"]) == 6, r["name"]
    for i, y in enumerate(r["yaoCi"]):
        yin = "九" if r["guaXiang"][i] == "1" else "六"
        want = (POS[i] + yin) if i in (0, 5) else (yin + POS[i])
        assert y["position"] == want, f"{r['name']} 第{i+1}爻 {y['position']} != {want}"
        assert y["text"], f"{r['name']} 第{i+1}爻 无爻辞"
        assert y["xiaoXiang"], f"{r['name']} 第{i+1}爻 无小象"
    for k in ("guaCi", "tuanZhuan", "xiangZhuan"):
        assert r[k], f"{r['name']} {k} 为空"
    assert r["id"] == rel[r["id"]]["id"]
print("语料自检通过：64 卦 / 384 爻 / 卦辞·彖·大象·小象齐备")


def q(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


o = []
o.append("// 本文件由 tools/gen_yijing_ts.py 自动生成，请勿手工编辑。")
o.append("// 数据来源：https://github.com/qingshano/yijing-data （MIT License）")
o.append("// 说明：爻画 guaXiang 为六位字符串，**左起即初爻**（1 阳 / 0 阴）；")
o.append("//       bits 为其数值形式（bit5 = 初爻），便于按位运算。")
o.append("")
o.append("export interface YijingYao {")
o.append("  /** 爻题，如 初九 / 六二 */")
o.append("  position: string")
o.append("  /** 爻辞（不含小象） */")
o.append("  text: string")
o.append("  /** 小象传 */")
o.append("  xiaoXiang: string")
o.append("}")
o.append("")
o.append("export interface YijingHexagram {")
o.append("  /** 卦序 1-64 */")
o.append("  id: number")
o.append("  /** 卦名 */")
o.append("  name: string")
o.append("  /** 卦全名，如 水雷屯 */")
o.append("  fullName: string")
o.append("  /** 所属八宫，如 坎宫 */")
o.append("  gongName: string")
o.append("  /** 六位爻画字符串，左起即初爻 */")
o.append("  guaXiang: string")
o.append("  /** 爻画数值：bit5 = 初爻 */")
o.append("  bits: number")
o.append("  /** 上卦（外卦） */")
o.append("  upper: string")
o.append("  /** 下卦（内卦） */")
o.append("  lower: string")
o.append("  /** 卦辞 */")
o.append("  guaCi: string")
o.append("  /** 彖传 */")
o.append("  tuanZhuan: string")
o.append("  /** 大象传 */")
o.append("  xiangZhuan: string")
o.append("  /** 六爻，自初爻至上爻 */")
o.append("  yaoCi: YijingYao[]")
o.append("  /** 互卦 ID */")
o.append("  huGua: number")
o.append("  /** 错卦（旁通）ID */")
o.append("  cuoGua: number")
o.append("  /** 综卦（反对）ID */")
o.append("  zongGua: number")
o.append("}")
o.append("")
o.append("export const YIJING: YijingHexagram[] = [")
for r in records:
    o.append("  {")
    o.append(f"    id: {r['id']},")
    o.append(f"    name: {q(r['name'])},")
    o.append(f"    fullName: {q(r['fullName'])},")
    o.append(f"    gongName: {q(r['gongName'])},")
    o.append(f"    guaXiang: {q(r['guaXiang'])},")
    o.append(f"    bits: 0b{r['bits']:06b},")
    o.append(f"    upper: {q(r['upper'])},")
    o.append(f"    lower: {q(r['lower'])},")
    o.append(f"    guaCi: {q(r['guaCi'])},")
    o.append(f"    tuanZhuan: {q(r['tuanZhuan'])},")
    o.append(f"    xiangZhuan: {q(r['xiangZhuan'])},")
    o.append("    yaoCi: [")
    for y in r["yaoCi"]:
        o.append(f"      {{ position: {q(y['position'])}, text: {q(y['text'])}, xiaoXiang: {q(y['xiaoXiang'])} }},")
    o.append("    ],")
    o.append(f"    huGua: {r['huGua']},")
    o.append(f"    cuoGua: {r['cuoGua']},")
    o.append(f"    zongGua: {r['zongGua']},")
    o.append("  },")
o.append("]")
o.append("")
o.append("export const YIJING_BY_ID: ReadonlyMap<number, YijingHexagram> = new Map(")
o.append("  YIJING.map((h) => [h.id, h]),")
o.append(")")
o.append("")
o.append("export const YIJING_BY_NAME: ReadonlyMap<string, YijingHexagram> = new Map(")
o.append("  YIJING.map((h) => [h.name, h]),")
o.append(")")
o.append("")

OUT.write_text("\n".join(o), encoding="utf-8")
print(f"已写出 {OUT}")
