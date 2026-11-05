# Text Wrap per After Effects

Il testo scorre attorno a forme animate, come "Contorna con testo" di InDesign, ma dal vivo: a ogni frame le parole intere si ridispongono. È il port di `Cavalry/Text Area Deformer` e ne riusa il motore geometrico (`src/core.js`, estratto senza modifiche).

Verificato su After Effects 2026 (26.5) su macOS. Le altre versioni non sono state provate.

## Installazione

La cartella di AE richiede i permessi di amministratore:

```bash
sudo cp "Text Wrap.jsx" "/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/"
```

Riavvia AE e apri **Finestra → Text Wrap.jsx**. Senza installare: **File → Script → Esegui file di script…**

## Uso

1. Seleziona il livello di testo e le forme da contornare.
2. Premi **Applica / Aggiorna wrap**.
3. Anima le forme come sempre: il testo segue da solo.

Senza un'area scelta, Text Wrap crea un rettangolo guida `TW Area` modificabile. Per il testo in box usa le dimensioni del box.

| Pulsante | Funzione |
|---|---|
| Usa selezione (Area) | Usa i livelli selezionati come zona in cui scorre il testo |
| Aggiungi selezione (Esclusioni) | Aggiunge i livelli selezionati alle forme da contornare |
| Applica / Aggiorna wrap | Installa o aggiorna il wrap sul testo selezionato. I livelli selezionati in più diventano nuove esclusioni |
| Carica | Mostra area, esclusioni e stato del testo selezionato, per modificarli |
| Rimuovi wrap | Rimuove animatori, controlli e livelli di servizio |
| Crea demo | Crea una composizione di esempio |

Testo, font, corpo, tracking e interlinea si modificano sul livello di testo e il wrap si aggiorna da solo. Gli altri controlli sono in **Controlli effetti** del livello:

| Controllo | Effetto |
|---|---|
| TW Padding | Distanza da area e forme |
| TW Allineamento | Sinistra, Centro, Destra, Giustificato |
| TW Giustifica ultima riga | Giustifica anche l'ultima riga di ogni paragrafo |
| TW Overflow | Se il testo non entra: mostra le parole che entrano, oppure nasconde tutto |
| TW Interlinea extra | Si somma all'interlinea del testo |
| TW Spazio paragrafi | Spazio tra i paragrafi |
| TW Tolleranza curve | Precisione delle curve |

## Regole di scorrimento

- Le parole non vengono mai spezzate e il corpo non viene mai ridotto. Le parole unite da spazio unificatore restano insieme.
- Le righe si leggono da sinistra a destra attraverso tutti i segmenti, poi si passa alla riga sotto. Con due colonne il testo legge quindi attraverso entrambe, come nell'originale Cavalry.
- Le parole che non entrano vengono nascoste. **Carica** mostra quante sono e qual è la prima.

## Forme supportate

Tracciati, ellissi, rettangoli (anche arrotondati), stelle e poligoni dei livelli forma, comprese le trasformazioni di gruppo; maschere, se il livello non contiene forme; per tutti gli altri livelli il rettangolo del livello. Position, scala, rotazione e parent sono seguiti.

## Limiti

- Il testo viene letto al tempo 0: i keyframe su Testo sorgente non sono seguiti.
- Serve testo a stile unico. Stili diversi su singole parole non vengono misurati.
- Il testo in box viene convertito: AE non permette di farlo sul livello esistente, quindi Text Wrap crea un nuovo livello di testo e disattiva l'originale, rinominandolo `(box originale)`. Colori e font vengono copiati; maiuscoletto e tutto maiuscolo no.
- Se dopo una modifica al testo **Carica** mostra `Testo cambiato`, premi di nuovo **Applica / Aggiorna wrap**.
- Dopo aver modificato testo o stile, premi **Applica / Aggiorna wrap** prima di trascinare le forme: il wrap si aggiorna comunque, ma finché non lo fai ogni spostamento rimisura tutte le parole e il trascinamento è lento.
- Con font misti nello stesso livello le misure non sono affidabili e le righe possono uscire dai margini. Il pannello lo segnala premendo **Applica**.
- Se aggiungi o elimini forme dentro un livello forma, premi di nuovo **Applica / Aggiorna wrap**. Fallo anche se rinomini un gruppo o una forma al suo interno. Rinominare o riordinare i livelli invece è sicuro.
- Sono ignorati: Unisci tracciati, modalità delle maschere, inclinazione dei gruppi, arrotondamento delle stelle. Sono esclusi anche i livelli 3D e le lingue senza spazi tra le parole.
- Richiede il motore espressioni JavaScript, che il pannello propone di attivare se manca.

## Prestazioni

La tabella riporta render reali con forma in movimento, codifica video inclusa, in ms a frame.

| Testo | Senza wrap | Con wrap | Costo del wrap |
|---|---|---|---|
| 100 parole | 55 | 61 | +6 |
| 300 parole | 55 | 109 | +53 |
| 1000 parole | 91 | 252 | +162 |
| 300 parole, forma con 400 punti | 36 | 114 | +78 |

Il costo cresce con il numero di parole: non è possibile renderlo indipendente dalla lunghezza del testo, perché AE valuta l'espressione una volta per ogni parola.

Trascinando una forma a mano, il motore ricalcola la disposizione a ogni movimento: circa 100 ms con 300 parole, 250-300 con 1000. È quasi il costo di un frame con keyframe.

Le misure delle parole vengono salvate da **Applica / Aggiorna wrap** e riusate finché testo e stile non cambiano. Dopo una modifica a testo o font servono una nuova misurazione, circa 0,7 secondi con 300 parole e 1,8 con 1000, e **Applica** per salvarla.

Il wrap usa il selettore per parole, molto più leggero. Passa da solo a quello per caratteri, più lento, se il conteggio di AE non torna, per esempio con font misti nello stesso livello.

## Come funziona

AE non permette a uno script di deformare il testo a ogni frame, quindi tutto è fatto con espressioni, senza keyframe. Accanto al testo vengono creati tre livelli di servizio, disattivati, bloccati e shy:

- **TW Metriche**: a ogni istante mostra una parola diversa, così `sourceRectAtTime(t)` misura tutte le parole con un solo livello.
- **TW Cache**: controlla se testo e stile sono cambiati. Se non lo sono restituisce solo `=` e il motore usa le misure salvate; altrimenti rifà misure e analisi del testo. Qualsiasi modifica nella composizione rivaluta questa espressione, perciò non deve rimisurare né restituire testi lunghi.
- **TW Motore**: legge forme e misure, calcola la disposizione del frame e la scrive come testo. Sotto l'espressione conserva la copia delle misure salvate.

Sul testo, l'animatore `TW Posizione`, con Expression Selector, legge il risultato: sposta ogni parola e porta fuori scena quelle in eccesso. AE non considera parola un simbolo senza glifo nel font, come `→` in alcuni font, quindi il plugin lo salta. Il conteggio viene confrontato con quello reale di AE: se non coincide, il selettore passa ai caratteri. L'Amount è limitato a ±100%, quindi Position vale 100000 e l'Amount è `pixel / 1000`.

I livelli sono collegati con Layer Control, che usa l'ID e non il nome. Non eliminare i livelli `TW`: usa **Rimuovi wrap**.

## Sviluppo

Modifica i file in `src/`, poi rigenera `Text Wrap.jsx` con:

```bash
node build.js
```

`tests/verify-ae.jsx` prova demo, forme, allineamenti, overflow, modifiche dal vivo e pulsanti del pannello in AE. Va lanciato impostando `$.global.TW_OUT`, `TW_FRAMES` e `TW_SCRIPT`.
