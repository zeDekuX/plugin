var r = thisComp.layer(__ENGINE__).text.sourceText.value.toString().substr((textIndex - 1) * 12, 12);
var dx = parseInt(r.substr(0, 6), 36), dy = parseInt(r.substr(6, 6), 36);
// A short or missing record means the engine failed: park the word.
r.length === 12 && r.indexOf('\r') < 0 ? [(dx - 1e9) / (100 * __SCALE__), (dy - 1e9) / (100 * __SCALE__), 0] : [0, __PARKED__ / __SCALE__, 0];
