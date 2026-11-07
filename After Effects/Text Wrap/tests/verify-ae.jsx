/* Full check inside After Effects. Needs $.global.TW_OUT, TW_FRAMES, TW_SCRIPT.
 * $.global.TW_ONLY, a regular expression, limits the run to the matching steps.
 * Works in throwaway comps and removes them at the end; never saves the project. */
(function () {
    var OUT = new File($.global.TW_OUT), DIR = $.global.TW_FRAMES;
    OUT.encoding = 'UTF-8'; OUT.open('w'); OUT.close();
    function L(s) { OUT.open('a'); OUT.write(String(s) + '\n'); OUT.close(); }
    function why(e) { var m = '?', l = '?'; try { m = e.message; } catch (x) {} try { l = e.line; } catch (x) {} return m + ' @' + l; }
    function step(name, f) { if ($.global.TW_ONLY && !$.global.TW_ONLY.test(name)) return; try { L('OK  ' + name + ': ' + String(f())); } catch (e) { L('BAD ' + name + ': ' + why(e)); } }
    var alerts = [];
    $.global.alert = function (m) { alerts.push(String(m)); };
    $.global.TEXT_WRAP_TEST = true;
    $.evalFile(new File($.global.TW_SCRIPT));
    $.global.TEXT_WRAP_TEST = false;
    var API = $.global.TEXT_WRAP_API, proj = app.project, doc = API.textDoc;
    var made = [];
    function comp(name, fps, dur) { var c = proj.items.addComp('TWT ' + name, 1000, 700, 1, dur || 4, fps || 25); c.bgColor = [1, 1, 1]; made.push(c); return c; }
    function text(c, body, size, leading) {
        var t = c.layers.addText(body), d = doc(t).value;
        t.name = 'T'; d.font = 'ArialMT'; d.fontSize = size || 22; d.tracking = 0; d.autoLeading = false; d.leading = leading || 28;
        d.applyFill = true; d.fillColor = [0, 0, 0]; d.applyStroke = false; doc(t).setValue(d);
        t.property('ADBE Transform Group').property('ADBE Position').setValue([60, 80]);
        return t;
    }
    function shape(c, name, kind, a, color) {
        var l = c.layers.addShape(); l.name = name;
        var g = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'), s = g.property('ADBE Vectors Group');
        var m = { ellipse: 'ADBE Vector Shape - Ellipse', rect: 'ADBE Vector Shape - Rect', star: 'ADBE Vector Shape - Star' };
        if (kind === 'path') {
            var p = s.addProperty('ADBE Vector Shape - Group'), sh = new Shape();
            sh.vertices = a; sh.closed = true; p.property('ADBE Vector Shape').setValue(sh);
        } else {
            var q = s.addProperty(m[kind]);
            if (kind === 'ellipse') q.property('ADBE Vector Ellipse Size').setValue(a);
            if (kind === 'rect') { q.property('ADBE Vector Rect Size').setValue(a); q.property('ADBE Vector Rect Roundness').setValue(40); }
            if (kind === 'star') { q.property('ADBE Vector Star Points').setValue(5); q.property('ADBE Vector Star Outer Radius').setValue(a[0]); q.property('ADBE Vector Star Inner Radius').setValue(a[1]); }
        }
        s.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(color || [0.8, 0.88, 1, 1]);
        return l;
    }
    function area(c) { var l = shape(c, 'A', 'rect', [880, 580], [0.97, 0.97, 0.97, 1]); l.property('ADBE Transform Group').property('ADBE Position').setValue([500, 350]); return l; }
    function pos(l, p) { l.property('ADBE Transform Group').property('ADBE Position').setValue(p); }
    function errs(c, t) {
        var n = API.helperNames(t), list = [n.metrics, n.cache, n.engine], o = [];
        for (var i = 0; i < list.length; i++) { var e = doc(c.layer(list[i])).expressionError; if (e) o.push(list[i] + ': ' + e); }
        var an = t.property('ADBE Text Properties').property('ADBE Text Animators');
        for (var a = 1; a <= an.numProperties; a++) { var x = an.property(a).property('ADBE Text Selectors').property(1).property('ADBE Text Expressible Amount').expressionError; if (x) o.push(an.property(a).name + ': ' + x); }
        return o.length ? ' EXPR ERR ' + o.join(' ; ') : '';
    }
    function shot(c, t, name) { for (var i = c.numLayers; i >= 1; i--) if (c.layer(i) instanceof TextLayer && c.layer(i).enabled) c.layer(i).moveToBeginning(); c.saveFrameToPng(t, new File(DIR + '/' + name + '.png')); }
    function mode(t) { return t.property('ADBE Text Properties').property('ADBE Text Animators').property(1).property('ADBE Text Selectors').property(1).property('ADBE Text Range Type2').value; }
    function st(c, t, at) { c.time = at || 0; return API.status(t) + errs(c, t); }
    var lorem = '';
    var pool = 'il testo scorre attorno alla forma animata mentre ogni parola resta intera e si sposta nella prima riga libera dove trova spazio sufficiente senza mai essere spezzata'.split(' ');
    for (var w = 0; w < 110; w++) lorem += pool[w % pool.length] + (w === 54 ? '\r' : ' ');
    lorem = lorem.replace(/\s+$/, '');

    // A. demo sweep for the pixel check
    step('demo', function () { API.createDemo(); return 'ok'; });
    var demo = null;
    for (var j = 1; j <= proj.numItems; j++) if (proj.item(j).name === 'DEMO - Text Wrap') demo = proj.item(j);
    if (demo) made.push(demo);
    step('demo sweep', function () {
        var t = demo.layer('Testo'), circle = demo.layer('Esclusione'), lines = [];
        for (var f = 0; f <= 100; f += 5) {
            var time = f / 25, p = circle.property('ADBE Transform Group').property('ADBE Position').valueAtTime(time, false);
            lines.push(f + ' ' + p[0].toFixed(3) + ' ' + p[1].toFixed(3));
            shot(demo, time, 'sweep_' + f);
        }
        var m = new File(DIR + '/sweep.txt'); m.open('w'); m.write(lines.join('\n')); m.close();
        return st(demo, t, 1);
    });
    // B. live edits
    step('live edits', function () {
        var c = comp('live'), t = text(c, 'Parole iniziali del testo'), a = area(c), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [500, 350]);
        API.install(c, t, [a], [e]);
        var s0 = st(c, t);
        var d = doc(t).value; d.text = lorem; doc(t).setValue(d);
        var s1 = st(c, t);
        d = doc(t).value; d.fontSize = 34; d.leading = 42; doc(t).setValue(d);
        var s2 = st(c, t); shot(c, 0, 'live_big');
        t.name = 'Rinominato';
        a.name = 'Area rinominata';
        var s3 = st(c, t);
        return s0 + ' -> ' + s1 + ' -> ' + s2 + ' -> rename ' + s3;
    });
    // C. geometry
    step('star+rotated+scaled', function () {
        var c = comp('star'), t = text(c, lorem), a = area(c), e = shape(c, 'E', 'star', [190, 80]);
        pos(e, [500, 350]); e.property('ADBE Transform Group').property('ADBE Rotate Z').setValue(20);
        e.property('ADBE Transform Group').property('ADBE Scale').setValue([120, 80]);
        API.install(c, t, [a], [e]); shot(c, 0, 'star'); return st(c, t) + ' basedOn ' + mode(t);
    });
    step('path area + group transform', function () {
        var c = comp('path'), t = text(c, lorem, 18, 23);
        var a = shape(c, 'A', 'path', [[500, 40], [960, 350], [500, 660], [40, 350]], [0.97, 0.97, 0.97, 1]); pos(a, [0, 0]);
        var e = shape(c, 'E', 'rect', [160, 120]);
        pos(e, [0, 0]); e.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
        var gt = e.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group');
        gt.property('ADBE Vector Position').setValue([500, 350]); gt.property('ADBE Vector Rotation').setValue(30);
        API.install(c, t, [a], [e]); shot(c, 0, 'path'); return st(c, t);
    });
    step('mask + parent', function () {
        var c = comp('mask'), t = text(c, lorem), a = area(c);
        var sol = c.layers.addSolid([0.8, 0.9, 0.8], 'S', 300, 300, 1); pos(sol, [420, 350]);
        var m = sol.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = [[150, 0], [300, 300], [0, 300]]; sh.closed = true; m.property('ADBE Mask Shape').setValue(sh);
        var nul = c.layers.addNull(); pos(nul, [500, 350]); sol.parent = nul; nul.property('ADBE Transform Group').property('ADBE Position').setValue([620, 350]);
        API.install(c, t, [a], [sol]); shot(c, 0, 'mask'); return st(c, t);
    });
    step('plain layer bounds', function () {
        var c = comp('bounds'), t = text(c, lorem), a = area(c), sol = c.layers.addSolid([0.8, 0.8, 0.9], 'S', 240, 160, 1); pos(sol, [500, 300]);
        API.install(c, t, [a], [sol]); shot(c, 0, 'bounds'); return st(c, t);
    });
    // D. text cases
    step('alignments', function () {
        var c = comp('align'), t = text(c, lorem, 18, 23), a = area(c), e = shape(c, 'E', 'ellipse', [220, 220]); pos(e, [500, 350]);
        API.install(c, t, [a], [e]);
        var fx = t.property('ADBE Effect Parade'), o = [];
        for (var v = 1; v <= 3; v++) { fx.property('TW Allineamento').property(1).setValue(v); o.push(st(c, t)); shot(c, 0, 'align_' + v); }
        fx.property('TW Allineamento').property(1).setValue(4); fx.property('TW Giustifica ultima riga').property(1).setValue(1); shot(c, 0, 'align_final');
        return o.join(' / ');
    });
    step('overflow', function () {
        var c = comp('over'), t = text(c, lorem, 40, 50), a = shape(c, 'A', 'rect', [400, 200]); pos(a, [500, 350]);
        API.install(c, t, [a], []);
        var s0 = st(c, t); shot(c, 0, 'overflow_show');
        t.property('ADBE Effect Parade').property('TW Overflow').property(1).setValue(2);
        var s1 = st(c, t); shot(c, 0, 'overflow_hide');
        return s0 + ' / ' + s1;
    });
    step('whitespace', function () {
        var c = comp('ws'), t = text(c, '  rientro iniziale ben-fatto ciao mondo unito  doppio\r\rdopo stretto riga vuota\ttab fine', 30, 40), a = area(c);
        API.install(c, t, [a], []);
        var fx = t.property('ADBE Effect Parade'); fx.property('TW Allineamento').property(1).setValue(1);
        shot(c, 0, 'ws'); return st(c, t);
    });
    step('symbols', function () {
        var body = '', extra = ['freccia \u2192 qui', '1920\u00d71080', 'caff\u00e8 e\u0301 ok', 'emoji \ud83d\ude00 fine', 'famiglia \ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67 unita', 'bandiera \ud83c\uddee\ud83c\uddf9 italia', 'tratto \u2014 lungo', 'a \u2022 b', 'x = y'];
        for (var i = 0; i < 60; i++) body += pool[i % pool.length] + ' ' + extra[i % extra.length] + (i % 12 === 11 ? '\r' : ' ');
        var c = comp('sym'), t = text(c, body.replace(/\s+$/, ''), 20, 26), a = area(c), e = shape(c, 'E', 'rect', [240, 240]); pos(e, [500, 350]);
        API.install(c, t, [a], [e]);
        t.property('ADBE Effect Parade').property('TW Allineamento').property(1).setValue(1);
        shot(c, 0, 'symbols'); return st(c, t) + ' basedOn ' + mode(t);
    });
    step('glyphless symbols, word mode', function () {
        var body = ''; for (var i = 0; i < 70; i++) body += pool[i % pool.length] + ((i % 7 === 3) ? ' \u2192 \u2714 \u2605 ' : ' ');
        var c = comp('nog'), t = text(c, body.replace(/\s+$/, ''), 22, 28), d = doc(t).value;
        d.font = 'NHaasGroteskDSPro-75Bd'; doc(t).setValue(d);
        var a = area(c), e = shape(c, 'E', 'rect', [240, 240]); pos(e, [500, 350]);
        API.install(c, t, [a], [e]); t.property('ADBE Effect Parade').property('TW Allineamento').property(1).setValue(1);
        shot(c, 0, 'nog'); return st(c, t) + ' basedOn ' + mode(t);
    });
    step('emoji added after apply', function () {
        var c = comp('late'), t = text(c, 'testo semplice senza simboli'), a = area(c); API.install(c, t, [a], []);
        var d = doc(t).value; d.text = 'testo con emoji \ud83d\ude00 aggiunta'; doc(t).setValue(d);
        var s0 = st(c, t), m0 = mode(t); API.install(c, t, [a], []); return s0 + ' (mode ' + m0 + ') -> ' + st(c, t) + ' (mode ' + mode(t) + ')';
    });
    step('box text', function () {
        var c = comp('box'), b = c.layers.addBoxText([700, 400], lorem), d = doc(b).value; b.name = 'B';
        d.font = 'ArialMT'; d.fontSize = 20; d.autoLeading = false; d.leading = 26; d.tracking = 0; d.applyFill = true; d.fillColor = [0, 0, 0]; d.applyStroke = false; doc(b).setValue(d); pos(b, [500, 350]);
        var e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [500, 350]);
        var t = API.install(c, b, [], [e]); shot(c, 0, 'box');
        return st(c, t) + ' original enabled=' + b.enabled + ' name=' + b.name;
    });
    step('fps 23.976 + duplicate names', function () {
        var c = comp('fps', 23.976), t = text(c, lorem), a = area(c), e = shape(c, 'T', 'ellipse', [200, 200]); pos(e, [500, 350]);
        var r = API.install(c, t, [a], [e]); shot(c, 0, 'fps'); e.moveToEnd(); return st(c, r) + ' names ' + r.name + '/' + e.name + ' after reorder ' + st(c, r);
    });
    step('rotated text layer', function () {
        var c = comp('rot'), t = text(c, lorem), a = area(c), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [500, 350]);
        t.property('ADBE Transform Group').property('ADBE Rotate Z').setValue(10);
        API.install(c, t, [a], [e]); shot(c, 0, 'rot'); return st(c, t);
    });
    // Any edit in the comp re-runs the cache, and keyframed renders never show it:
    // measuring on every mouse move is what made dragging a shape lag.
    step('drag keeps measures', function () {
        var c = comp('drag'), t = text(c, lorem), a = area(c), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [300, 300]);
        API.install(c, t, [a], [e]);
        var n = API.helperNames(t), ca = doc(c.layer(n.cache)), en = doc(c.layer(n.engine));
        function layoutNow() { return en.valueAtTime(0, false).text; }
        function expect(what, stored, before) {
            var now = layoutNow(), isStored = ca.valueAtTime(0, false).text === '=';
            if (isStored !== stored) throw new Error(what + ': stored ' + isStored);
            if (now === before) throw new Error(what + ': layout did not change');
            return now;
        }
        var layout = expect('apply', true, '');
        layout = expect('drag', true, layout = (pos(e, [640, 420]), layout));
        var d = doc(t).value; d.fontSize = 30; d.leading = 36; doc(t).setValue(d);
        layout = expect('font size', false, layout);
        API.install(c, t, [a], [e]);
        layout = expect('reapply', true, '');
        d = doc(t).value; d.text = 'solo poche parole adesso'; doc(t).setValue(d);
        expect('text edit', false, layout);
        return st(c, t);
    });
    // Blocks: what the user sees must not change when a wrap is applied.
    function panelFor(c) {
        c.openInViewer();
        var w = API.buildUI(null), buttons = {}, list = null, label = null;
        (function find(g) { for (var i = 0; i < g.children.length; i++) { var k = g.children[i]; if (k.type === 'button') buttons[k.text] = k; if (k.type === 'listbox') list = k; if (k.type === 'statictext') label = k; if (k.children && k.children.length) find(k); } })(w);
        return { window: w, list: function () { return list; }, statusText: function () { return label.text; }, click: function (name, layers) {
            for (var i = 1; i <= c.numLayers; i++) c.layer(i).selected = false;
            for (var n = 0; n < layers.length; n++) layers[n].selected = true;
            buttons[name].notify('onClick');
        } };
    }
    function box(c, name, size, at) {
        var b = c.layers.addBoxText(size, lorem), d = doc(b).value; b.name = name;
        d.font = 'ArialMT'; d.fontSize = 22; d.autoLeading = false; d.leading = 28; d.tracking = 0; d.applyFill = true; d.fillColor = [0, 0, 0]; d.applyStroke = false;
        d.justification = ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT; doc(b).setValue(d); pos(b, at);
        return b;
    }
    function find(c, prefix, skip) { var o = []; for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).name.indexOf(prefix) === 0 && c.layer(i) !== skip) o.push(c.layer(i)); return o; }
    function need(ok, what) { if (!ok) throw new Error(what); }
    function rectOf(t) { var r = t.sourceRectAtTime(0, false); return [r.left, r.top, r.width, r.height]; }
    function sameRect(a, b, what) { for (var i = 0; i < 4; i++) need(Math.abs(a[i] - b[i]) <= 1.5, what + ': ' + a.join(',') + ' -> ' + b.join(',')); }
    function layout(c, t) { return doc(c.layer(API.helperNames(t).engine)).valueAtTime(0, false).text; }
    function layoutAt(c, t, at) { return doc(c.layer(API.helperNames(t).engine)).valueAtTime(at, false).text; }
    function clean(c, t) { var e = errs(c, t); need(!e, e); }
    step('two blocks through the panel', function () {
        var c = comp('two'), a = box(c, 'A', [420, 560], [260, 350]), b = box(c, 'B', [420, 560], [740, 350]), e = shape(c, 'E', 'ellipse', [240, 240]); pos(e, [500, 350]);
        var p = panelFor(c);
        p.click('Applica / Aggiorna wrap', [a, b, e]);
        var ta = c.layer('A'), tb = c.layer('B');
        need(find(c, 'TW Motore #').length === 2, 'two engines');
        need(API.savedLayers(c, ta).exclusions[0] === e && API.savedLayers(c, tb).exclusions[0] === e, 'both blocks wrap the shape');
        need(API.savedLayers(c, ta).area[0] !== API.savedLayers(c, tb).area[0], 'each block has its own area');
        var la = layout(c, ta), lb = layout(c, tb);
        pos(e, [300, 200]); need(layout(c, ta) !== la, 'A follows the shape');
        pos(e, [800, 200]); need(layout(c, tb) !== lb, 'B follows the shape');
        clean(c, ta); clean(c, tb);
        p.click('Rimuovi wrap', [ta, tb]);
        p.window.close();
        need(find(c, 'TW ').length === 0, 'nothing left');
        need(a.enabled && b.enabled && a.name === 'A' && b.name === 'B', 'boxes restored');
        return 'ok';
    });
    step('blocks stay in place', function () {
        var J = ParagraphJustification, kinds = [['left', J.LEFT_JUSTIFY, 1], ['center', J.CENTER_JUSTIFY, 2], ['right', J.RIGHT_JUSTIFY, 3], ['full', J.FULL_JUSTIFY_LASTLINE_LEFT, 4]], o = [];
        for (var i = 0; i < kinds.length; i++) {
            var c = comp('stay' + i), b = box(c, 'B', [500, 500], [500, 350]), d = doc(b).value; d.justification = kinds[i][1]; doc(b).setValue(d);
            var g = b.property('ADBE Transform Group'); g.property('ADBE Anchor Point').setValue([-40, 25]); g.property('ADBE Scale').setValue([80, 90]); g.property('ADBE Rotate Z').setValue(7);
            var before = rectOf(b), t = API.install(c, b, [], []);
            sameRect(before, rectOf(t), kinds[i][0]);
            need(t.property('ADBE Effect Parade').property('TW Allineamento').property(1).value === kinds[i][2], kinds[i][0] + ' alignment');
            var h = t.property('ADBE Transform Group'); need(h.property('ADBE Scale').value[0] === 80 && h.property('ADBE Rotate Z').value === 7 && h.property('ADBE Anchor Point').value[0] === -40, kinds[i][0] + ' transform');
            clean(c, t); o.push(kinds[i][0]);
        }
        var cp = comp('stayp'), tp = text(cp, 'Prima riga\rSeconda riga piu lunga\rTerza', 40, 48), rp = rectOf(tp); API.install(cp, tp, [], []); sameRect(rp, rectOf(tp), 'point');
        return o.join(' ') + ' point';
    });
    step('moving a block moves its wrap', function () {
        var c = comp('move'), t = text(c, 'Prima riga\rSeconda riga\rTerza', 40, 48); API.install(c, t, [], []);
        var a = API.savedLayers(c, t).area[0], before = layout(c, t), r = rectOf(t);
        need(a.parent === t, 'area follows the text');
        pos(t, [300, 260]); t.property('ADBE Transform Group').property('ADBE Rotate Z').setValue(15);
        need(layout(c, t) === before, 'layout unchanged'); sameRect(r, rectOf(t), 'rect'); clean(c, t);
        return 'ok';
    });
    step('deleted layers', function () {
        var c = comp('del'), t = text(c, lorem), a = area(c), e = shape(c, 'E', 'ellipse', [200, 200]), f = shape(c, 'F', 'rect', [100, 100]); pos(e, [500, 350]); pos(f, [300, 300]);
        API.install(c, t, [a], [e, f]);
        e.remove(); var s1 = st(c, t); need(s1.indexOf('OK') === 0 && s1.indexOf('non trovati') > 0, 'exclusion: ' + s1);
        a.remove(); var s2 = st(c, t); need(s2.indexOf('ERRORE') === 0, 'area: ' + s2);
        var n = API.helperNames(t), en = c.layer(n.engine); en.locked = false; en.remove();
        var an = t.property('ADBE Text Properties').property('ADBE Text Animators').property(1).property('ADBE Text Selectors').property(1).property('ADBE Text Expressible Amount');
        t.sourceRectAtTime(0, false); need(!an.expressionError, 'selector: ' + an.expressionError);
        return s1 + ' / ' + s2;
    });
    step('duplicates', function () {
        var c = comp('dup'), t = text(c, lorem), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [400, 300]); API.install(c, t, [], [e]);
        var first = layout(c, t), d = t.duplicate(); d.name = 'Copia'; API.install(c, d, [], []);
        need(find(c, 'TW Motore #').length === 2, 'duplicate has its own engine');
        need(API.savedLayers(c, d).area[0].parent === d, 'duplicate has its own area');
        need(API.savedLayers(c, d).exclusions[0] === e, 'duplicate keeps the shapes');
        need(layout(c, t) === first, 'source untouched'); clean(c, d);
        var k = c.duplicate(), kt = k.layer('T'); made.push(k);
        need(API.isInstalled(kt), 'comp copy keeps its wrap');
        var count = k.numLayers; API.install(k, kt, API.savedLayers(k, kt).area, API.savedLayers(k, kt).exclusions);
        need(k.numLayers === count, 'no orphans in the comp copy: ' + count + ' -> ' + k.numLayers); clean(k, kt);
        return st(k, kt);
    });
    step('blocks as obstacles', function () {
        var c = comp('obst'), a = text(c, 'Blocco uno\rcon due righe', 40, 48), b = text(c, lorem, 22, 28), big = area(c); pos(a, [200, 120]);
        API.install(c, a, [], []); API.install(c, b, [big], [a]);
        need(API.savedLayers(c, b).exclusions[0] === API.savedLayers(c, a).area[0], 'obstacle is the area of the wrapped block');
        clean(c, a); clean(c, b);
        var plain = text(c, 'Solo testo', 40, 48), other = text(c, lorem, 22, 28); pos(plain, [500, 300]); API.install(c, other, [big], [plain]);
        API.install(c, plain, [], []); var s = st(c, other); need(s.indexOf('ERRORE') < 0, s); clean(c, other);
        return s;
    });
    step('extreme values', function () {
        var c = comp('ext'), t = text(c, lorem), a = area(c), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [500, 350]); API.install(c, t, [a], [e]);
        var fx = t.property('ADBE Effect Parade'), o = [];
        function set(name, v) { fx.property(name).property(1).setValue(v); var s = st(c, t); o.push(name.substr(3, 6) + '=' + v + ' ' + s.substr(0, 8)); }
        set('TW Padding', -50); set('TW Padding', 5000); set('TW Padding', 12);
        set('TW Tolleranza curve', 0); set('TW Tolleranza curve', 100000); set('TW Tolleranza curve', 0.5);
        set('TW Interlinea extra', -1000); set('TW Interlinea extra', 0); set('TW Spazio paragrafi', 100000); set('TW Spazio paragrafi', 0);
        var g = e.property('ADBE Transform Group'); g.property('ADBE Scale').setValue([0, 0]); clean(c, t); need(st(c, t).indexOf('ERRORE') < 0, 'scale 0');
        g.property('ADBE Scale').setValue([100, 100]); pos(e, [1e6, 1e6]); need(st(c, t).indexOf('OK') === 0, 'far shape');
        var d = doc(t).value; d.text = ''; doc(t).setValue(d); clean(c, t); o.push('empty ' + st(c, t).substr(0, 12));
        d = doc(t).value; d.text = 'Parolalunghissimasenzaspazi'; d.fontSize = 400; doc(t).setValue(d); clean(c, t); o.push('long ' + st(c, t).substr(0, 12));
        return o.join(', ');
    });
    step('repeated apply', function () {
        var c = comp('again'), t = text(c, lorem), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [400, 300]); API.install(c, t, [], [e]);
        var layers = c.numLayers, fx = t.property('ADBE Effect Parade').numProperties, first = layout(c, t);
        for (var i = 0; i < 6; i++) { var saved = API.savedLayers(c, t); API.install(c, t, saved.area, saved.exclusions); }
        need(c.numLayers === layers && t.property('ADBE Effect Parade').numProperties === fx, 'nothing piles up');
        need(layout(c, t) === first, 'same layout'); clean(c, t);
        return 'ok';
    });
    step('remove restores the block', function () {
        var c = comp('rest'), t = text(c, 'Prima\rSeconda riga', 40, 48), d = doc(t).value; d.justification = ParagraphJustification.CENTER_JUSTIFY; doc(t).setValue(d);
        var r = rectOf(t); API.install(c, t, [], []); var left = API.uninstall(t);
        need(doc(left).value.justification === ParagraphJustification.CENTER_JUSTIFY, 'justification'); sameRect(r, rectOf(left), 'rect');
        var b = box(c, 'B', [400, 400], [500, 350]), rb = rectOf(b), w = API.install(c, b, [], []), back = API.uninstall(w);
        need(back === b && b.enabled && b.name === 'B', 'box'); sameRect(rb, rectOf(b), 'box rect');
        need(find(c, 'TW ').length === 0, 'nothing left');
        return 'ok';
    });
    step('remove finds older originals', function () {
        var c = comp('old'), o = [];
        function half(name) { // a converted block whose wrap is already gone, as older versions left it
            var b = box(c, name, [400, 400], [500, 350]); b.name = name + ' (box originale)'; b.enabled = false;
            var t = text(c, doc(b).value.text, 22, 28); t.name = name; return { box: b, text: t };
        }
        var p = panelFor(c), one = half('Uno');
        p.click('Rimuovi wrap', [one.text]);
        need(one.box.enabled && one.box.name === 'Uno' && find(c, 'Uno').length === 1, 'text selected');
        var two = half('Due');
        p.click('Rimuovi wrap', [two.box]);
        need(two.box.enabled && two.box.name === 'Due' && find(c, 'Due').length === 1, 'original selected');
        var b3 = box(c, 'Tre', [400, 400], [500, 350]), w = API.install(c, b3, [], []), engine = c.layer(API.helperNames(w).engine);
        engine.locked = false; engine.comment = engine.comment.split('|').slice(0, 2).join('|'); // older format
        p.click('Rimuovi wrap', [w]);
        need(b3.enabled && b3.name === 'Tre' && find(c, 'TW ').length === 0, 'older wrap');
        var plain = text(c, 'Solo testo'); p.click('Rimuovi wrap', [plain]);
        var said = '';
        (function look(g) { for (var i = 0; i < g.children.length; i++) { var k = g.children[i]; if (k.type === 'statictext' && k.text.indexOf('Nessun wrap') === 0) said = k.text; if (k.children && k.children.length) look(k); } })(p.window);
        need(said, 'says when nothing was removed');
        p.window.close();
        return said;
    });
    step('refused layers', function () {
        var c = comp('no'), t = text(c, 'Testo'), o = [];
        t.threeDLayer = true; try { API.install(c, t, [], []); o.push('3D accepted'); } catch (e) { o.push(e.message); } t.threeDLayer = false;
        t.locked = true; try { API.install(c, t, [], []); o.push('locked accepted'); } catch (e2) { o.push(e2.message); } t.locked = false;
        need(find(c, 'TW ').length === 0, 'no leftovers'); need(o[0].indexOf('accepted') < 0 && o[1].indexOf('accepted') < 0, o.join());
        return o.join(' / ');
    });
    step('drag stress, two blocks', function () {
        var c = comp('stress'), a = box(c, 'A', [420, 620], [260, 350]), b = box(c, 'B', [420, 620], [740, 350]), e = shape(c, 'E', 'ellipse', [240, 240]); pos(e, [500, 350]);
        var ta = API.install(c, a, [], [e]), tb = API.install(c, b, [], [e]), ca = doc(c.layer(API.helperNames(ta).cache)), times = [];
        for (var i = 0; i < 200; i++) {
            var at = new Date().getTime();
            pos(e, [500 + 380 * Math.sin(i / 9), 350 + 250 * Math.cos(i / 7)]);
            ta.sourceRectAtTime(0, false); tb.sourceRectAtTime(0, false);
            times.push(new Date().getTime() - at);
        }
        times.sort(function (x, y) { return x - y; });
        need(ca.valueAtTime(0, false).text === '=', 'measures kept'); clean(c, ta); clean(c, tb);
        return '200 moves, median ' + times[100] + 'ms, p95 ' + times[190] + 'ms, worst ' + times[199] + 'ms | ' + st(c, ta) + ' | ' + st(c, tb);
    });
    step('style changes are noticed', function () {
        var c = comp('style'), t = text(c, lorem), a = area(c); API.install(c, t, [a], []);
        var ca = doc(c.layer(API.helperNames(t).cache)), o = [], list = [['fontSize', 30], ['tracking', 40], ['leading', 40], ['font', 'Georgia'], ['fauxBold', true], ['fauxItalic', true], ['allCaps', true], ['smallCaps', true], ['baselineShift', 5], ['horizontalScale', 80], ['verticalScale', 80], ['tsume', 50]];
        for (var i = 0; i < list.length; i++) {
            var d = doc(t).value, before = d[list[i][0]], seen;
            try { d[list[i][0]] = list[i][1]; doc(t).setValue(d); seen = ca.valueAtTime(0, false).text !== '='; }
            catch (e) { seen = 'n/a'; }
            o.push(list[i][0] + '=' + seen);
            d = doc(t).value; try { d[list[i][0]] = before; doc(t).setValue(d); } catch (e2) {}
        }
        return o.join(' ');
    });
    // E. perf
    function perf(words, vertices) {
        var c = comp('perf' + words + '_' + vertices, 25, 20), big = ''; for (var i = 0; i < words; i++) big += pool[i % pool.length] + ' ';
        var size = words > 500 ? 9 : 14;
        var t = text(c, big.replace(/\s+$/, ''), size, size + 3), a = area(c), e;
        if (vertices) { var v = []; for (var q = 0; q < vertices; q++) { var r = 100 + 40 * Math.sin(q * 0.7), g = q / vertices * 2 * Math.PI; v.push([r * Math.cos(g), r * Math.sin(g)]); } e = shape(c, 'E', 'path', v); }
        else e = shape(c, 'E', 'ellipse', [200, 200]);
        e.property('ADBE Transform Group').property('ADBE Position').setValueAtTime(0, [100, 350]);
        e.property('ADBE Transform Group').property('ADBE Position').setValueAtTime(10, [900, 350]);
        API.install(c, t, [a], [e]);
        var n = API.helperNames(t), en = doc(c.layer(n.engine)), ca = doc(c.layer(n.cache));
        en.valueAtTime(1, false);
        var eng = [], tot = [];
        for (var k = 2; k <= 5; k++) { $.hiresTimer; en.valueAtTime(k, false); eng.push($.hiresTimer / 1000); }
        for (var m = 6; m <= 9; m++) { $.hiresTimer; t.sourceRectAtTime(m, false); tot.push($.hiresTimer / 1000); }
        function avg(l) { var s = 0; for (var i = 0; i < l.length; i++) s += l[i]; return (s / l.length).toFixed(0); }
        var position = e.property('ADBE Transform Group').property('ADBE Position'), drag = [];
        while (position.numKeys) position.removeKey(1);
        for (var u = 1; u <= 4; u++) { position.setValue([200 + u * 60, 350]); $.hiresTimer; en.valueAtTime(0, false); drag.push($.hiresTimer / 1000); }
        return 'engine ' + avg(eng) + 'ms, drag ' + avg(drag) + 'ms, full frame ' + avg(tot) + 'ms | ' + st(c, t, 1);
    }
    step('perf 100w', function () { return perf(100, 0); });
    step('perf 300w', function () { return perf(300, 0); });
    step('perf 1000w', function () { return perf(1000, 0); });
    step('perf 300w complex shape', function () { return perf(300, 400); });
    // F. real panel buttons
    step('panel clicks', function () {
        var c = comp('ui'), t = text(c, lorem), e = shape(c, 'E', 'ellipse', [200, 200]); pos(e, [500, 350]);
        c.openInViewer();
        var w = API.buildUI(null);
        var buttons = {};
        (function find(g) { for (var i = 0; i < g.children.length; i++) { var k = g.children[i]; if (k.type === 'button') buttons[k.text] = k; if (k.children && k.children.length) find(k); } })(w);
        function sel(list) { for (var i = 1; i <= c.numLayers; i++) c.layer(i).selected = false; for (var n = 0; n < list.length; n++) list[n].selected = true; }
        var o = [];
        sel([t, e]); buttons['Applica / Aggiorna wrap'].notify('onClick'); o.push('apply: ' + st(c, t));
        var n0 = c.numLayers; sel([t]); buttons['Applica / Aggiorna wrap'].notify('onClick'); o.push('reapply layers ' + n0 + '->' + c.numLayers + ' ' + st(c, t));
        var e2 = shape(c, 'E2', 'rect', [120, 120]); pos(e2, [800, 200]);
        sel([t, e2]); buttons['Applica / Aggiorna wrap'].notify('onClick'); o.push('add excl: ' + !!c.layer(API.helperNames(t).engine).property('ADBE Effect Parade').property('TW Esclusione 1') + ' ' + st(c, t));
        sel([t]); buttons['Carica'].notify('onClick');
        buttons['Rimuovi wrap'].notify('onClick');
        var left = 0; for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).name.indexOf('TW ') === 0) left++;
        o.push('removed: leftover TW layers ' + left + ', animators ' + t.property('ADBE Text Properties').property('ADBE Text Animators').numProperties + ', fx ' + t.property('ADBE Effect Parade').numProperties);
        w.close();
        return o.join(' | ');
    });
    step('panel keeps saved shapes', function () {
        var c = comp('keep'), t = text(c, lorem), a = shape(c, 'A', 'ellipse', [120, 120]), b = shape(c, 'B', 'ellipse', [120, 120]), d = shape(c, 'D', 'ellipse', [120, 120]);
        pos(a, [300, 200]); pos(b, [500, 350]); pos(d, [700, 450]);
        function names() { var o = [], l = API.savedLayers(c, c.layer('T')).exclusions; for (var i = 0; i < l.length; i++) o.push(l[i].name); return o.sort().join(''); }
        var p = panelFor(c);
        p.click('Applica / Aggiorna wrap', [t, a]);
        need(names() === 'A', 'first shape linked');
        p.click('Aggiungi selezione', [b]);
        p.click('Applica / Aggiorna wrap', [c.layer('T')]);
        need(names() === 'AB', 'a shape added to the list keeps the saved one: ' + names());
        p.click('Carica', [c.layer('T')]);
        p.click('Applica / Aggiorna wrap', [c.layer('T'), d]);
        need(names() === 'ABD', 'a shape selected after Carica is added: ' + names());
        p.click('Applica / Aggiorna wrap', [c.layer('T'), a, d]);
        need(names() === 'ABD', 'no doubles: ' + names());
        p.click('Carica', [c.layer('T')]);
        p.list().selection = 0;
        var gone = p.list().selection.text;
        p.click('Rimuovi', [c.layer('T'), c.layer(gone)]);
        p.click('Applica / Aggiorna wrap', [c.layer('T'), c.layer(gone)]);
        need(names().indexOf(gone) < 0 && names().length === 2, 'a shape taken off the list stays off: ' + names());
        need(p.statusText().indexOf('Contorna: ') > 0, 'status names the shapes: ' + p.statusText());
        p.window.close();
        return names() + ' / ' + p.statusText();
    });
    step('hidden shapes do not push the text', function () {
        var c = comp('hidden'), t = text(c, lorem), e = shape(c, 'E', 'ellipse', [240, 240]), box = area(c); pos(e, [500, 350]);
        API.install(c, t, [box], []);
        var alone = layout(c, t);
        API.install(c, t, [box], [e]);
        var op = e.property('ADBE Transform Group').property('ADBE Opacity'), sc = e.property('ADBE Transform Group').property('ADBE Scale');
        var shown = layout(c, t);
        need(shown !== alone, 'a visible shape pushes the text');
        op.setValue(0); need(layout(c, t) === alone, 'opacity 0');
        op.setValue(1); need(layout(c, t) === shown, 'any opacity above 0 counts');
        op.setValue(100);
        sc.setValue([0, 0]); need(layout(c, t) === alone, 'scale 0 leaves no notch');
        sc.setValue([100, 100]);
        e.inPoint = 2;
        need(layoutAt(c, t, 1) === alone, 'before its in point');
        need(layoutAt(c, t, 2) === shown, 'from its in point');
        e.inPoint = 0; e.outPoint = 1;
        need(layoutAt(c, t, 0.5) === shown, 'before its out point');
        need(layoutAt(c, t, 2) === alone, 'after its out point');
        e.outPoint = 4;
        op.setValueAtTime(0, 0); op.setValueAtTime(2, 100);
        need(layoutAt(c, t, 0) === alone, 'keyframed: hidden');
        need(layoutAt(c, t, 2) === shown, 'keyframed: shown');
        return 'ok' + errs(c, t);
    });
    step('alerts raised', function () { return alerts.length ? alerts.join(' ; ') : 'none'; });
    L('RENDERS-QUEUED');
    $.global.TW_MADE = made;
    L('DONE');
})();
