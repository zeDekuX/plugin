/* Source Text of the cache layer: everything that depends only on the text and
 * its style. AE keeps the result across frames, but any edit in the comp re-runs
 * this expression, so dragging a shape would measure every word on each mouse
 * move. The panel stores the result as the own text of this layer and of the
 * engine. While it still matches, this outputs only '=' and the engine uses its
 * copy: even returning the long string unchanged costs AE more than the layout. */
var source = __SRC__.text.sourceText.valueAtTime(0).toString();
var metrics = thisComp.layer(__METRICS__), frame = thisComp.frameDuration, memo = Object.create(null);
function measure(slot, key) {
    if (!memo[key]) {
        var r = metrics.sourceRectAtTime(slot * frame, false);
        memo[key] = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    return memo[key];
}
var one = measure(0, 'Hg'), two = measure(1, 'Hg\rHg');
// Every word is measured with the style of the source, so these two cheap rects
// and the string are enough to notice anything that would change the result.
var identity = JSON.stringify([one, two, __BY_WORDS__, source]);
function stored() {
    try { return JSON.parse(value.toString()).identity === identity; } catch (e) { return false; }
}
function measured() {
    var text = atomize(source);
    // Slot 3 lifts the whole text by 10 px per word AE counts (see the metrics
    // layer's animator), which is the only way to read AE's own word count.
    var aeWords = Math.round((measure(2, '\u0000plain').top - measure(3, '\u0000lifted').top) / 10);
    var ascent = -one.top, descent = -(one.top + one.height);
    text.atoms.forEach(function (atom, k) {
        var own = measure(4 + 2 * k, atom.s), pair = measure(5 + 2 * k, atom.pair);
        // Rects are relative to the start of the measured string, which is the
        // previous atom's origin. Glyphless atoms make ink edges unreliable.
        atom.right = (atom.prev ? atom.prev.origin : 0) + pair.left + pair.width;
        atom.left = atom.right - own.width;
        atom.origin = atom.left - own.left;
        atom.ink = own.width > 0;
        ascent = Math.max(ascent, -own.top);
        descent = Math.min(descent, -(own.top + own.height));
    });
    var lefts = [], key = 0;
    var paragraphs = text.paragraphs.map(function (group) {
        var words = group.map(function (atoms) {
            var left = atoms[0].left, right = atoms[atoms.length - 1].right;
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
