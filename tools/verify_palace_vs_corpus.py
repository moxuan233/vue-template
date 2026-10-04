# -*- coding: utf-8 -*-
"""校验 App 侧硬编码的八宫表与语料 gongName 是否完全一致"""
import json
import re
from pathlib import Path

ROOT = Path(r"D:\1\yijing-data")
src = Path(r"D:\1\vue-template\src\logic\qigua.ts").read_text(encoding="utf-8")

blocks = re.findall(r"\{ palace: '(.+?)', members: \[(.+?)\] \}", src)
app = {}
for palace, members in blocks:
    names = re.findall(r"'(.+?)'", members)
    for n in names:
        if n in app:
            print(f"!! App 表中 {n} 重复归属（{app[n]} / {palace}）")
        app[n] = palace

idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
data = {r["name"]: r["gongName"].replace("宫", "") for r in idx}

bad = 0
for name, palace in sorted(app.items(), key=lambda kv: kv[0]):
    if name not in data:
        print(f"!! 语料缺 {name}")
        bad += 1
    elif data[name] != palace:
        print(f"!! {name}: App 作 {palace}宫，语料作 {data[name]}宫")
        bad += 1
print(f"App 表覆盖 {len(app)} 卦；与语料不一致 {bad} 处")
if len(app) == 64 and bad == 0:
    print("★ 八宫表与语料完全一致")
