#!/usr/bin/env python3
"""손글씨 글꼴(배달의민족 을지로체)을 페이지에 쓰는 글자만 추려 src/font-hand.css로 만든다.

  python3 tools/subset-hand-font.py     (pip install fonttools brotli, npm 필요)

아티팩트는 Google Fonts 말고는 글꼴을 내려받지 못해서(CSP) data: URI로 페이지 안에 넣는다.
을지로체 전체(woff2 500KB)를 넣으면 페이지가 세 배가 되므로, 손글씨로 보이는 글
(두루마리의 이야기 한 줄 · 계획표 · '이렇게 한다')이 들어 있는 data.js · school.js · routines.js의 글자만 추린다.
이 파일들의 글을 고쳐 새 글자가 생기면 build.py가 알려 준다. 그때 이 스크립트를 다시 돌린다.
원본은 npm @kfonts/bm-euljiro (SIL OFL 1.1, © Woowa Brothers). OFL의 예약 이름 조항에 따라 추린 글꼴의 이름은 'Oi Hand'로 바꾼다.
"""
import base64, pathlib, subprocess, tarfile, tempfile
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
text = "".join((SRC / f).read_text(encoding="utf-8") for f in ["data.js", "school.js", "routines.js"])
chars = sorted({c for c in text if c > " "} | set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,:;!?()[]~+-–—·…→←↑↓×÷=%/'\"‘’“”✓"))

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["npm", "pack", "@kfonts/bm-euljiro@0.2.1", "--silent"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
    with tarfile.open(next(pathlib.Path(tmp).glob("*.tgz"))) as t:
        t.extract("package/src/BMEULJIROTTF.ttf", tmp, filter="data")
    font = TTFont(pathlib.Path(tmp) / "package/src/BMEULJIROTTF.ttf")
    have = set(font.getBestCmap())
    chars = [c for c in chars if ord(c) in have]
    opts = subset.Options(flavor="woff2", layout_features=["*"], name_IDs=[0, 1, 2, 4, 6, 13, 14], notdef_outline=True)
    sub = subset.Subsetter(opts); sub.populate(text="".join(chars)); sub.subset(font)
    for rec in font["name"].names:
        if rec.nameID in (1, 4, 16): rec.string = "Oi Hand"
        elif rec.nameID == 6: rec.string = "OiHand"
    out = pathlib.Path(tmp) / "hand.woff2"
    font.flavor = "woff2"; font.save(out)
    data = out.read_bytes()

css = ("/* 손글씨: 배달의민족 을지로체. tools/subset-hand-font.py가 만든 파일이다(손으로 고치지 말 것).\n"
       "   컴퓨터에 설치돼 있으면 그것을 쓰고(모든 글자), 없으면 아래에 넣어 둔 추린 글꼴을 쓴다.\n"
       "   © Woowa Brothers, SIL Open Font License 1.1. 추린 글꼴이라 이름을 'Oi Hand'로 바꿨다. */\n"
       "/*@chars " + "".join(chars).replace("*/", "* /") + " @*/\n"
       '@font-face{font-family:"Oi Hand";font-display:swap;src:local("BM EULJIRO TTF"),local("배달의민족 을지로체 TTF"),local("BMEULJIROTTF"),'
       'local("BM EULJIRO OTF"),local("배달의민족 을지로체 OTF"),local("BM EULJIRO"),local("배달의민족 을지로체"),'
       'url(data:font/woff2;base64,' + base64.b64encode(data).decode() + ') format("woff2")}\n')
(SRC / "font-hand.css").write_text(css, encoding="utf-8")
print(f"src/font-hand.css: 글자 {len(chars)}개, woff2 {len(data):,} bytes")
