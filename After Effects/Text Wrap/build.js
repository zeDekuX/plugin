#!/usr/bin/env node
/* Embeds src/*.js into src/panel.jsx and writes the single installable script. */
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const expr = {
    atoms: read('atoms.js'), core: read('core.js'), metrics: read('metrics.expr.js'), cache: read('cache.expr.js'),
    engine: read('engine.expr.js'), selector: read('selector.expr.js'), count: read('count.expr.js'),
};
const out = read('panel.jsx').replace('/*@@EXPR@@*/', () => JSON.stringify(expr, null, 4))
    // ExtendScript's decoding depends on the host: keep the file pure ASCII.
    .replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
fs.writeFileSync(path.join(__dirname, 'Text Wrap.jsx'), out);
console.log('Text Wrap.jsx', out.length, 'bytes');
