/* Source Text of the metrics layer. Time is used as an address: slot N shows
 * string N, so a single hidden layer can measure every word through
 * sourceRectAtTime(N * frameDuration). */
var src = __SRC__.text.sourceText;
var slot = Math.round(time / thisComp.frameDuration);
var shown = 'Hg';
if (slot === 1) shown = 'Hg\rHg';
else if (slot === 2 || slot === 3) shown = src.valueAtTime(0).toString();
else if (slot > 3) shown = slotString(src.valueAtTime(0).toString(), Math.floor((slot - 4) / 2), slot % 2 === 1);
src.style.setText(shown);
