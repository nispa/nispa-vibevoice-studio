# Guida alla Fonetica CMU (ARPAbet) Inline — OmniVoice

> Questa guida spiega come controllare e correggere la pronuncia delle parole inglesi in **OmniVoice** usando la trascrizione fonetica **CMU (ARPAbet)** direttamente nel testo delle battute.
>
> [!IMPORTANT]
> **Compatibilità Motori:** Questa sintassi funziona **esclusivamente con OmniVoice**.
> Gli altri motori disponibili in Nispa Voiceover (**Qwen3-TTS**, **Higgs Audio v3**, **VibeVoice**) **non supportano** i fonemi CMU: inserendo sequenze come `[B EY1 S]` leggeranno le lettere e i numeri ad alta voce (es. *"B - E - Y - one - S"*). Per gli altri motori usa il respelling naturale (es. *bace*).

---

## 1. Cos'è la Fonetica CMU e Perché Serve

Nei modelli di Text-to-Speech (TTS), la maggior parte delle parole viene convertita automaticamente in suoni tramite grafema-a-fonema (G2P). Tuttavia, in inglese esistono molte situazioni ambigue:

1. **Eteronimi (omografi non omofoni):** Parole scritte nello stesso modo ma pronunciate diversamente in base al significato o al ruolo grammaticale (es. *bass* chitarra basso vs *bass* pesce persico; *read* presente vs passato).
2. **Nomi propri, brand e toponimi:** Nomi non presenti nel vocabolario standard che il modello rischia di storpiare.
3. **Parole straniere o prestiti linguistici:** Termini che si desidera far pronunciare con una specifica intonazione fonetica.
4. **Didattica e valutazione linguistica (QCER / CEFR):** Creazione di tracce d'esame e prove di ascolto universitarie in cui è fondamentale testare la discriminazione auricolare di coppie minime ed eteronimi con pronuncia certificata.

OmniVoice supporta nativamente il dizionario fonetico della **Carnegie Mellon University (CMUdict / ARPAbet)**. È possibile sostituire o forzare la pronuncia di qualsiasi parola scrivendo i relativi fonemi CMU tra parentesi quadre `[...]`.

---

## 2. Regole di Sintassi in OmniVoice

La sintassi è rigorosa:

1. **Parentesi Quadre:** La sequenza fonetica deve essere racchiusa tra parentesi quadre: `[ ... ]`.
2. **Lettere Maiuscole:** Tutti i simboli fonetici devono essere scritti in **MAIUSCOLO**.
3. **Spazio tra i Fonemi:** Ogni singolo fonema deve essere separato da uno spazio.
4. **Stress Marker (Numeri di Accento) obbligatori sulle vocali:**
   - `0` = Sillaba atona (senza accento / debole).
   - `1` = Accento primario (sillaba tonica principale).
   - `2` = Accento secondario.
5. **Nessun numero sulle consonanti:** Le consonanti non prendono numeri di accento.

### Esempio Base
Invece di scrivere:
```text
He plays the bass guitar.
```
Se il modello sbaglia e pronuncia *bass* come il pesce persico (`[B AE1 S]`), scrivi:
```text
He plays the [B EY1 S] guitar.
```

---

## 3. Tabella Completa dei 39 Fonemi CMU (ARPAbet)

### 3.1. Vocali e Dittonghi (richiedono sempre 0, 1 o 2)

| Fonema | Esempio Parola | Trascrizione CMU | Suono approssimativo |
|:------:|:---------------|:-----------------|:---------------------|
| **AA** | f**a**ther, **o**dd | `[F AA1 DH ER0]` | A aperta e profonda |
| **AE** | **a**t, f**a**st, c**a**t | `[K AE1 T]` | A aperta anteriore inglese |
| **AH** | h**u**t, c**u**t, **u**nder | `[K AH1 T]` | Vocale centrale (o schwa se AH0) |
| **AO** | **ou**ght, c**augh**t, l**aw** | `[L AO1]` | O aperta |
| **AW** | c**ow**, h**ow**, **ou**t | `[K AW1]` | Dittongo "au" |
| **AY** | h**i**de, b**i**te, m**y** | `[M AY1]` | Dittongo "ai" |
| **EH** | r**e**d, b**e**d, y**e**s | `[B EH1 D]` | E aperta |
| **ER** | h**ur**t, b**ir**d, t**ur**n | `[B ER1 D]` | Vocale rotica / r-colored |
| **EY** | **a**te, d**ay**, b**a**se | `[B EY1 S]` | Dittongo "ei" |
| **IH** | **i**t, s**i**t, b**i**g | `[B IH1 G]` | I breve e rilassata |
| **IY** | **ea**t, s**ee**, m**ee**t | `[S IY1]` | I lunga e tesa |
| **OW** | **oa**t, g**o**, sh**ow** | `[SH OW1]` | Dittongo "ou" |
| **OY** | t**oy**, b**oy**, c**oi**n | `[B OY1]` | Dittongo "oi" |
| **UH** | h**oo**d, b**oo**k, p**u**t | `[B UH1 K]` | U breve e rilassata |
| **UW** | t**wo**, b**oo**t, f**oo**d | `[F UW1 D]` | U lunga e tesa |

---

### 3.2. Consonanti Occlusive e Affricate

| Fonema | Esempio Parola | Trascrizione CMU | Note |
|:------:|:---------------|:-----------------|:-----|
| **P**  | **p**at, s**p**oon | `[P AE1 T]` | Sorda |
| **B**  | **b**at, ca**b** | `[B AE1 T]` | Sonora |
| **T**  | **t**op, ca**t** | `[T AA1 P]` | Sorda |
| **D**  | **d**og, re**d** | `[D AO1 G]` | Sonora |
| **K**  | **c**at, s**k**y | `[K AE1 T]` | Sorda |
| **G**  | **g**o, bi**g** | `[G OW1]` | Sonora |
| **CH** | **ch**air, ca**tch** | `[CH EH1 R]` | Affricata sorda (come "cena") |
| **JH** | **j**oy, **j**ump, e**dg**e | `[JH OY1]` | Affricata sonora (come "giorno") |

---

### 3.3. Consonanti Fricative

| Fonema | Esempio Parola | Trascrizione CMU | Note |
|:------:|:---------------|:-----------------|:-----|
| **F**  | **f**an, o**ff** | `[F AE1 N]` | Sorda |
| **V**  | **v**an, ha**ve** | `[V AE1 N]` | Sonora |
| **TH** | **th**in, pa**th** | `[TH IH1 N]` | Interdentale sorda (inglese *think*) |
| **DH** | **th**is, fa**th**er | `[DH IH1 S]` | Interdentale sonora (inglese *this*) |
| **S**  | **s**it, mi**ss** | `[S IH1 T]` | Sibilante sorda |
| **Z**  | **z**oo, ro**s**e | `[Z UW1]` | Sibilante sonora |
| **SH** | **sh**oe, mi**ssi**on | `[SH UW1]` | Sibilante postalveolare sorda ("scena") |
| **ZH** | mea**su**re, vi**si**on | `[M EH1 ZH ER0]` | Sibilante postalveolare sonora |
| **HH** | **h**at, **h**ome | `[HH AE1 T]` | Aspirata |

---

### 3.4. Nasali, Liquide e Semivocali

| Fonema | Esempio Parola | Trascrizione CMU | Note |
|:------:|:---------------|:-----------------|:-----|
| **M**  | **m**an, su**m** | `[M AE1 N]` | Nasale bilabiale |
| **N**  | **n**o, su**n** | `[N OW1]` | Nasale alveolare |
| **NG** | si**ng**, ri**ng** | `[S IH1 NG]` | Nasale velare |
| **L**  | **l**amp, be**ll** | `[L AE1 M P]` | Liquida laterale |
| **R**  | **r**ed, ca**r** | `[R EH1 D]` | Liquida rotica |
| **W**  | **w**e, **w**in | `[W IH1 N]` | Semivocale velare |
| **Y**  | **y**es, **y**ou | `[Y EH1 S]` | Semivocale palatale |

---

## 4. Esempi Pratici di Eteronimi Comuni

Ecco alcuni esempi pronti all'uso per risolvere le più frequenti confusioni di pronuncia in inglese:

| Parola | Significato 1 | Trascrizione 1 | Significato 2 | Trascrizione 2 |
|:-------|:--------------|:---------------|:--------------|:---------------|
| **bass** | Basso (musica) | `[B EY1 S]` | Spigola / Persico | `[B AE1 S]` |
| **lead** | Condurre / Guida | `[L IY1 D]` | Piombo (metallo) | `[L EH1 D]` |
| **read** | Leggere (presente) | `[R IY1 D]` | Letto (passato) | `[R EH1 D]` |
| **tear** | Lacrima | `[T IH1 R]` | Strappo / Strappare | `[T EH1 R]` |
| **wind** | Vento | `[W IH1 N D]` | Riavvolgere / Caricare | `[W AY1 N D]` |
| **live** | Vivere (verbo) | `[L IH1 V]` | Dal vivo (agg.) | `[L AY1 V]` |
| **bow** | Arco / Fiocco | `[B OW1]` | Inchino / Inchinarsi | `[B AW1]` |
| **record** | Registrare (verbo) | `[R IH0 K AO1 R D]` | Disco / Primato (nome) | `[R EH1 K ER0 D]` |
| **minute** | Minuto (tempo) | `[M IH1 N AH0 T]` | Minuscolo (agg.) | `[M AY0 N UW1 T]` |

### Esempio in una riga di dialogo:
```text
Alice: Please don't [T EH1 R] the letter, it brought a [T IH1 R] to my eye.
Bob: I will [R IH0 K AO1 R D] the music, then we can break the [R EH1 K ER0 D].
```

---

## 5. Come Trovare Rapidamente la Trascrizione Fonetica CMU

Se devi trascrivere una parola complessa e non sai quali fonemi compongano la parola:

1. **Dizionario Online Ufficiale CMU:**
   - Visita lo strumento online: `http://www.speech.cs.cmu.edu/cgi-bin/cmudict`
   - Inserisci la parola desiderata (es. `schedule`) e otterrai la stringa completa: `S K EH1 JH UH0 L` (oppure la variante UK `SH EH1 D Y UW0 L`).
2. **In Python (se hai l'ambiente attivo):**
   ```python
   import nltk
   # dopo aver scaricato cmudict con nltk.download('cmudict')
   from nltk.corpus import cmudict
   d = cmudict.dict()
   print(" ".join(d['matrix'][0]))  # M EY1 T R IH0 K S
   ```
3. **Copia i simboli ottenuti racchiudendoli tra quadre:** `[M EY1 T R IH0 K S]`.

---

## 6. Errori Comuni da Evitare

- ❌ **Minuscolo:** `[b ey1 s]` → Il modello non riconoscerà i fonemi e potrebbe sillabarli come lettere singole. Usare sempre `[B EY1 S]`.
- ❌ **Mancanza di spazi:** `[BEY1S]` → Errore, i fonemi non vengono separati. Usare `[B EY1 S]`.
- ❌ **Omissione dell'accento tonico sulla vocale:** `[B EY S]` → La vocale senza `0`, `1` o `2` può produrre artefatti o fallire il parsing fonetico. Usare `[B EY1 S]`.
- ❌ **Stress marker sulle consonanti:** `[B1 EY1 S]` → Le consonanti non accettano numeri.
- ❌ **Confusione con i tag emotivi di Higgs Audio:** I tag `<|emotion:...|>` o `<|style:...|>` funzionano solo con **Higgs Audio v3**. OmniVoice supporta solo i tag non-verbali tra quadre come `[laughter]` o `[sigh]` e la fonetica `[FONEMI]`.

---

## 7. Compatibilità con gli Altri Motori TTS

In Nispa Voiceover sono disponibili 4 motori TTS, ciascuno con capacità diverse:

| Motore | Fonetica CMU `[B EY1 S]` | Tag Paralinguistici (risate/sospiri) | Tag Emozioni/Stile `<|...|>` | Risultato se usi `[B EY1 S]` | Alternativa consigliata |
|:-------|:---:|:---:|:---:|:---|:---|
| **OmniVoice** | **Sì** | **Sì** (`[laughter]`, `[sigh]`) | No | Pronuncia corretta | Notazione fonetica CMU |
| **Higgs Audio v3** | **No** | **Sì** (`<|sfx:laughter|>`) | **Sì** (`<|emotion:...|>`) | Legge lettere e numeri | Respelling ortografico naturale |
| **Qwen3-TTS** | **No** | **No** | **No** | Legge lettere e numeri (*"B - E - Y - one - S"*) | Respelling ortografico naturale |
| **VibeVoice** | **No** | **No** | **No** | Legge lettere e numeri | Respelling ortografico naturale |

### Esempio di Respelling Naturale per Qwen3, Higgs e VibeVoice
Se devi correggere la pronuncia con un modello diverso da OmniVoice:
- Invece di scrivere `[B EY1 S]`, scrivi direttamente **`bace`** o **`base`**.
- Invece di scrivere `[L EH1 D]` (piombo), scrivi **`led`**.
- Per parole straniere pronunciate da una voce italiana, scrivi la parola all'italiana (es. *"naic"* al posto di *Nike*).

---

## 8. Contesto d'Uso: Valutazione delle Competenze Linguistiche & Varietà Regionali

### 8.1. Obiettivo dell'Applicazione
Nispa Voiceover nasce come applicazione locale, privata e offline per la creazione di voiceover e dialoghi multi-speaker. Uno dei principali ambiti di applicazione è la **didattica accademica e la valutazione delle competenze linguistiche** (es. nei **Centri Linguistici Universitari - CLA**, laboratori di fonetica, esami di ateneo e certificazioni linguistiche).

### 8.2. Rilevanza per gli Standard QCER / CEFR (Livelli B2, C1, C2)
Nei moderni standard internazionali di valutazione della comprensione orale (*Listening Comprehension* secondo il QCER/CEFR, IELTS, Cambridge, TOEFL), la padronanza linguistica richiede di saper comprendere:
- Non soltanto le varietà standard formali (Received Pronunciation britannica o General American);
- Ma anche **varietà regionali e dialetti nativi** (accenti britannici regionali come scozzese, irlandese, gallese, cockney, accenti del nord come Geordie/Scouse, australiano, ecc.);
- Oltre a varietà di **English as a Lingua Franca (ELF)** parlate da oratori internazionali.

### 8.3. Integrazione tra Voice Cloning e Fonetica CMU
In questo scenario educativo e valutativo:
1. **Voice Cloning per la Cadenza Regionale:** Caricando nella *Voice Library* un breve campione audio (3–10 secondi) di un oratore madrelingua con una determinata inflessione o dialetto regionale, il modello (OmniVoice o Qwen3) trasferisce fedelmente la cadenza, la prosodia e il ritmo tipici di quella varietà all'intera traccia d'esame.
2. **Fonetica CMU per il Controllo di Precisione:** Nei test di discriminazione acustica, coppie minime (*minimal pairs*) ed eteronimi, l'inserimento dei fonemi CMU inline `[B EY1 S]` garantisce che la parola chiave della prova venga articolata con la pronuncia esatta richiesta dall'esercizio, scongiurando qualsiasi ambiguità del generatore automatico.


