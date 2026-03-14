# Piano: Adattamento Dinamico del BATCH_SIZE basato su VRAM e Modello

Questo documento descrive la strategia per rendere intelligente l'elaborazione in parallelo (Batching). Invece di usare un numero fisso (`BATCH_SIZE = 4`), il sistema calcolerà in tempo reale la dimensione ottimale del batch analizzando il modello in uso e la memoria video (VRAM) effettivamente disponibile sulla GPU.

## 1. Il Contesto: Perché il Batching e Perché Dinamico?

### 1.1 Il limite dell'elaborazione sequenziale
I modelli TTS moderni, come Qwen3-TTS, utilizzano un'architettura **autoregressiva** basata sui Transformer, in modo simile ai modelli linguistici (LLM) come ChatGPT. Quando generano audio per un singolo segmento:
- La GPU carica i pesi del modello.
- Elabora i token testuali e genera i token audio uno dopo l'altro.
- Gran parte della potenza di calcolo della GPU (CUDA cores) rimane **inutilizzata** perché è costretta ad aspettare la fine della sequenza corrente prima di passare alla successiva.

### 1.2 La soluzione: Il Batching con Flash Attention
Raggruppando più segmenti testuali in una singola richiesta (Batching), passiamo un'intera matrice di testi al modello.
Grazie a librerie ottimizzate come **Flash Attention 2**, la GPU può calcolare le matrici di attenzione per tutti i segmenti *contemporaneamente*. 
- **Risultato:** Invece di impiegare 3 secondi per un segmento, la GPU potrebbe impiegare 4 secondi per generarne 4, abbattendo drasticamente i tempi totali.

### 1.3 Il Problema del "Batching Fisso"
Attualmente, il codice forza un `BATCH_SIZE = 4`. Questo crea due enormi criticità:
1. **Rischio OOM (Out Of Memory):** Se un utente seleziona il modello pesante (Qwen3 1.7B) e ha una GPU di fascia media (es. RTX 3060 con 8GB o 12GB di VRAM), chiedere 4 segmenti in parallelo saturerà immediatamente la memoria, facendo crashare il processo e costringendo il sistema a ripiegare sulla lentissima modalità sequenziale (1 alla volta).
2. **Spreco di Risorse:** Se un utente ha una workstation professionale (es. RTX 4090 con 24GB di VRAM) e usa il modello leggero (0.6B), un batch di 4 è troppo piccolo. La GPU potrebbe tranquillamente elaborarner 8 o 10 alla volta, ma è limitata dal nostro codice.

### 1.4 La Motivazione per il "Batching Dinamico"
Per creare un software "Zero-Config" (che funziona al massimo delle sue possibilità senza che l'utente debba smanettare con le impostazioni), il backend deve "parlare" con l'hardware.
Leggendo la VRAM in tempo reale e incrociandola con il "peso" del modello scelto, il software si comporterà come un sarto: taglierà su misura la dimensione del batch, garantendo il 100% della velocità senza mai superare il limite di sicurezza (prevenendo i crash).

---

## 2. Analisi dei Parametri

### A. Impronta del Modello (Model Footprint)
Diversi modelli occupano una quantità fissa di VRAM solo per essere caricati, più una quantità variabile che scala con la lunghezza dell'input e la dimensione del batch.
- **Qwen3-TTS 0.6B**: ~2-3 GB di VRAM base.
- **Qwen3-TTS 1.7B**: ~5-6 GB di VRAM base.

### B. VRAM Disponibile
PyTorch fornisce strumenti nativi per misurare la VRAM:
`free_memory, total_memory = torch.cuda.mem_get_info()`

### C. Stima del Consumo per Segmento
Empiricamente, un segmento testuale medio (20-30 parole, ~3 secondi di audio) generato con Flash Attention 2 richiede un picco temporaneo di memoria.
- **Regola empirica**: Riservare ~1.5GB di VRAM libera per *ogni* elemento del batch quando si usa il modello da 1.7B.

---

## 3. Strategia di Implementazione

La logica verrà integrata in `backend/api/routers/tasks.py` (ex `generation.py`), dove viene gestito il ciclo di code.

### Algoritmo di Calcolo Dinamico

1. **Rilevamento VRAM Iniziale**: Prima di iniziare il ciclo sui segmenti, interrogare CUDA.
2. **Identificazione Modello**: Leggere il `model_name` per determinare il moltiplicatore di peso.
3. **Calcolo `dynamic_batch_size`**:
   ```python
   import torch
   
   def calculate_optimal_batch_size(model_name: str) -> int:
       if not torch.cuda.is_available():
           return 1 # Fallback sicuro per CPU o MPS
           
       try:
           free_vram_bytes, _ = torch.cuda.mem_get_info()
           free_vram_gb = free_vram_bytes / (1024 ** 3)
           
           # Costo per segmento in base al modello (stime cautelative)
           if "1.7B" in model_name:
               cost_per_segment_gb = 1.8
           elif "0.6B" in model_name:
               cost_per_segment_gb = 1.0
           else:
               cost_per_segment_gb = 1.5 # Default generico
               
           # Calcolo: Quanti segmenti ci stanno nella VRAM libera?
           # Sottraiamo 1GB come margine di sicurezza assoluto
           usable_vram = max(0, free_vram_gb - 1.0)
           calculated_batch = int(usable_vram // cost_per_segment_gb)
           
           # Limiti di sicurezza: mai meno di 1, mai più di 8 per evitare code infinite
           return max(1, min(calculated_batch, 8))
           
       except Exception as e:
           print(f"Errore calcolo VRAM: {e}")
           return 2 # Fallback intermedio
   ```

## 3. Applicazione nel Ciclo (`subtitle_job`)

Nel file `tasks.py`, modificheremo l'inizio della generazione:

```python
# Prima:
# BATCH_SIZE = 4

# Dopo:
BATCH_SIZE = calculate_optimal_batch_size(model_name)
print(f"[Sistema] VRAM analizzata. Batch Size dinamico impostato a: {BATCH_SIZE}")

for i in range(0, total_items, BATCH_SIZE):
    batch = job_segments[i:i+BATCH_SIZE]
    # ... logica esistente ...
```

## 4. Impatto sulla UI: Progress Bar ed ETA

L'introduzione del batching (specialmente se dinamico) cambia il modo in cui il backend emette gli aggiornamenti di progresso. Invece di un avanzamento fluido e lineare (1, 2, 3, 4...), il frontend riceverà aggiornamenti "a scatti" o "burst" (es. salti da 0 a 4, poi a 8, o da 0 a 7, a 14 se il batch è 7).

### 4.1 Sfide per l'ETA
L'attuale algoritmo dell'ETA in `GenerationControls.tsx` si basa sul tempo medio per singolo segmento (`avgPerItem = elapsed / current`).
Con il batching, il tempo `elapsed` copre la generazione di un intero batch. Se l'aggiornamento della UI avviene *durante* lo srotolamento dei risultati del batch (il ciclo for in `tasks.py` che invia i segmenti via SSE uno per uno in rapida successione), l'ETA potrebbe fluttuare selvaggiamente per una frazione di secondo, perché `current` aumenta istantaneamente mentre `elapsed` è rimasto quasi fermo.

### 4.2 Soluzione: Smoothing e Calcolo basato sul Batch
Per mantenere la progress bar e l'ETA stabili:
1. **Invio Consolidato (Backend):** Nel router `tasks.py`, invece di iterare sui risultati e fare uno `yield` individuale per ogni segmento del batch, potremmo fare un singolo `yield` che invia l'intero array di `new_segments` completati in quel batch, insieme al nuovo `current_item` aggiornato in blocco. (Già parzialmente previsto dalla struttura SSE attuale).
2. **Media Mobile (Frontend):** Nel frontend, invece di dividere brutalmente `elapsed / current`, si può implementare una media mobile pesata (SMA) o aggiornare l'ETA solo quando si riceve un nuovo batch di risultati, evitando ricalcoli sui micro-aggiornamenti istantanei.

## 5. Vantaggi
- **Utenti con RTX 4090/3090 (24GB VRAM)**: Il sistema potrebbe calcolare un `BATCH_SIZE = 8`, processando l'intero copione in pochi istanti.
- **Utenti con RTX 3060/4060 (8-12GB VRAM)**: Il sistema si attesterà su `BATCH_SIZE = 2` o `3`, garantendo che l'applicazione non vada in crash.
- **Stabilità Assoluta**: Il margine di sicurezza fisso di 1GB previene i picchi imprevisti causati da frasi eccezionalmente lunghe.
