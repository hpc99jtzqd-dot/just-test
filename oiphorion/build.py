#!/usr/bin/env python3
"""오이포리온 빌드: src/ 조각과 cpp/study_os.cpp를 한 장짜리 HTML로 합친다.

  python3 build.py            → dist/artifact.html (claude.ai 아티팩트용, <head>/<body> 없이)
                                 dist/index.html    (브라우저로 바로 여는 독립 파일)
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
S = ROOT / "src"
read = lambda p: (S / p).read_text(encoding="utf-8")

# C++ 앵커: "// @anchor 이름" ~ "// @end 이름" 줄은 페이지에 넣을 때 지우고, 지운 뒤의 줄 번호로 범위를 계산한다.
# 그래서 C++를 고쳐도 두루마리의 발췌가 어긋나지 않는다.
src_lines = (ROOT / "cpp" / "study_os.cpp").read_text(encoding="utf-8").rstrip("\n").split("\n")
MARK = re.compile(r"^\s*// @(anchor|end) (\S+)\s*$")
kept, open_, anchors, errs = [], {}, {}, []
for no, line in enumerate(src_lines, 1):
    m = MARK.match(line)
    if not m:
        kept.append(line); continue
    kind, name = m.groups()
    if kind == "anchor":
        if name in open_ or name in anchors: errs.append(f"{no}행: 앵커 '{name}'가 두 번 열림")
        open_[name] = len(kept) + 1
    elif name not in open_:
        errs.append(f"{no}행: 열리지 않은 앵커 '{name}'를 닫음")
    else:
        anchors[name] = [open_.pop(name), len(kept)]
errs += [f"앵커 '{n}'가 닫히지 않음" for n in open_]
errs += [f"앵커 '{n}'가 비어 있음" for n, (a, b) in anchors.items() if a > b]
cpp = "\n".join(kept) + "\n"
cpp_lines = len(kept)

# 집을 나서는 시각은 C++의 LEAVE_AT 한 줄이 원본이다
lm = re.search(r"LEAVE_AT\s*=\s*\{([\d,\s]+)\}", cpp)
leave = [int(x) for x in lm.group(1).split(",")] if lm else []
if len(leave) != 4: errs.append("LEAVE_AT에서 월~목 출발 시각 4개를 읽지 못함")

head = (read("head.html")
        .replace("/*@NODES_CSS@*/", read("nodes.css"))
        .replace("/*@SCROLL_CSS@*/", read("scroll.css"))
        .replace("/*@MOTION_CSS@*/", read("motion.css")))
js = "\n".join(read(f) for f in ["data.js", "school.js", "scroll.js", "map.js"])
js = js.replace("__CPP__", json.dumps(cpp, ensure_ascii=False).replace("</", "<\\/"))
js = js.replace("__ANCHORS__", json.dumps(anchors)).replace("__LEAVE__", json.dumps(leave))

# 두루마리가 부르는 앵커 이름이 C++에 다 있는지 점검: cpp:[["이름","설명"], …]
blocks_src = read("data.js") + read("school.js")
used = set()
for m in re.finditer(r"cpp:\[", blocks_src):
    depth, k = 0, m.end() - 1
    while True:
        depth += {"[": 1, "]": -1}.get(blocks_src[k], 0)
        if depth == 0: break
        k += 1
    used |= set(re.findall(r'\["([^"]+)",', blocks_src[m.end():k]))
errs += [f"없는 앵커를 부름: '{n}'" for n in sorted(used - anchors.keys())]
if errs:
    sys.exit("빌드 중단\n  " + "\n  ".join(errs))
unused = sorted(anchors.keys() - used)
if unused: print("참고: 아무 블록도 부르지 않는 앵커", unused)

page = head + "\n" + read("body.html") + "\n<script>\n" + js + "\n</script>\n"
dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
(dist / "artifact.html").write_text(page, encoding="utf-8")
skeleton = ('<!doctype html>\n<html lang="ko"><head><meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
            'img{max-width:100%}[hidden]{display:none!important}</style>\n</head><body>\n')
(dist / "index.html").write_text(skeleton + page + "</body></html>\n", encoding="utf-8")
print(f"dist/artifact.html, dist/index.html ({len(page):,} bytes), study_os.cpp {cpp_lines}줄(앵커 {len(anchors)}개 제외)")
