# Plugin

I miei plugin per le app creative. Una cartella per applicazione, una sottocartella per plugin.

| Plugin | App | Cosa fa | File da installare |
|---|---|---|---|
| [Text Wrap](After%20Effects/Text%20Wrap) | After Effects 2026 | Fa scorrere il testo attorno a forme animate, parola per parola | [Text Wrap.jsx](After%20Effects/Text%20Wrap/Text%20Wrap.jsx) |

---

# Mini guida: Text Wrap

Il testo si ridispone da solo attorno alle forme, a ogni frame, come "Contorna con testo" di InDesign. Funziona su più blocchi di testo, che restano dove sono e identici all'originale finché una forma non li tocca. Provato su After Effects 2026 (26.5) su macOS. Su Windows non è ancora stato provato.

## Installa

1. Scarica [Text Wrap.jsx](After%20Effects/Text%20Wrap/Text%20Wrap.jsx).
2. Copialo nella cartella dei pannelli. Il sistema chiede la conferma da amministratore.
   - **Mac:** `Applicazioni/Adobe After Effects 2026/Scripts/ScriptUI Panels/`
   - **Windows:** `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\`
3. Riavvia After Effects e apri **Finestra → Text Wrap.jsx**.

Se AE propone di attivare il motore espressioni JavaScript, accetta: serve al plugin.

## Usa

1. Seleziona uno o più livelli di testo e le forme da contornare.
2. Premi **Applica / Aggiorna wrap**.
3. Anima o trascina le forme: il testo segue da solo.

Ogni blocco riceve il proprio rettangolo guida `TW Area`, che lo segue quando lo sposti e che puoi modificare per cambiare la zona del testo. Per provare subito premi **Crea demo**.

## Pulsanti

| Pulsante | Cosa fa |
|---|---|
| Usa selezione (Area) | I livelli selezionati diventano la zona in cui scorre il testo |
| Aggiungi selezione (Esclusioni) | Aggiunge i livelli selezionati alle forme da contornare |
| Applica / Aggiorna wrap | Installa o aggiorna il wrap su tutti i testi selezionati |
| Carica | Mostra area, esclusioni e stato del testo selezionato |
| Rimuovi wrap | Rimette i blocchi selezionati esattamente come erano |
| Crea demo | Crea una composizione di esempio |

## Regolazioni

Si trovano in **Controlli effetti** del livello di testo.

| Controllo | Cosa regola |
|---|---|
| TW Padding | Distanza dalle forme |
| TW Allineamento | Sinistra, Centro, Destra, Giustificato |
| TW Giustifica ultima riga | Giustifica anche l'ultima riga dei paragrafi |
| TW Overflow | Se il testo non entra: mostra le parole che entrano, o nasconde tutto |
| TW Interlinea extra | Si somma all'interlinea del testo |
| TW Spazio paragrafi | Spazio tra i paragrafi |
| TW Tolleranza curve | Precisione delle curve |

Font, corpo, tracking e interlinea si cambiano sul livello di testo, come sempre.

## Quando premere di nuovo Applica

- Dopo aver cambiato testo o stile, altrimenti il trascinamento delle forme diventa lento.
- Su un blocco appena duplicato.
- Dopo aver aggiunto, eliminato o rinominato forme dentro un livello forma.
- Quando **Carica** mostra `Testo cambiato`.

Rinominare o riordinare i livelli invece è sicuro.

## Se qualcosa non va

| Cosa succede | Cosa fare |
|---|---|
| Spostare una forma è lento | Premi **Applica / Aggiorna wrap**. Nei progetti creati con una versione precedente va fatto su ogni testo. Se AE è aperto da ore, riavvialo |
| Mancano delle parole | Non entrano nell'area: **Carica** dice quante sono. Allarga l'area o riduci il corpo |
| Avviso sui font misti | Usa un solo font nel livello o togli il simbolo che manca nel font |
| Il testo in box è cambiato livello | È normale: viene convertito e l'originale resta spento, come `(box originale)`. Effetti e maschere del box non vengono copiati |
| Hai eliminato una forma | Il wrap continua senza di essa. Se elimini l'area, premi **Applica / Aggiorna wrap** |
| Vuoi togliere il wrap | Usa **Rimuovi wrap**. Non eliminare a mano i livelli `TW` |

## Cosa non fa

- Non segue i keyframe su Testo sorgente.
- Non misura stili diversi su singole parole: serve testo a stile unico.
- Non supporta livelli 3D e lingue senza spazi tra le parole.
- Ignora Unisci tracciati, modalità delle maschere, inclinazione dei gruppi e arrotondamento delle stelle.

Tutti i dettagli e le istruzioni di sviluppo sono nel [README di Text Wrap](After%20Effects/Text%20Wrap/README.md).

---

# Aggiungere un nuovo plugin

1. Crea la cartella `Nome App/Nome Plugin/` con dentro un `README.md`.
2. Aggiungi una riga alla tabella in cima a questa pagina.
3. Carica tutto:

```bash
git add .
git commit -m "Aggiungi Nome Plugin"
git push
```
