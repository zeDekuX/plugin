/* Splits text into atoms (whitespace-separated runs, NBSP included) and groups
 * them into layout tokens: NBSP-joined atoms must travel as one token. */
function atomize(text) {
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var atoms = [], paragraphs = [], offset = 0;
    lines.forEach(function (line, p) {
        var re = /\S+/g, m, tokens = [], end = 0, prev = null;
        while ((m = re.exec(line)) !== null) {
            var gap = line.slice(end, m.index);
            var atom = { s: m[0], gap: gap, para: p, index: atoms.length, start: offset + m.index, end: offset + m.index + m[0].length };
            // Measured string that ends at this atom: previous atom + original
            // gap, or leading whitespace + atom at the start of a line.
            atom.pair = prev ? prev.s + gap + m[0] : gap + m[0];
            atom.prev = prev;
            if (prev && gap.length && /^[  ]+$/.test(gap)) tokens[tokens.length - 1].push(atom);
            else tokens.push([atom]);
            atoms.push(atom);
            prev = atom;
            end = m.index + m[0].length;
        }
        paragraphs.push(tokens);
        offset += line.length + 1;
    });
    return { atoms: atoms, paragraphs: paragraphs };
}
/* The string a measuring slot shows: kind 0 is atom k alone, 1 the pair it ends,
 * 2 the atom before a space and an H, which reveals its advance.
 * Runs once per slot, so it must stay a single native split, not atomize(). */
function slotString(text, k, kind) {
    var parts = String(text).replace(/\r\n?/g, '\n').split(/(\s+)/);
    var i = 2 * k + (parts[0] === '' ? 2 : 0), atom = parts[i], gap = parts[i - 1] || '';
    if (atom === undefined || atom === '') return 'Hg';
    if (kind === 0) return atom;
    if (kind === 2) return atom + ' H';
    var lineBreak = gap.lastIndexOf('\n');
    if (i === 0 || i === 1 || parts[i - 2] === '' || lineBreak >= 0) return gap.slice(lineBreak + 1) + atom;
    return parts[i - 2] + gap + atom;
}
/* String offset of each character as a selector's textIndex counts them, for the
 * Characters mode. Line breaks are not counted; a surrogate pair or a base plus
 * its combining marks is one character. */
function characterOffsets(text) {
    var normalized = String(text).replace(/\r\n?/g, '\n'), offsets = [], m;
    var re = /[\u{1F1E6}-\u{1F1FF}]{2}|\P{M}\p{M}*(?:\u200d\P{M}\p{M}*)*/gu;
    while ((m = re.exec(normalized)) !== null) if (m[0] !== '\n') offsets.push(m.index);
    return offsets;
}
