# -*- coding: utf-8 -*-
"""校验 qingshano/yijing-data 数据集：结构与自洽性"""
import json
from pathlib import Path

ROOT = Path(r"D:\1\yijing-data")
TRIG = {"乾": "111", "兑": "110", "离": "101", "震": "100",
        "巽": "011", "坎": "010", "艮": "001", "坤": "000"}
POS = ["初", "二", "三", "四", "五", "上"]

idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
rel = json.loads((ROOT / "data/relations.json").read_text(encoding="utf-8"))
print(f"index {len(idx)} 条；relations {len(rel)} 条")

rel_by_id = {r["id"]: r for r in rel}
problems = []
hexes = {}

for row in idx:
    hid = row["id"]
    detail = json.loads((ROOT / f"data/hexagrams/{hid:02d}.json").read_text(encoding="utf-8"))
    hexes[hid] = detail

    # 1) index 与 detail 一致
    for k in ("id", "name", "fullName", "gongName", "guaXiang", "upperGua", "lowerGua"):
        if row[k] != detail[k]:
            problems.append(f"{hid} {row['name']}: index.{k}={row[k]!r} 与 detail 不一致 {detail[k]!r}")

    gx = detail["guaXiang"]
    # 2) guaXiang 六位、且由上下卦可推出（左起即初爻）
    if len(gx) != 6 or set(gx) - {"0", "1"}:
        problems.append(f"{hid} {row['name']}: guaXiang 非法 {gx!r}")
        continue
    want_lower = gx[:3]           # 下卦三画，左起初爻
    want_upper = gx[3:]
    if TRIG.get(detail["lowerGua"]) != want_lower:
        problems.append(f"{hid} {row['name']}: 下卦 {detail['lowerGua']} 与 guaXiang 前三位 {want_lower} 不符")
    if TRIG.get(detail["upperGua"]) != want_upper:
        problems.append(f"{hid} {row['name']}: 上卦 {detail['upperGua']} 与 guaXiang 后三位 {want_upper} 不符")

    # 3) 爻题阴阳必须与 guaXiang 吻合
    yaos = detail["yaoCi"]
    if len(yaos) != 6:
        problems.append(f"{hid} {row['name']}: 爻数 {len(yaos)}")
        continue
    for i, y in enumerate(yaos):
        yin = "九" if gx[i] == "1" else "六"
        expect = (POS[i] + yin) if i in (0, 5) else (yin + POS[i])
        if y["position"] != expect:
            problems.append(f"{hid} {row['name']} 第{i+1}爻: 爻题 {y['position']} 应为 {expect}")
        if not y["content"].strip():
            problems.append(f"{hid} {row['name']} 第{i+1}爻: 内容为空")

    # 4) 卦辞/彖传/大象传非空
    for k in ("guaCi", "tuanZhuan", "xiangZhuan"):
        if not detail[k].strip():
            problems.append(f"{hid} {row['name']}: {k} 为空")

    # 5) 关系表一致
    r = rel_by_id.get(hid)
    if not r:
        problems.append(f"{hid} {row['name']}: relations 缺该卦")
    else:
        for k in ("huGua", "cuoGua", "zongGua"):
            if detail[k] != r[k]:
                problems.append(f"{hid} {row['name']}: {k} detail={detail[k]} relations={r[k]}")

# 6) 爻画唯一
seen = {}
for hid, d in hexes.items():
    if d["guaXiang"] in seen:
        problems.append(f"爻画重复：{d['name']} 与 {seen[d['guaXiang']]}")
    seen[d["guaXiang"]] = d["name"]
print(f"唯一爻画 {len(seen)}/64")

# 7) 错卦/综卦/互卦的数学定义校验
def cuo(gx):   # 错卦：六爻尽变
    return "".join("1" if c == "0" else "0" for c in gx)

def zong(gx):  # 综卦：六爻倒转
    return gx[::-1]

def hu(gx):    # 互卦：二三四为下卦，三四五为上卦
    return gx[1:4] + gx[2:5]

by_gx = {d["guaXiang"]: hid for hid, d in hexes.items()}
for hid, d in hexes.items():
    gx = d["guaXiang"]
    for name, fn, key in (("错", cuo, "cuoGua"), ("综", zong, "zongGua"), ("互", hu, "huGua")):
        target = fn(gx)
        got = d[key]
        if target in by_gx and by_gx[target] != got:
            problems.append(f"{hid} {d['name']}: {name}卦 应为 {by_gx[target]}（{target}），数据作 {got}")
        elif target not in by_gx:
            problems.append(f"{hid} {d['name']}: {name}卦 {target} 不在表中")

# 8) 八宫：每宫 8 卦
from collections import Counter
gong = Counter(d["gongName"] for d in hexes.values())
print("八宫分布:", dict(gong))
if set(gong.values()) != {8}:
    problems.append(f"八宫分布异常：{dict(gong)}")

print()
if problems:
    print(f"发现 {len(problems)} 处问题：")
    for p in problems[:40]:
        print("  " + p)
else:
    print("★ 全部校验通过")
