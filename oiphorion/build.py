#!/usr/bin/env python3
"""오이포리온 빌드: src/ 조각과 cpp/study_os.cpp를 한 장짜리 HTML로 합친다.

  python3 build.py            → dist/artifact.html (claude.ai 아티팩트용, <head>/<body> 없이)
                                 dist/index.html    (브라우저로 바로 여는 독립 파일)
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
S = ROOT / "src"
read = lambda p: (S / p).read_text(encoding="utf-8")

cpp = (ROOT / "cpp" / "study_os.cpp").read_text(encoding="utf-8")
cpp_lines = cpp.rstrip("\n").count("\n") + 1

head = (read("head.html")
        .replace("/*@NODES_CSS@*/", read("nodes.css"))
        .replace("/*@SCROLL_CSS@*/", read("scroll.css"))
        .replace("/*@MOTION_CSS@*/", read("motion.css")))
js = "\n".join(read(f) for f in ["data.js", "school.js", "scroll.js", "map.js"])
js = js.replace("__CPP__", json.dumps(cpp, ensure_ascii=False).replace("</", "<\\/"))

# C++ 발췌 범위 점검: data.js / school.js 의 cpp:[[시작,끝,"설명"]] 이 파일 길이를 넘지 않는지
bad = [(a, b) for a, b in re.findall(r"\[(\d+),(\d+),\"", read("data.js") + read("school.js"))
       if int(b) > cpp_lines or int(a) > int(b)]
if bad:
    sys.exit(f"C++ 발췌 범위가 study_os.cpp({cpp_lines}줄)와 맞지 않음: {bad}")

page = head + "\n" + read("body.html") + "\n<script>\n" + js + "\n</script>\n"
dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
(dist / "artifact.html").write_text(page, encoding="utf-8")
skeleton = ('<!doctype html>\n<html lang="ko"><head><meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
            'img{max-width:100%}[hidden]{display:none!important}</style>\n</head><body>\n')
(dist / "index.html").write_text(skeleton + page + "</body></html>\n", encoding="utf-8")
print(f"dist/artifact.html, dist/index.html ({len(page):,} bytes), study_os.cpp {cpp_lines}줄")
