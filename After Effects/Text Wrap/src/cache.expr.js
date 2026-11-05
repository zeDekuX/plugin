/* Source Text of the cache layer: everything that depends only on the text and
 * its style. AE keeps the result across frames, but any edit in the comp re-runs
 * this expression, so dragging a shape would measure every word on each mouse
 * move. The panel stores the result as the own text of this layer and of the
 * engine. While it still matches, this outputs only '=' and the engine uses its
 * copy: even returning the long string unchanged costs AE more than the layout. */
var sourceText = __SRC__.text.sourceText, source = sourceText.valueAtTime(0).toString();
// Every word is measured with the style of the source, so the string and its style
// are enough to notice what would change the result. They must be read directly:
// asking the metrics layer costs more than the whole layout of a drag step.
function styleKey() {
    var style = sourceText.style;
    return ['font', 'fontSize', 'tracking', 'leading', 'autoLeading', 'baselineShift', 'isFauxBold', 'isFauxItalic', 'isAllCaps', 'isSmallCaps', 'horizontalScale', 'verticalScale', 'tsume'].map(function (name) { return style[name]; });
}
var identity = JSON.stringify([styleKey(), __BY_WORDS__, source]);
function stored() {
    try { return JSON.parse(value.toString()).identity === identity; } catch (e) { return false; }
}
function measured() {
    var metrics = thisComp.layer(__METRICS__), frame = thisComp.frameDuration, memo = Object.create(null);
    function measure(slot, key) {
        if (!memo[key]) {
            var r = metrics.sourceRectAtTime(slot * frame, false);
            memo[key] = { left: r.left, top: r.top, width: r.width, height: r.height };
        }
        return memo[key];
    }
    var one = measure(0, 'Hg'), two = measure(1, 'Hg\rHg');
    var text = atomize(source);
    // Slot 3 lifts the whole text by 10 px per word AE counts (see the metrics
    // layer's animator), which is the only way to read AE's own word count.
    var aeWords = Math.round((measure(2, '\u0000plain').top - measure(3, '\u0000lifted').top) / 10);
    var ascent = -one.top, descent = -(one.top + one.height);
    text.atoms.forEach(function (atom, k) {
        var own = measure(7 + 3 * k, atom.s), pair = measure(8 + 3 * k, atom.pair);
        // Rects are relative to the start of the measured string, which is the
        // previous atom's origin. Glyphless atoms make ink edges unreliable.
        atom.right = (atom.prev ? atom.prev.origin : 0) + pair.left + pair.width;
        atom.left = atom.right - own.width;
        atom.origin = atom.left - own.left;
        atom.ink = own.width > 0;
        ascent = Math.max(ascent, -own.top);
        descent = Math.min(descent, -(own.top + own.height));
    });
    // AE aligns and justifies on advances, which include the space after the last
    // letter. Rects only show ink, so the advance is worked out: from the next word
    // when there is one, otherwise by setting an H after the word.
    // Two strings that differ only by eight spaces: kerning cancels out, and rect
    // rounding is divided by eight.
    var plainH = measure(4, 'H'), rightH = plainH.left + plainH.width;
    var space = (measure(6, 'H         H').width - measure(5, 'H H').width) / 8;
    text.atoms.forEach(function (atom, k) {
        var next = text.atoms[k + 1];
        if (next && next.prev === atom && /^ +$/.test(next.gap)) atom.advance = next.origin - next.gap.length * space;
        else {
            var tail = measure(9 + 3 * k, atom.s + ' H');
            atom.advance = atom.origin + tail.left + tail.width - space - rightH;
        }
    });
    var lefts = [], key = 0;
    var paragraphs = text.paragraphs.map(function (group) {
        var words = group.map(function (atoms) {
            // From the origin, as AE sets a line: starting at the ink would shift each
            // line by the side bearing of its first letter.
            var left = atoms[0].origin, right = atoms[atoms.length - 1].advance;
            atoms.forEach(function (a) { a.token = key; });
            lefts.push(left);
            return { token: atoms.map(function (a) { return a.s; }).join(' '), key: key++, width: right - left, left: left, right: right, gapAfter: 0 };
        });
        for (var w = 0; w < words.length - 1; w++) words[w].gapAfter = Math.max(0, words[w + 1].left - words[w].right);
        return words.map(function (v) { return { token: v.token, key: v.key, width: v.width, gapAfter: v.gapAfter }; });
    });
    // Token of each selector index. AE does not count a glyphless character as a
    // word; anything else that disagrees is reported as stale so the panel can fall
    // back to Characters, which is slower but always exact.
    var order;
    if (__BY_WORDS__) order = text.atoms.filter(function (a) { return a.ink; }).map(function (a) { return a.token; });
    else {
        var next = 0;
        order = characterOffsets(source).map(function (offset) {
            while (next < text.atoms.length && text.atoms[next].end <= offset) next++;
            var atom = text.atoms[next];
            return atom && offset >= atom.start ? atom.token : -1;
        });
    }
    return JSON.stringify({ pitch: two.height - one.height, ascent: ascent, descent: descent, paragraphs: paragraphs, lefts: lefts, order: order, words: order.length, stale: __BY_WORDS__ && aeWords !== order.length, identity: identity });
}
stored() ? '=' : measured();
