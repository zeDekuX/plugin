/* Full check inside After Effects. Needs $.global.TW_OUT, TW_FRAMES, TW_SCRIPT.
 * Works in throwaway comps and removes them at the end; never saves the project. */
(function () {
    var OUT = new File($.global.TW_OUT), DIR = $.global.TW_FRAMES;
    OUT.encoding = 'UTF-8'; OUT.open('w'); OUT.close();
    function L(s) { OUT.open('a'); OUT.write(String(s) + '\n'); OUT.close(); }
    function why(e) { var m = '?', l = '?'; try { m = e.message; } catch (x) {} try { l = e.line; } catch (x) {} return m + ' @' + l; }
    function step(name, f) { try { L('OK  ' + name + ': ' + String(f())); } catch (e) { L('BAD ' + name + ': ' + why(e)); } }
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
    made.push(demo);
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
    step('alerts raised', function () { return alerts.length ? alerts.join(' ; ') : 'none'; });
    L('RENDERS-QUEUED');
    $.global.TW_MADE = made;
    L('DONE');
})();
