"""Build tools/labs/vertical/vertical-9x16.html and vertical-4x5.html: a feasibility test of the film in tall formats.

Recomposed scenes (not a crop): S1 intro, S2 tagline, S3 issues, S5 speakers, S9 partners and lockup. S4, S6, S7 are
left out. index.html's CSS and helpers are copied at build time (head and helper block, 1920/1080 swapped for the frame
size), then a per-format override sheet and a per-format scene script follow.

Timing: the scenes keep the film's choreography in output seconds (same T() and HOLDS). A wrapper timeline plays three
windows of that master: [0, 13.75], [19.75, 24.75], [32.75, 41.75] (jumps of 6 s and 8 s, whole bars at 120 BPM).
tools/labs/vertical/music-M2-reel.wav is cut from assets/audio/music-M2.wav on the same windows, so the music syncs.

Usage: uv run tools/make-vertical-lab.py, then
  pnpm dlx hyperframes@0.8.140 render -c tools/labs/vertical/vertical-9x16.html -q draft -f 24 --video-bitrate 7M -o renders/vertical-9x16-test.mp4
"""
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out_dir = root / "tools/labs/vertical"
out_dir.mkdir(parents=True, exist_ok=True)
src = (root / "index.html").read_text()

WINDOWS = [(0.0, 13.75), (19.75, 24.75), (32.75, 41.75)]
REEL = sum(b - a for a, b in WINDOWS)

# ---------------------------------------------------------------- formats
# safe: [x0, y0, x1, y1] where key content may sit. 9:16 keeps clear of the top ~220 px and bottom ~420 px (platform UI).
FORMATS = {
    "9x16": {
        "W": 1080, "H": 1920, "safe": [72, 230, 1008, 1500],
        "s1": {"rowTop": 330, "mark": 170, "wm": 136, "passLeft": 250, "passTop": 1030, "metaTop": 150},
        "s2": {"genBottom": 470, "gen": 190, "ko": 520, "koY": 1150, "l": 186, "l1Top": 640, "l2Top": 830, "barTop": 1070,
               "blockTop": 560, "now": 200, "complex": 132, "hudTop": 240},
        "s3": {"bandTop": 350, "name": 128},
        "s5": {"cols": 4, "cardW": 172, "left": 100, "top": 430, "pitchX": 236, "pitchY": 203, "title": [72, 236, 936, 150],
               "zone": [24, 400, 1056, 1510], "travelY": 860},
        "s9": {"titleTop": 250, "boardTop": 410, "area": 1.0, "rowTop": 540, "mark": 190, "wm": 136, "sigTop": 1000,
               "ruleTop": 1170, "infoTop": 1196, "footTop": 1352},
    },
    "4x5": {
        "W": 1080, "H": 1350, "safe": [60, 60, 1020, 1290],
        "s1": {"rowTop": 120, "mark": 150, "wm": 136, "passLeft": 250, "passTop": 820, "metaTop": 88},
        "s2": {"genBottom": 120, "gen": 190, "ko": 520, "koY": 880, "l": 186, "l1Top": 400, "l2Top": 590, "barTop": 830,
               "blockTop": 330, "now": 200, "complex": 132, "hudTop": 60},
        "s3": {"bandTop": 130, "name": 128},
        "s5": {"cols": 5, "cardW": 160, "left": 80, "top": 250, "pitchX": 190, "pitchY": 250, "title": [72, 70, 936, 150],
               "zone": [24, 230, 1056, 1300], "travelY": 675},
        "s9": {"titleTop": 80, "boardTop": 240, "area": 0.92, "rowTop": 230, "mark": 170, "wm": 136, "sigTop": 650,
               "ruleTop": 820, "infoTop": 846, "footTop": 1010},
    },
}


def css(f):
    W, H = f["W"], f["H"]
    s1, s2, s3, s5, s9 = f["s1"], f["s2"], f["s3"], f["s5"], f["s9"]
    x0, x1 = f["safe"][0], f["safe"][2]
    cw = x1 - x0
    # S3 stacks the art above the text band: kicker (51 px), art 1.6:1 at full width, then name, session title, progress.
    art_w, art_h = cw, round(cw / 1.6)
    art_top = s3["bandTop"] + 81
    names_margin = 81 + art_h + 40 - 51
    return f"""
      html, body {{ width: {W}px; height: {H}px; }}
      #frag-ink {{ width: {W}px; height: {H}px; }}
      /* S1: mark above the wordmark, the pass pressed below them */
      .s1-meta {{ top: {s1['metaTop']}px !important; }}
      /* Clear of the corner register marks. */
      #s1-meta-a {{ left: 130px !important; }}
      #s1-meta-b {{ right: 130px !important; }}
      #s1-row {{ top: {s1['rowTop']}px; height: auto; flex-direction: column; gap: 34px; }}
      #s1-mark {{ width: {s1['mark']}px; height: {s1['mark']}px; }}
      #s1-wm {{ font-size: {s1['wm']}px; margin-top: 0; }}
      #s1-pass {{ left: {s1['passLeft']}px; top: {s1['passTop']}px; }}
      /* S2 */
      #s2-ko {{ width: {W}px; height: {H}px; }}
      #s2-gen {{ left: {x0}px; bottom: {s2['genBottom']}px; font-size: {s2['gen']}px; }}
      #s2-l1 {{ left: {x0}px; top: {s2['l1Top']}px; font-size: {s2['l']}px; }}
      #s2-l2 {{ left: {x0}px; top: {s2['l2Top']}px; font-size: {s2['l']}px; }}
      #s2-bar {{ left: {x0}px; top: {s2['barTop']}px; width: {round(cw * 0.8)}px; }}
      #s2-b .scrim-left {{ width: 100%; background: linear-gradient(90deg, rgba(9, 18, 46, 0.78), rgba(9, 18, 46, 0.5)); }}
      #s2-cream-block {{ left: {x0}px; top: {s2['blockTop']}px; }}
      #s2-now {{ font-size: {s2['now']}px; }}
      #s2-now .line {{ display: block; white-space: nowrap; }}
      #s2-complex {{ margin-top: 50px; font-size: {s2['complex']}px; width: {cw}px; height: {round(s2['complex'] * 2.1)}px; }}
      #s2-complex .copy {{ width: {cw}px; white-space: normal; }}
      .hud {{ top: {s2['hudTop']}px; }}
      #s2-hud-l {{ left: {x0}px !important; }}
      #s2-hud-r {{ right: {W - x1}px !important; }}
      /* S3: art on top, words below */
      #s3-art {{ left: {x0}px; top: {art_top}px; width: {art_w}px; height: {art_h}px; }}
      #s3-band {{ left: {x0}px; top: {s3['bandTop']}px; width: {cw}px; }}
      #s3-names {{ margin-top: {names_margin}px; height: {round(s3['name'] * 1.16)}px; }}
      .s3-name {{ font-size: {s3['name']}px; }}
      .s3-word {{ width: {cw}px; }}
      /* S5: the wall is a 4 or 5 column table, the count reads as a header line */
      #s5-world {{ width: {W}px; height: {H}px; }}
      .s5-slot {{ width: {s5['cardW']}px; height: {round(s5['cardW'] * 274 / 196)}px; }}
      .s5-slot > .poster {{ transform: scale({s5['cardW'] / 300:.4f}); }}
      #s5-title {{ flex-direction: row; align-items: baseline; justify-content: center; gap: 26px; }}
      #s5-title b {{ font-size: 150px; }}
      #s5-title i {{ font-size: 56px; margin-top: 0; }}
      /* S9: partners re-flowed per tier, lockup stacked */
      #s9-pscrim {{ left: 0; right: 0; top: {s9['boardTop'] - 120}px; height: 1000px; }}
      #s9-ptitle {{ top: {s9['titleTop']}px; }}
      #s9-row, #s9-ghost {{ top: {s9['rowTop']}px; height: auto; flex-direction: column; gap: 30px; }}
      .s9-mark {{ width: {s9['mark']}px; height: {s9['mark']}px; }}
      .s9-wm {{ font-size: {s9['wm']}px; margin-top: 0; }}
      #s9-sig {{ left: {x0}px; right: {W - x1}px; top: {s9['sigTop']}px; font-size: 54px; line-height: 1.15; white-space: normal; }}
      #s9-rule {{ left: {x0}px; width: {cw}px; top: {s9['ruleTop']}px; }}
      #s9-info {{ left: {x0}px; right: {W - x1}px; top: {s9['infoTop']}px; flex-direction: column; gap: 14px; }}
      #s9-foot {{ left: {x0}px; right: {W - x1}px; top: {s9['footTop']}px; }}
      .scrim-bottom.s9 {{ height: 80%; }}
"""


BODY = """
    <div id="root" data-composition-id="main" data-start="0" data-duration="__REEL__" data-width="__W__" data-height="__H__">
__FILTERS__
      <section id="s1" class="clip scene" data-start="0" data-duration="3.8" data-track-index="1">
        <svg class="regmark" style="left: 48px; top: 48px" viewBox="0 0 70 70"><circle cx="35" cy="35" r="15" /><path d="M35 0V70M0 35H70" /></svg>
        <svg class="regmark" style="right: 48px; top: 48px" viewBox="0 0 70 70"><circle cx="35" cy="35" r="15" /><path d="M35 0V70M0 35H70" /></svg>
        <svg class="regmark" style="left: 48px; bottom: 48px" viewBox="0 0 70 70"><circle cx="35" cy="35" r="15" /><path d="M35 0V70M0 35H70" /></svg>
        <svg class="regmark" style="right: 48px; bottom: 48px" viewBox="0 0 70 70"><circle cx="35" cy="35" r="15" /><path d="M35 0V70M0 35H70" /></svg>
        <div class="s1-meta lab" id="s1-meta-a">Naomakers · Nantes</div>
        <div class="s1-meta lab" id="s1-meta-b">Première édition · 2026</div>
        <div id="s1-sheetframe">
          <div class="print" id="p-cover"></div>
          <div class="scrim-top" id="s1-scrim"></div>
          <div id="s1-row">
            <div id="s1-mark"></div>
            <div id="s1-wm" class="wordmark"></div>
          </div>
        </div>
        <div id="s1-squeegee"></div>
        <div class="obj metal pass" id="s1-pass"></div>
      </section>

      <section id="s2" class="clip scene" data-start="3.3" data-duration="7" data-track-index="2">
        <div class="layer" id="s2-a">
          <div class="print" id="p-manifesto"></div>
          <div class="scrim-bottom" id="s2-scrim"></div>
          <div class="s2-big it" id="s2-gen"><span class="m it"><span class="ch">générative</span></span></div>
          <svg id="s2-ko" viewBox="0 0 __W__ __H__" aria-hidden="true">
            <defs>
              <mask id="s2-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="__W__" height="__H__">
                <rect width="__W__" height="__H__" fill="#fff" />
                <text id="s2-ko-text" x="40" y="__KOY__" font-family="EB Garamond" font-weight="800" font-size="__KO__" letter-spacing="-20" fill="#000">L’IA</text>
              </mask>
            </defs>
            <rect id="s2-paper" width="__W__" height="__H__" fill="#F9F4EC" mask="url(#s2-mask)" />
            <g mask="url(#s2-mask)"><text id="s2-ko-ghost" x="40" y="__KOY__" font-family="EB Garamond" font-weight="800" font-size="__KO__" letter-spacing="-20" fill="#FE4D1B" style="mix-blend-mode: multiply">L’IA</text></g>
          </svg>
        </div>
        <div class="layer" id="s2-b">
          <div class="print" id="p-miroir"></div>
          <div class="scrim-left"></div>
          <div class="s2-big" id="s2-l1"></div>
          <div class="s2-big it" id="s2-l2"></div>
          <div id="s2-bar"></div>
        </div>
        <div class="layer" id="s2-c" style="background: var(--cream)">
          <div id="s2-cream-block">
            <div id="s2-now"><span class="line" id="s2-now-1"></span><span class="line" id="s2-now-2"></span></div>
            <div id="s2-complex">
              <div class="copy ghost-o" aria-hidden="true">que ça se complique.</div>
              <div class="copy ghost-b" aria-hidden="true">que ça se complique.</div>
              <div class="copy main" id="s2-complex-main"></div>
            </div>
          </div>
        </div>
        <div class="hud lab" id="s2-hud-l">#GenAIDaysNantes</div>
        <div class="hud lab" id="s2-hud-r">L’IA générative · 2026</div>
      </section>

      <section id="s3" class="clip scene" data-start="9.8" data-duration="3.95" data-track-index="3">
        <div id="s3-art">
          <div class="print" id="p-costs"></div>
          <div class="print" id="p-shadow"></div>
          <div class="print" id="p-sovereignty"></div>
          <div class="print" id="p-production"></div>
        </div>
__CROPS__
        <div id="s3-band">
          <div id="s3-kicker" class="lab"><span>Quatre enjeux</span><span id="s3-count">01 / 04</span></div>
          <div id="s3-names">
            <div class="s3-name">Coûts.</div>
            <div class="s3-name">Shadow AI.</div>
            <div class="s3-name">Souveraineté.</div>
            <div class="s3-name">Production.</div>
          </div>
          <div id="s3-words">
            <div class="s3-word">« J’ai consommé mon budget IA en mai. Comment finir l’année ? »</div>
            <div class="s3-word">« Je ne sais pas ce que mes équipes mettent dans ChatGPT »</div>
            <div class="s3-word">« Les Américains ont pris en otage mon SI »</div>
            <div class="s3-word">« Nos POCs ne passent jamais en production »</div>
          </div>
          <div id="s3-progress"><i></i><i></i><i></i><i></i></div>
        </div>
      </section>

      <!-- S5 stays on through the fragment cut into S9 (0.55 s), so the château breaks in over the wall. -->
      <section id="s5" class="clip scene" data-start="13.75" data-duration="5.6" data-track-index="5">
        <div class="layer" id="s5-bg"><div class="print" id="p-speakers"></div></div>
        <div id="s5-world"></div>
        <div id="s5-title"><b id="s5-count">20</b><i>intervenant·es</i></div>
      </section>

      <section id="s9" class="clip scene" data-start="18.75" data-duration="9" data-track-index="8">
        <div id="s9-frame"><div class="print" id="p-chateau"></div></div>
        <div class="scrim-bottom s9"></div>
        <div id="s9-partners">
          <div id="s9-pscrim"></div>
          <div id="s9-ptitle">Nos <i>partenaires</i></div>
        </div>
        <div id="s9-ghost" aria-hidden="true"></div>
        <div id="s9-row"></div>
        <div id="s9-sig"></div>
        <div id="s9-rule"></div>
        <div id="s9-info" class="lab">
          <span id="s9-date">17.11.2026 · Hôtel de Région, Nantes</span>
          <span id="s9-url"><i></i>genai-days-nantes.com</span>
        </div>
        <div id="s9-foot" class="lab">
          <span id="s9-tag">#GenAIDaysNantes</span>
          <span id="s9-coorg"><span>Avec le soutien de</span><span id="s9-region" class="region-logo"></span></span>
        </div>
      </section>

      <canvas id="frag-ink" class="clip" data-start="0" data-duration="__REEL__" data-track-index="9" width="__W__" height="__H__"></canvas>
      <div id="grain" class="clip" data-start="0" data-duration="__REEL__" data-track-index="10"></div>
      <audio id="bgm" src="tools/labs/vertical/music-M2-reel.wav" data-start="0" data-duration="__REEL__" data-track-index="12" data-volume="0.72"></audio>
    </div>
"""

SCENES_JS = r"""
        // ---------------------------------------------------------------- static DOM (tall formats)
        buildPrint("cover", "50% 60%");
        buildPrint("manifesto", "50% 12%");
        buildPrint("miroir", "46% 50%");
        buildPrint("costs");
        buildPrint("shadow");
        buildPrint("sovereignty");
        buildPrint("production");
        buildPrint("speakers", "50% 30%");
        buildPrint("chateau", "50% 40%");

        var s1Mark = $("#s1-mark");
        var s1Arms = {};
        ["orange", "cream"].forEach(function (ink) {
          var layer = el("div", "");
          layer.style.position = "absolute";
          layer.style.inset = "0";
          layer.id = "s1-ink-" + ink;
          ARM_KEYS.concat(["dot"]).forEach(function (key) {
            var svg = markSvg(key, ink === "cream" ? "#F9F4EC" : "#FE4D1B", "mark");
            layer.appendChild(svg);
            (s1Arms[key] = s1Arms[key] || []).push(svg);
          });
          s1Mark.appendChild(layer);
        });
        var s1Letters = buildWordmark($("#s1-wm"), true);
        var passContent = objShell($("#s1-pass"));
        passContent.innerHTML =
          '<div class="head"><div class="wordmark">' + wordmarkHtml() + '</div><div class="markicon"></div></div>' +
          '<div class="body" style="gap: 14px"><div class="lab" style="font-size: 20px">Mardi · Accueil 08:30</div>' +
          '<div class="pdate"><strong>17</strong><span><b>Novembre</b><b>2026</b></span></div></div>' +
          '<div class="pbottom"><div class="pvenue"><strong>Hôtel de Région</strong><span>Nantes</span></div>' +
          '<div class="region-logo" style="width: 150px; height: 72px"></div></div>';

        var s2L1 = splitWords($("#s2-l1"), "est déjà", true);
        var s2L2 = splitWords($("#s2-l2"), "chez vous.", "it");
        var s2Now = splitChars($("#s2-now-1"), "C’est").concat(splitChars($("#s2-now-2"), "maintenant"));
        var s2Complex = splitWords($("#s2-complex-main"), "que ça se complique.", false);

__SPEAKERS__
        // Same table rules as the film (a card only overlaps the top 22 % of a card under it, never the count), on a
        // narrower grid: F.s5.cols columns, cards scaled to F.s5.cardW.
        var S5 = F.s5;
        var S5_CARD = { w: S5.cardW, h: S5.cardW * 274 / 196 };
        var S5_ROWS = Math.ceil(SPEAKERS.length / S5.cols);
        var S5_JIT = S5.cardW / 196;
        var S5_TITLE_BOX = { x: S5.title[0], y: S5.title[1], w: S5.title[2], h: S5.title[3] };
        function s5Base(k) {
          return { x: S5.left + (k % S5.cols) * S5.pitchX, y: S5.top + Math.floor(k / S5.cols) * S5.pitchY };
        }
        function s5Quad(c, inset) {
          var cx = c.x + S5_CARD.w / 2;
          var cy = c.y + S5_CARD.h / 2;
          var a = (c.rot * Math.PI) / 180;
          var cos = Math.cos(a);
          var sin = Math.sin(a);
          var l = -S5_CARD.w / 2 + inset[0];
          var t = -S5_CARD.h / 2 + inset[1];
          var r = S5_CARD.w / 2 - inset[2];
          var b = S5_CARD.h / 2 - inset[3];
          return [[l, t], [r, t], [r, b], [l, b]].map(function (q) {
            return [cx + q[0] * cos - q[1] * sin, cy + q[0] * sin + q[1] * cos];
          });
        }
        function s5Overlap(A, B) {
          return ![A, B].some(function (P) {
            return P.some(function (p1, i) {
              var p2 = P[(i + 1) % P.length];
              var nx = p2[1] - p1[1];
              var ny = p1[0] - p2[0];
              var a = A.map(function (q) { return q[0] * nx + q[1] * ny; });
              var b = B.map(function (q) { return q[0] * nx + q[1] * ny; });
              return Math.max.apply(null, a) < Math.min.apply(null, b) || Math.max.apply(null, b) < Math.min.apply(null, a);
            });
          });
        }
        var S5_FACE = [6, 0.22 * S5_CARD.h, 6, 0];
        var s5TitleQuad = [[S5_TITLE_BOX.x, S5_TITLE_BOX.y], [S5_TITLE_BOX.x + S5_TITLE_BOX.w, S5_TITLE_BOX.y], [S5_TITLE_BOX.x + S5_TITLE_BOX.w, S5_TITLE_BOX.y + S5_TITLE_BOX.h], [S5_TITLE_BOX.x, S5_TITLE_BOX.y + S5_TITLE_BOX.h]];
        var s5Rand = seededRandom(1911);
        var s5Layout = [];
        SPEAKERS.forEach(function (sp, k) {
          var base = s5Base(k);
          var z = (S5_ROWS + 1 - Math.floor(k / S5.cols)) * 30 + (k % S5.cols);
          var pick = null;
          for (var attempt = 0; attempt < 400 && !pick; attempt += 1) {
            var amp = (attempt < 200 ? 1 : attempt < 300 ? 0.6 : 0.3) * S5_JIT;
            var turn = (s5Rand() < 0.5 ? -1 : 1) * (3 + s5Rand() * 4) * (attempt < 200 ? 1 : attempt < 300 ? 0.6 : 0.3);
            var c = { x: base.x + (s5Rand() - 0.5) * 72 * amp, y: base.y + (s5Rand() - 0.5) * 64 * amp, rot: turn, z: z };
            var card = s5Quad(c, [0, 0, 0, 0]);
            var face = s5Quad(c, S5_FACE);
            var inFrame = card.every(function (q) {
              return q[0] > S5.zone[0] && q[0] < S5.zone[2] && q[1] > S5.zone[1] && q[1] < S5.zone[3];
            });
            var clear = inFrame && !s5Overlap(card, s5TitleQuad) && s5Layout.every(function (m) {
              return c.z > m.z ? !s5Overlap(card, s5Quad(m, S5_FACE)) : !s5Overlap(s5Quad(m, [0, 0, 0, 0]), face);
            });
            if (clear) pick = c;
          }
          s5Layout.push(pick || { x: base.x, y: base.y, rot: 0, z: z });
        });
        function s5SlotOf(k) {
          return s5Layout[k];
        }
        var s5Title = $("#s5-title");
        s5Title.style.left = S5_TITLE_BOX.x + "px";
        s5Title.style.top = S5_TITLE_BOX.y + "px";
        s5Title.style.width = S5_TITLE_BOX.w + "px";
        s5Title.style.height = S5_TITLE_BOX.h + "px";
        $("#s5-count").textContent = String(SPEAKERS.length);
        var s5Slots = SPEAKERS.map(function (sp, k) {
          var node = el("div", "s5-slot");
          node.innerHTML = '<div class="poster small"><div class="card"><div class="ph"><img src="assets/speakers/' + sp[0] + '-optimized.webp" alt="" /></div><div class="band"><b>' + sp[1] + '</b><span class="lab">' + sp[2] + "</span></div></div></div>";
          node.dataset.rot = s5Layout[k].rot.toFixed(2);
          node.dataset.z = String(s5Layout[k].z);
          node.style.left = s5Layout[k].x.toFixed(1) + "px";
          node.style.top = s5Layout[k].y.toFixed(1) + "px";
          node.style.zIndex = node.dataset.z;
          $("#s5-world").appendChild(node);
          return node;
        });

__PARTNERS__
        // Tall frames: each tier is split into balanced rows that fit the safe width, rows stacked down the frame.
        var BOARD_W = F.safe[2] - F.safe[0];
        var boardY = F.s9.boardTop;
        var s9Rows = [];
        PARTNER_ROWS.forEach(function (logos, r) {
          var tier = PARTNER_TIERS[r];
          var area = tier.area * F.s9.area;
          var sizes = logos.map(function (logo) {
            var height = Math.min(tier.maxHeight, Math.sqrt(area / (logo[1] * Math.sqrt(logo[2]))));
            return [height * logo[1], height];
          });
          var total = sizes.reduce(function (s, z) { return s + z[0]; }, tier.gap * (sizes.length - 1));
          var n = Math.ceil(total / (BOARD_W * 0.9));
          var per = Math.ceil(logos.length / n);
          for (var start = 0; start < logos.length; start += per) {
            var chunk = sizes.slice(start, start + per);
            var width = chunk.reduce(function (s, z) { return s + z[0]; }, tier.gap * (chunk.length - 1));
            var fit = Math.min(1, BOARD_W / width);
            var rowH = Math.max.apply(null, chunk.map(function (z) { return z[1] * fit; }));
            var row = el("div", "prow");
            row.style.top = boardY + "px";
            row.style.height = rowH + "px";
            row.style.gap = tier.gap * fit + "px";
            row.dataset.tier = String(r);
            logos.slice(start, start + per).forEach(function (logo, i) {
              var tile = el("div", "ptile");
              tile.style.width = chunk[i][0] * fit + "px";
              tile.style.height = chunk[i][1] * fit + "px";
              var mark = el("div", "plogo");
              mark.style.setProperty("--logo", 'url("assets/partners/mono/' + encodeURIComponent(logo[0] + ".png") + '")');
              tile.appendChild(mark);
              row.appendChild(tile);
            });
            $("#s9-partners").appendChild(row);
            s9Rows.push(row);
            boardY += rowH + 34;
          }
          boardY += 26;
        });

        function buildLockup(row, color) {
          var mark = el("div", "s9-mark");
          ARM_KEYS.concat(["dot"]).forEach(function (key) {
            mark.appendChild(markSvg(key, color, "mark"));
          });
          row.appendChild(mark);
          var wm = el("div", "wordmark s9-wm");
          row.appendChild(wm);
          return { mark: mark, letters: buildWordmark(wm, true) };
        }
        var s9Main = buildLockup($("#s9-row"), "#F9F4EC");
        buildLockup($("#s9-ghost"), "#FE4D1B");
        var s9Sig = splitWords($("#s9-sig"), "L’intelligence artificielle, ici et maintenant.", false);

        // ---------------------------------------------------------------- timeline
        function build() {
__HOLDS__
          function T(t) {
            var out = t;
            HOLDS.forEach(function (h) {
              if (t >= h[0]) out += h[1];
            });
            return out;
          }
          var master = gsap.timeline({ paused: true });
          var tl = {
            to: function (a, b, at) { return master.to(a, b, T(at)); },
            fromTo: function (a, b, c, at) { return master.fromTo(a, b, c, T(at)); },
            set: function (a, b, at) { return master.set(a, b, T(at)); },
          };
          var TOTAL = T(28);
          var grainRand = seededRandom(20261117);
          var grain = $("#grain");
          for (var g = 0; g < TOTAL * 15; g += 1) {
            master.set(grain, { backgroundPosition: Math.floor(grainRand() * 512) + "px " + Math.floor(grainRand() * 512) + "px" }, g / 15);
          }

          // ============ S1 (film choreography, squeegee travel on the frame width)
          var cover = prints.cover;
          var COAT = ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"];
          tl.fromTo(".s1-meta", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", stagger: 0.08 }, 0.05);
          tl.fromTo(cover.sheet, { clipPath: COAT[0] }, { clipPath: COAT[1], duration: 0.42, ease: "power1.inOut" }, 0.08);
          tl.fromTo("#s1-squeegee", { x: -120 }, { x: FW + 70, duration: 0.42, ease: "power1.inOut" }, 0.08);
          tl.fromTo(cover.signal, { clipPath: COAT[0] }, { clipPath: COAT[1], duration: 0.4, ease: "power1.inOut" }, DROP - 0.4);
          tl.fromTo("#s1-squeegee", { x: -120 }, { x: FW + 70, duration: 0.4, ease: "power1.inOut", immediateRender: false }, DROP - 0.4);
          tl.set([".regmark", ".s1-meta"], { opacity: 0 }, DROP);
          tl.fromTo(cover.orig, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.inOut" }, DROP + 0.12);
          tl.fromTo("#s1-scrim", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, DROP);
          ARM_KEYS.forEach(function (key, i) {
            var v = ARM_VECTORS[key];
            s1Arms[key].forEach(function (svg) {
              tl.fromTo(svg, { x: v[0] * 220, y: v[1] * 220, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 1.0 + i * 0.03);
            });
          });
          s1Arms.dot.forEach(function (svg) {
            tl.fromTo(svg, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.3, ease: "expo.out" }, 1.2);
          });
          tl.fromTo("#s1-ink-orange", { x: 16, y: 12 }, { x: 5, y: 4, duration: 0.3, ease: "expo.out" }, 1.5);
          tl.fromTo(s1Letters.slice(0, 5), { yPercent: 115 }, { yPercent: 0, duration: 0.5, ease: "expo.out", stagger: 0.045 }, 1.25);
          tl.fromTo(s1Letters.slice(5), { yPercent: 115 }, { yPercent: 0, duration: 0.5, ease: "expo.out", stagger: 0.045 }, 1.55);
          tl.fromTo("#s1-pass", { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, 1.9);
          tl.fromTo("#s1-pass", { scale: 1.16, rotation: 6, y: -24, "--lift": 1 }, { scale: 1, rotation: 2, y: 0, "--lift": 0, duration: 0.3, ease: "power2.in" }, 1.9);
          tl.fromTo("#s1-pass", { "--sx": "-20%" }, { "--sx": "30%", duration: 0.25, ease: "power2.out" }, 2.22);
          fragment(tl, "#s2", 2.55, 0.5, 301, "ltr");

          // ============ S2 (unchanged choreography)
          var koText = $("#s2-ko-text");
          var koGhost = $("#s2-ko-ghost");
          tl.fromTo(koGhost, { x: 30, y: 22 }, { x: 0, y: 0, duration: 0.26, ease: "expo.out" }, 3.0);
          tl.to(koGhost, { opacity: 0, duration: 0.2, ease: "none" }, 3.18);
          register(tl, "manifesto", 3.0, [30, 22]);
          tl.fromTo(prints.manifesto.host, { scale: 1.08 }, { scale: 1, duration: 1.5, ease: "power2.out" }, 2.55);
          var bbox = koText.getBBox();
          var holeX = bbox.x + bbox.width * 0.56;
          var holeY = bbox.y + bbox.height * 0.55;
          tl.fromTo(koText, { scale: 1 }, { scale: 26, svgOrigin: holeX + " " + holeY, duration: 0.3, ease: "power4.in" }, 3.2);
          tl.set("#s2-ko", { opacity: 0 }, 3.5);
          tl.fromTo("#s2-scrim", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, 3.45);
          tl.fromTo("#s2-gen .ch", { yPercent: 110 }, { yPercent: 0, duration: 0.42, ease: "expo.out" }, 3.5);
          fragment(tl, "#s2-b", 3.72, 0.34, 402, "rise");
          register(tl, "miroir", 4.0, [30, 22]);
          tl.fromTo(prints.miroir.host, { scale: 1.06 }, { scale: 1, duration: 1.2, ease: "power2.out" }, 3.8);
          tl.fromTo(s2L1, { yPercent: 110 }, { yPercent: 0, duration: 0.42, ease: "power4.out", stagger: 0.07 }, 4.0);
          tl.fromTo(s2L2, { yPercent: 110 }, { yPercent: 0, duration: 0.42, ease: "power4.out", stagger: 0.07 }, 4.5);
          tl.fromTo("#s2-bar", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "expo.out" }, 4.62);
          tl.set("#s2-c", { opacity: 0 }, 0);
          tl.set("#s2-c", { opacity: 1 }, 5.0);
          tl.set("#s2-a", { opacity: 0 }, 4.08);
          tl.set("#s2-b", { opacity: 0 }, 5.0);
          tl.set(["#s2-hud-l", "#s2-hud-r"], { color: "#393636" }, 0);
          tl.set(["#s2-hud-l", "#s2-hud-r"], { color: "#F9F4EC" }, 3.5);
          tl.set(["#s2-hud-l", "#s2-hud-r"], { color: "#393636" }, 5.0);
          tl.fromTo(s2Now, { rotationX: -95, opacity: 0 }, { rotationX: 0, opacity: 1, duration: 0.5, ease: "expo.out", stagger: 0.022 }, 5.0);
          var ghosts = $$("#s2-complex .ghost-b, #s2-complex .ghost-o");
          tl.set(ghosts, { opacity: 0 }, 0);
          var gap = 0.05;
          var at = 5.75;
          s2Complex.forEach(function (wd) {
            tl.fromTo(wd, { x: 230, opacity: 0.35 }, { x: 0, opacity: 1, duration: 0.3, ease: "power4.out", immediateRender: false }, at);
            at += gap;
            gap *= 0.84;
          });
          tl.set(s2Complex, { opacity: 0 }, 0);
          tl.set(ghosts, { opacity: 1 }, 6.0);
          var tear = seededRandom(1711);
          for (var f = 0; f < 13; f += 1) {
            var amp = 28 * (1 - f / 13);
            tl.set("#s2-complex .ghost-o", { x: (tear() - 0.3) * amp * 2, y: (tear() - 0.5) * amp * 0.6 }, 6.0 + f / 30);
            tl.set("#s2-complex .ghost-b", { x: -(tear() - 0.3) * amp * 2, y: (tear() - 0.5) * amp * 0.6 }, 6.0 + f / 30);
          }
          tl.set(ghosts, { x: 0, y: 0 }, 6.44);
          tl.set("#s2-complex .ghost-o", { x: 5, y: 3 }, 6.44);

          // ============ S3 (unchanged choreography; the window ends on the third issue)
          var words = $$(".s3-word");
          var names = $$(".s3-name");
          tl.fromTo("#s3-kicker", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 6.6);
          tl.fromTo("#s3-progress", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, 6.7);
          tl.fromTo(".s3-crop", { scale: 0 }, { scale: 1, duration: 0.3, ease: "expo.out", stagger: 0.04 }, 6.6);
          var issueNames = ["costs", "shadow", "sovereignty", "production"];
          var count = $("#s3-count");
          pull(tl, "costs", 6.55, { dir: "right", dur: 0.36, offset: [40, 26], register: 7.0 });
          tl.set("#s2", { opacity: 0 }, 6.92);
          ["shadow", "sovereignty", "production"].forEach(function (name, i) {
            var beat = 7.5 + i * 0.5;
            pull(tl, name, beat - 0.22, { dir: "right", dur: 0.2, offset: [30, 20], register: beat });
          });
          issueNames.forEach(function (name, i) {
            tl.fromTo(prints[name].host, { scale: 1.08 }, { scale: 1, duration: 0.9, ease: "power2.out" }, i === 0 ? 6.55 : 7.28 + (i - 1) * 0.5);
          });
          [7.0, 7.5, 8.0, 8.5].forEach(function (beat, i) {
            tl.fromTo(names[i], { yPercent: 105 }, { yPercent: 0, duration: 0.34, ease: "power4.out" }, beat);
            tl.fromTo(words[i], { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, ease: "power3.out" }, beat + 0.06);
            if (i < 3) {
              tl.to(names[i], { yPercent: -105, duration: 0.18, ease: "power4.in" }, beat + 0.32);
              tl.to(words[i], { y: -120, opacity: 0, duration: 0.18, ease: "power4.in" }, beat + 0.32);
            }
            tl.set(count, { textContent: "0" + (i + 1) + " / 04" }, beat);
            tl.fromTo($$("#s3-progress i")[i], { "--fill": 0 }, { "--fill": 1, duration: 0.35, ease: "expo.out" }, beat);
          });

          // ============ S5 (film travelling, re-framed: card at 40 % of the frame width, beam on the frame centre)
          var S5_AT = T(12.0);
          var S5_LEN = T(15.05) - S5_AT;
          tl.set(prints.speakers.orig, { opacity: 1 }, 12.0);
          tl.fromTo("#s5-bg", { scale: 1.3, filter: "blur(18px)" }, { scale: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, 12.0);
          var S5_SLOW = 1.12;
          var S5_ZOOM = (0.4 * FW) / S5_CARD.w;
          var P0_LEFT = 0.22 * FW;
          var APPEAR_X = FW - 220;
          // The third poster appears 0.81 s in, as in the film, so the avalanche lands on the same beat.
          var S5_SPEED = (P0_LEFT + (s5SlotOf(2).x - s5SlotOf(0).x) * S5_ZOOM - APPEAR_X) / 0.81 / S5_ZOOM;
          var S5_CX0 = s5SlotOf(0).x - (P0_LEFT - FW / 2) / S5_ZOOM;
          var S5_CY0 = s5SlotOf(0).y + S5_CARD.h / 2;
          var s5Paste = [0, 1, 2].map(function (k) {
            return k === 0 ? 0 : Math.max(0.12, (FW / 2 + (s5SlotOf(k).x - S5_CX0) * S5_ZOOM - APPEAR_X) / (S5_SPEED * S5_ZOOM));
          });
          var S5_BURST = s5Paste[2] + 0.6 * S5_SLOW;
          var S5_SETTLE = 0.75 * S5_SLOW;
          var S5_LAND = S5_BURST + S5_SETTLE + 0.1 * S5_SLOW;
          var s5PullEase = gsap.parseEase("expo.inOut");
          var s5World = $("#s5-world");
          var S5_BEAM_R = 0.33 * FW;
          var s5Travellers = [0, 1, 2].map(function (k) {
            return s5Slots[k].querySelector(".poster");
          });
          function s5Camera(t) {
            var p = s5PullEase(Math.max(0, Math.min(1, (t - S5_BURST) / S5_SETTLE)));
            var drift = Math.max(0, Math.min(1, (t - S5_LAND - 0.25) / (S5_LEN - S5_LAND - 0.25)));
            var z = (S5_ZOOM + (1 - S5_ZOOM) * p) * (1 + 0.015 * drift * drift * (3 - 2 * drift));
            var cx = S5_CX0 + S5_SPEED * t + (FW / 2 - S5_CX0 - S5_SPEED * t) * p;
            var cy = S5_CY0 + (FH / 2 - S5_CY0) * p;
            var sy = S5.travelY + (FH / 2 - S5.travelY) * p;
            s5World.style.transform = "translate(" + (FW / 2 - cx * z).toFixed(2) + "px," + (sy - cy * z).toFixed(2) + "px) scale(" + z.toFixed(4) + ")";
            s5Travellers.forEach(function (poster, k) {
              var screenX = FW / 2 + (s5SlotOf(k).x + S5_CARD.w / 2 - cx) * z;
              var d = Math.abs(screenX - FW / 2);
              var bell = (d < S5_BEAM_R ? 0.5 + 0.5 * Math.cos((Math.PI * d) / S5_BEAM_R) : 0) * (1 - p);
              var g = 1 + 0.27 * bell;
              poster.style.transform = "translate(" + (-(S5_CARD.w / 2) * (g - 1)).toFixed(2) + "px," + (-(S5_CARD.h / 2) * (g - 1)).toFixed(2) + "px) scale(" + ((S5_CARD.w / 300) * g).toFixed(4) + ")";
              poster.style.filter = bell > 0.001 ? "brightness(" + (1 + 0.12 * bell).toFixed(3) + ")" : "none";
              s5Slots[k].style.zIndex = bell > 0.001 ? "200" : s5Slots[k].dataset.z;
            });
          }
          s5Camera(0);
          master.fromTo(driver(s5Camera), { v: 0 }, { v: S5_LEN, duration: S5_LEN, ease: "none" }, S5_AT);
          s5Paste.forEach(function (at, k) {
            var rot = Number(s5Slots[k].dataset.rot);
            master.set(s5Slots[k], { opacity: 1 }, S5_AT + at);
            master.fromTo(s5Slots[k], { scale: 0.55, rotation: rot + 3, "--lift": 1 }, { scale: 1, rotation: rot, "--lift": 0, duration: 0.5 * S5_SLOW, ease: "expo.out" }, S5_AT + at);
          });
          var s5Rest = [];
          for (var s5k = 3; s5k < SPEAKERS.length; s5k += 1) s5Rest.push(s5k);
          s5Rest.sort(function (a, b) {
            return ((a * 7919) % 31) - ((b * 7919) % 31);
          });
          var s5Fall = seededRandom(4242);
          s5Rest.forEach(function (k, i) {
            var rot = Number(s5Slots[k].dataset.rot);
            var at = S5_AT + S5_BURST + (0.08 + i * 0.022) * S5_SLOW;
            var dx = (s5Fall() - 0.5) * 70 * S5_JIT;
            var dy = (s5Fall() - 0.5) * 50 * S5_JIT;
            var drot = (s5Fall() - 0.5) * 14;
            master.fromTo(s5Slots[k], { opacity: 1, x: dx + (s5Fall() - 0.5) * 300, y: -FH - 220 - s5Fall() * 300, rotation: rot + (s5Fall() - 0.5) * 50, scale: 1.1, "--lift": 1 }, { x: dx, y: dy, rotation: rot + drot, scale: 1, "--lift": 0.3, duration: 0.32 * S5_SLOW, ease: "power2.in" }, at);
            master.to(s5Slots[k], { x: 0, y: 0, rotation: rot, "--lift": 0, duration: 0.32 * S5_SLOW, ease: "power3.out" }, at + (0.32 + 0.12 + s5Fall() * 0.12) * S5_SLOW);
          });
          master.fromTo(s5Title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, S5_AT + S5_LAND);
          fragment(tl, "#s9", 21.5, 0.55, 905, "rise");

          // ============ S9 (unchanged choreography, board rows staggered per tier)
          tl.fromTo("#s9-frame", { scale: 1.22, transformOrigin: "50% 30%" }, { scale: 1.12, duration: 7.5, ease: "power2.out" }, 21.5);
          register(tl, "chateau", 22.0, [38, 26]);
          tl.fromTo("#s9-pscrim", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 22.05);
          tl.fromTo("#s9-ptitle", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 22.15);
          var seen = {};
          s9Rows.forEach(function (row) {
            var r = Number(row.dataset.tier);
            var sub = seen[r] || 0;
            seen[r] = sub + 1;
            tl.fromTo(row.children, { opacity: 0, y: 34, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power3.out", stagger: 0.045 }, 22.35 + r * 0.25 + sub * 0.1);
          });
          tl.to("#s9-partners .ptile", { opacity: 0, y: -40, duration: 0.3, ease: "power2.in", stagger: 0.012 }, 24.65);
          tl.to("#s9-ptitle", { opacity: 0, duration: 0.25, ease: "none" }, 24.75);
          tl.to("#s9-pscrim", { opacity: 0, duration: 0.4, ease: "power1.in" }, 24.75);
          tl.fromTo(s9Main.mark.children, { scale: 0.4, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.45, ease: "expo.out", stagger: 0.03 }, 25);
          tl.fromTo(s9Main.letters, { yPercent: 115 }, { yPercent: 0, duration: 0.5, ease: "expo.out", stagger: 0.04 }, 25.05);
          tl.fromTo("#s9-ghost", { opacity: 0, x: 42, y: 30 }, { opacity: 1, x: 7, y: 5, duration: 0.4, ease: "expo.out" }, 25.45);
          var sigGap = 0.05;
          var sigAt = 25.75;
          s9Sig.forEach(function (wd) {
            tl.fromTo(wd, { x: 230, opacity: 0 }, { x: 0, opacity: 1, duration: 0.34, ease: "power4.out" }, sigAt);
            sigAt += sigGap;
            sigGap *= 0.84;
          });
          tl.fromTo("#s9-rule", { scaleX: 0, transformOrigin: "50% 50%" }, { scaleX: 1, duration: 0.6, ease: "expo.out" }, 26.05);
          tl.fromTo("#s9-date", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 26.2);
          tl.fromTo("#s9-url", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 26.3);
          tl.fromTo("#s9-foot", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 26.5);
          tl.to("#s9-ghost", { x: 0, y: 0, duration: 0.3, ease: "expo.out" }, 27);

          // The reel: three windows of the film's master timeline, back to back.
          var reel = gsap.timeline({ paused: true });
          var cursor = 0;
          WINDOWS.forEach(function (w) {
            reel.add(master.tweenFromTo(w[0], w[1], { ease: "none" }), cursor);
            cursor += w[1] - w[0];
          });
          window.__timelines["main"] = reel;
        }

        Promise.all([
          document.fonts.load('700 100px "EB Garamond"'),
          document.fonts.load('800 100px "EB Garamond"'),
          document.fonts.load('400 100px "EB Garamond"'),
          document.fonts.load('italic 600 100px "EB Garamond"'),
          document.fonts.load('700 30px "Arial Label"'),
        ]).then(build, build);
      })();
    </script>
  </body>
</html>
"""


def between(a, b, include_b=False):
    i = src.index(a)
    j = src.index(b, i)
    return src[i : j + (len(b) if include_b else 0)]


head = src[: src.index("    </style>")]
head = head.replace("  <head>\n", '  <head>\n    <base href="../../../" />\n', 1)
filters = between('      <svg width="0" height="0"', "      </svg>", True)
helpers = between("      (function () {", "        // ---------------------------------------------------------------- static DOM")
helpers = "\n".join(l for l in helpers.split("\n") if not re.match(r"\s*buildPrint\(\"", l))
# Frame sizes only: file names such as cover_v2-1920-optimized keep their digits.
helpers = re.sub(r"(?<![-\w])1920\b(?!-)", "FW", helpers)
helpers = re.sub(r"(?<![-\w])1080\b(?!-)", "FH", helpers)
helpers = helpers.replace("var rows = 22;", "var rows = Math.round((22 * FH) / 1080);")
speakers = between("        // Live /speakers order", "        // The final arrangement")
partners = between("        var PARTNER_ROWS = [", "        var PARTNER_ROW_MAX_WIDTH")
holds = re.search(r"          var HOLDS = \[\[.*?\]\];", src).group(0)

for name, f in FORMATS.items():
    W, H = f["W"], f["H"]
    art_w = f["safe"][2] - f["safe"][0]
    art_h = round(art_w / 1.6)
    ax, ay = f["safe"][0], f["s3"]["bandTop"] + 81
    crops = "\n".join(
        f'        <i class="s3-crop" style="left: {x - 8}px; top: {y - 8}px"></i>' for y in (ay, ay + art_h) for x in (ax, ax + art_w)
    )
    page = head.replace('content="width=1920, height=1080"', f'content="width={W}, height={H}"')
    page = page.replace("<title>GENAI DAYS 2026 · Showreel v3</title>", f"<title>GENAI DAYS · vertical {name}</title>")
    page += css(f) + "    </style>\n  </head>\n  <body>"
    body = BODY.replace("__FILTERS__", filters).replace("__CROPS__", crops)
    body = body.replace("__KOY__", str(f["s2"]["koY"])).replace("__KO__", str(f["s2"]["ko"]))
    body = body.replace("__REEL__", f"{REEL:g}").replace("__W__", str(W)).replace("__H__", str(H))
    js = helpers.replace(
        '"use strict";\n',
        '"use strict";\n        var F = %s;\n        var FW = F.W;\n        var FH = F.H;\n        var WINDOWS = %s;\n' % (json.dumps(f), json.dumps(WINDOWS)),
        1,
    )
    script = SCENES_JS.replace("__SPEAKERS__", speakers).replace("__PARTNERS__", partners).replace("__HOLDS__", holds)
    (out_dir / f"vertical-{name}.html").write_text(page + body + "\n    <script>\n" + js + script)
    print(f"tools/labs/vertical/vertical-{name}.html: {W}x{H}, {REEL:g} s")

# Music cut on the same windows, 12 ms fades at each join so the splices do not click.
music = root / "assets/audio/music-M2.wav"
reel_wav = out_dir / "music-M2-reel.wav"
parts = []
for i, (a, b) in enumerate(WINDOWS):
    parts.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b - a - 0.012:.3f}:d=0.012[a{i}]")
graph = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(WINDOWS))) + f"concat=n={len(WINDOWS)}:v=0:a=1[out]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(music), "-filter_complex", graph, "-map", "[out]", str(reel_wav)], check=True)
print(f"{reel_wav.relative_to(root)}: {REEL:g} s")
