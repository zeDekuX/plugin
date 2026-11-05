/* Source Text of the engine layer: one layout per frame, read by the selector.
 * Output: one 12-character record per selector index, \r, a status line. The
 * fixed width lets each evaluation read its record without parsing the rest.
 * The core is Cartesian (+Y up), so every Y is negated at this boundary. */
var SRC = __SRC__;
var KAPPA = 0.5522847498, PARKED_LIMIT = 40000;
function control(name) { return SRC.effect(name)(1).value; }
// Two 6-digit base-36 fields: hundredths of a pixel, biased to stay positive.
function field(v) { return ('00000' + (Math.round(v * 100) + 1e9).toString(36)).slice(-6); }
function encode(dx, dy) { return field(dx) + field(dy); }

function mapper(layer, chain) {
    var o = SRC.fromComp(layer.toComp([0, 0, 0]));
    var a = SRC.fromComp(layer.toComp([1, 0, 0]));
    var b = SRC.fromComp(layer.toComp([0, 1, 0]));
    var groups = chain.map(function (t) {
        var angle = t.rotation.value * Math.PI / 180, sc = t.scale.value;
        return { an: t.anchorPoint.value, po: t.position.value, sx: sc[0] / 100, sy: sc[1] / 100, c: Math.cos(angle), s: Math.sin(angle) };
    });
    return function (x, y) {
        groups.forEach(function (g) {
            var px = (x - g.an[0]) * g.sx, py = (y - g.an[1]) * g.sy;
            x = g.po[0] + px * g.c - py * g.s;
            y = g.po[1] + px * g.s + py * g.c;
        });
        return {
            x: o[0] + (a[0] - o[0]) * x + (b[0] - o[0]) * y,
            y: -(o[1] + (a[1] - o[1]) * x + (b[1] - o[1]) * y)
        };
    };
}
function polygon(region, map, points) {
    points.forEach(function (p, i) {
        region.data.push({ type: i ? 'lineTo' : 'moveTo', point: map(p[0], p[1]) });
    });
    region.data.push({ type: 'close' });
}
function bezierPath(region, map, pts, ins, outs) {
    if (!pts.length) return;
    region.data.push({ type: 'moveTo', point: map(pts[0][0], pts[0][1]) });
    for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length], oa = outs[i], ib = ins[(i + 1) % pts.length];
        region.data.push({ type: 'cubicTo', cp1: map(a[0] + oa[0], a[1] + oa[1]), cp2: map(b[0] + ib[0], b[1] + ib[1]), point: map(b[0], b[1]) });
    }
    region.data.push({ type: 'close' });
}
function addPath(region, layer, chain, path) {
    bezierPath(region, mapper(layer, chain), path.points(), path.inTangents(), path.outTangents());
}
function addEllipse(region, layer, chain, shape) {
    var c = shape.position.value, rx = shape.size.value[0] / 2, ry = shape.size.value[1] / 2, kx = rx * KAPPA, ky = ry * KAPPA;
    bezierPath(region, mapper(layer, chain),
        [[c[0], c[1] - ry], [c[0] + rx, c[1]], [c[0], c[1] + ry], [c[0] - rx, c[1]]],
        [[-kx, 0], [0, -ky], [kx, 0], [0, ky]],
        [[kx, 0], [0, ky], [-kx, 0], [0, -ky]]);
}
function addRect(region, layer, chain, shape) {
    var c = shape.position.value, w = shape.size.value[0] / 2, h = shape.size.value[1] / 2;
    var r = Math.min(shape.roundness.value, w, h), k = r * KAPPA, l = c[0] - w, t = c[1] - h, R = c[0] + w, B = c[1] + h, map = mapper(layer, chain);
    if (r <= 0) { polygon(region, map, [[l, t], [R, t], [R, B], [l, B]]); return; }
    bezierPath(region, map,
        [[l + r, t], [R - r, t], [R, t + r], [R, B - r], [R - r, B], [l + r, B], [l, B - r], [l, t + r]],
        [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]],
        [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]]);
}
function addStar(region, layer, chain, shape) {
    var c = shape.position.value, n = Math.round(shape.points.value), isStar = shape.type.value === 1;
    var outer = shape.outerRadius.value, inner = isStar ? shape.innerRadius.value : outer;
    var start = (shape.rotation.value - 90) * Math.PI / 180, steps = isStar ? n * 2 : n, pts = [];
    for (var i = 0; i < steps; i++) {
        var r = (isStar && i % 2) ? inner : outer, angle = start + i * 2 * Math.PI / steps;
        pts.push([c[0] + r * Math.cos(angle), c[1] + r * Math.sin(angle)]);
    }
    polygon(region, mapper(layer, chain), pts);
}
function addBounds(region, layer) {
    var r = layer.sourceRectAtTime(time, false), l = r.left, t = r.top, R = l + r.width, B = t + r.height;
    // A text with its own wrap: parked words would make its rect cover everything.
    if (r.height > PARKED_LIMIT || r.width > PARKED_LIMIT) return;
    polygon(region, mapper(layer, []), [[l, t], [R, t], [R, B], [l, B]]);
}
function inRegion(region, x, y) {
    var inside = false;
    region.edges.forEach(function (e) {
        var a = e[0], b = e[1];
        if ((a.y > y) !== (b.y > y) && x < a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y)) inside = !inside;
    });
    return inside;
}
function layout() {
    var AREA = [], EXCLUSIONS = [], missing = 0;
    /*@@REGIONS@@*/
    var padding = Math.max(0, control('TW Padding')), tolerance = Math.max(0.05, control('TW Tolleranza curve'));
    var alignment = control('TW Allineamento') - 1, justifyFinal = control('TW Giustifica ultima riga') > 0, suppress = control('TW Overflow') === 2;
    var lineSpacing = control('TW Interlinea extra'), paragraphSpacing = control('TW Spazio paragrafi');

    var cached = thisComp.layer(__CACHE__).text.sourceText.valueAtTime(0).toString();
    var text = JSON.parse(cached === '=' ? value.toString() : cached);
    var pitch = text.pitch, ascent = text.ascent, descent = text.descent, rowPitch = pitch + lineSpacing;
    if (!(rowPitch > 0)) throw new Error('interlinea non positiva.');

    var areaEdges = [], holeEdges = [], bounds = { top: -Infinity, bottom: Infinity, left: Infinity, right: -Infinity };
    AREA.forEach(function (region) {
        var flat = TextAreaCore.flatten(region.data, tolerance);
        region.edges = flat.edges;
        areaEdges = areaEdges.concat(flat.edges);
        bounds.top = Math.max(bounds.top, flat.bounds.top);
        bounds.bottom = Math.min(bounds.bottom, flat.bounds.bottom);
        bounds.left = Math.min(bounds.left, flat.bounds.left);
        bounds.right = Math.max(bounds.right, flat.bounds.right);
    });
    if (!isFinite(bounds.top)) throw new Error('area mancante o vuota: premi Applica / Aggiorna wrap.');
    // A shape scaled to nothing or an invalid path must not stop the whole layout.
    EXCLUSIONS = EXCLUSIONS.filter(function (region) {
        try { region.edges = TextAreaCore.flatten(region.data, tolerance).edges; } catch (e) { return false; }
        holeEdges = holeEdges.concat(region.edges);
        return true;
    });

    var rows = [], first = bounds.top - ascent, last = bounds.bottom - descent;
    for (var y = first; y >= last - 1e-7 && rows.length < 2000; y -= rowPitch) rows.push({ index: rows.length, baseline: y });
    function inArea(x, y) { return AREA.some(function (r) { return inRegion(r, x, y); }); }
    function outsideHoles(x, y) { return !EXCLUSIONS.some(function (r) { return inRegion(r, x, y); }); }
    // Scanning for free space outside the holes needs a boundary on both sides.
    var margin = 2 * (padding + tolerance) + 10, sides = [bounds.left - margin, bounds.right + margin].map(function (x) { return [{ x: x, y: -1e7 }, { x: x, y: 1e7 }]; });
    // The area frames the text exactly, so a block stays where it is. Padding is
    // the distance from the shapes only, like the text wrap offset in InDesign.
    function segmentsAt(baseline) {
        var top = baseline + ascent, bottom = baseline + descent;
        var free = TextAreaCore.bandSegments({ edges: areaEdges }, top, bottom, 0, 0, inArea);
        if (!holeEdges.length || !free.length) return free;
        return TextAreaCore.intersect(free, TextAreaCore.bandSegments({ edges: holeEdges.concat(sides) }, top, bottom, padding, tolerance, outsideHoles));
    }
    var flowed = TextAreaCore.flow(text.paragraphs, rows, {
        alignment: alignment, justifyFinal: justifyFinal, paragraphSpacing: paragraphSpacing, overflowPolicy: 0, segmentsAt: segmentsAt,
        minGap: alignment === 3 ? 0.8 : 1 // AE's default minimum word spacing
    });

    var hideAll = suppress && flowed.overflow.length > 0;
    // Unplaced words are parked off screen: a second animator just to hide them
    // would double the per-word cost.
    var parked = encode(0, __PARKED__), still = encode(0, 0);
    var cells = text.lefts.map(function () { return parked; });
    if (!hideAll) flowed.placements.forEach(function (v) {
        cells[v.key] = encode(v.x - text.lefts[v.key], -v.baseline - v.paragraph * pitch);
    });
    var status = flowed.overflow.length
        ? 'OVERFLOW: ' + flowed.overflow.length + ' parole escluse, prima: ' + flowed.overflow[0].token
        : 'OK: ' + flowed.placedWords + ' parole disposte';
    if (missing) status += ' (' + missing + ' livelli non trovati)';
    if (text.stale) status = __STALE__;
    return text.order.map(function (token) { return token < 0 ? still : cells[token]; }).join('') + '\r' + status;
}
var result;
try { result = layout(); } catch (e) { result = '\rERRORE: ' + e.message; }
result;
