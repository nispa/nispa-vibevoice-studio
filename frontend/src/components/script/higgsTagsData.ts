import { Sparkles, Mic, Volume2, Activity, Music, type LucideIcon } from 'lucide-react';

export interface TagItem {
    tag: string;
    name: string; // Internal name / key, e.g. "Anger"
    label: string; // User-facing label, e.g. "Anger (Rabbia)"
    description: string;
    example: string;
}

export interface CategoryGroup {
    id: 'emotions' | 'styles' | 'sfx' | 'prosody' | 'env';
    title: string;
    shortTitle: string;
    icon: LucideIcon;
    color: string;
    badgeStyle: {
        bg: string;
        text: string;
        border: string;
        hoverBg: string;
    };
    tags: TagItem[];
}

export const HIGGS_TAG_CATEGORIES: CategoryGroup[] = [
    {
        id: 'emotions',
        title: 'Emozioni & Stati d\'Animo (21 Tag)',
        shortTitle: 'Emozioni (21)',
        icon: Sparkles,
        color: 'text-amber-400',
        badgeStyle: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-300',
            border: 'border-rose-500/30',
            hoverBg: 'hover:bg-rose-500/25',
        },
        tags: [
            { tag: '<|emotion:anger|>', name: 'Anger', label: 'Anger (Rabbia)', description: 'Tono acceso, aggressivo, indignato o autoritario', example: '<|emotion:anger|>Non toccare quel documento senza autorizzazione!' },
            { tag: '<|emotion:sadness|>', name: 'Sadness', label: 'Sadness (Tristezza)', description: 'Tono sommesso, cupo, malinconico o addolorato', example: '<|emotion:sadness|>Temo che non ci sia più nulla da fare per il vecchio maniero.' },
            { tag: '<|emotion:amusement|>', name: 'Amusement', label: 'Amusement (Divertimento)', description: 'Tono allegro, risatina sotto voce, intonazione scherzosa', example: '<|emotion:amusement|>Credevi davvero che fosse andato a cavallo fino in stazione?' },
            { tag: '<|emotion:elation|>', name: 'Elation', label: 'Elation (Euforia)', description: 'Grande entusiasmo, energia elevata, voce squillante e brillante', example: '<|emotion:elation|>Abbiamo vinto la borsa di studio! È fantastico!' },
            { tag: '<|emotion:enthusiasm|>', name: 'Enthusiasm', label: 'Enthusiasm (Entusiasmo)', description: 'Vivace e partecipe, pronto all\'azione', example: '<|emotion:enthusiasm|>Partiamo subito, non vedo l\'ora di cominciare il viaggio!' },
            { tag: '<|emotion:determination|>', name: 'Determination', label: 'Determination (Determinazione)', description: 'Fermo, risoluto, privo di tentennamenti', example: '<|emotion:determination|>Arriveremo fino in fondo, costi quel che costi.' },
            { tag: '<|emotion:pride|>', name: 'Pride', label: 'Pride (Orgoglio)', description: 'Tono fiero, autorevole, sicuro e fiducioso', example: '<|emotion:pride|>Questa fabbrica rappresenta quarant\'anni del nostro lavoro.' },
            { tag: '<|emotion:contentment|>', name: 'Contentment', label: 'Contentment (Appagamento)', description: 'Sereno, rilassato, in pace col mondo', example: '<|emotion:contentment|>Un buon tè caldo davanti al camino: non serve altro.' },
            { tag: '<|emotion:affection|>', name: 'Affection', label: 'Affection (Affetto)', description: 'Tono caldo, premuroso, dolce e intimo', example: '<|emotion:affection|>Non ti preoccupare, andrà tutto bene. Ci sono io qui.' },
            { tag: '<|emotion:relief|>', name: 'Relief', label: 'Relief (Sollievo)', description: 'Rilassatezza, espirazione di scampato pericolo', example: '<|emotion:relief|>Finalmente il peggio è passato, siamo al sicuro.' },
            { tag: '<|emotion:contemplation|>', name: 'Contemplation', label: 'Contemplation (Riflessione)', description: 'Voce pacata, pensierosa, ritmo cadenzato e profondo', example: '<|emotion:contemplation|>Forse avremmo dovuto ascoltare il suo consiglio fin dal principio.' },
            { tag: '<|emotion:confusion|>', name: 'Confusion', label: 'Confusion (Confusione)', description: 'Disorientato, perplesso, cadenza esitante', example: '<|emotion:confusion|>Aspetta un attimo... com\'è possibile che la porta fosse aperta?' },
            { tag: '<|emotion:surprise|>', name: 'Surprise', label: 'Surprise (Sorpresa)', description: 'Stupore improvviso, intonazione interrogativa ed enfatica', example: '<|emotion:surprise|>Cosa ci fai tu qui a quest\'ora della notte?' },
            { tag: '<|emotion:awe|>', name: 'Awe', label: 'Awe (Meraviglia)', description: 'Incantato, sbigottito di fronte alla grandezza', example: '<|emotion:awe|>Guarda quelle montagne... tolgono il respiro.' },
            { tag: '<|emotion:longing|>', name: 'Longing', label: 'Longing (Nostalgia / Desiderio)', description: 'Sognante, malinconico, proiettato verso il passato', example: '<|emotion:longing|>Quanto vorrei tornare a quelle sere d\'estate in riva al mare.' },
            { tag: '<|emotion:arousal|>', name: 'Arousal', label: 'Arousal (Intensità Emotiva)', description: 'Voce intensa, carica di tensione o passione', example: '<|emotion:arousal|>Vieni più vicino, ascolta attentamente.' },
            { tag: '<|emotion:fear|>', name: 'Fear', label: 'Fear (Paura)', description: 'Tono spaventato, agitato, ansioso con respiro tremante', example: '<|emotion:fear|>C\'è qualcuno sulle scale... sta salendo!' },
            { tag: '<|emotion:disgust|>', name: 'Disgust', label: 'Disgust (Disgusto)', description: 'Repulsione, asprezza, tono sprezzante', example: '<|emotion:disgust|>Che squallore... non riesco nemmeno a guardare.' },
            { tag: '<|emotion:bitterness|>', name: 'Bitterness', label: 'Bitterness (Amarezza)', description: 'Disilluso, caustico, risentito', example: '<|emotion:bitterness|>Dopo tutto quello che ho fatto, ecco come vieni ripagato.' },
            { tag: '<|emotion:shame|>', name: 'Shame', label: 'Shame (Vergogna)', description: 'Voce flebile, imbarazzata, spezzata', example: '<|emotion:shame|>Non so come spiegartelo... avrei dovuto dirtelo subito.' },
            { tag: '<|emotion:helplessness|>', name: 'Helplessness', label: 'Helplessness (Impotenza)', description: 'Disperato, disarmato, privo di forze', example: '<|emotion:helplessness|>Non possiamo fare nulla, le acque continuano a salire.' }
        ]
    },
    {
        id: 'styles',
        title: 'Stili Vocali di Recitazione (3 Tag)',
        shortTitle: 'Stili (3)',
        icon: Mic,
        color: 'text-purple-400',
        badgeStyle: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-300',
            border: 'border-purple-500/30',
            hoverBg: 'hover:bg-purple-500/25',
        },
        tags: [
            { tag: '<|style:whispering|>', name: 'Whispering', label: 'Whispering (Sussurrato)', description: 'Voce soffiata, senza vibrazione cordale piena, confidenziale', example: '<|style:whispering|>Non fare rumore... il custode è dietro l\'angolo.' },
            { tag: '<|style:shouting|>', name: 'Shouting', label: 'Shouting (Gridato)', description: 'Proiezione vocale potente, volume elevato e tensione drammatica', example: '<|style:shouting|>Attenzione! L\'impalcatura sta cedendo!' },
            { tag: '<|style:singing|>', name: 'Singing', label: 'Singing (Cantato / Melodico)', description: 'Consegna cantilenata o melodica intonata', example: '<|style:singing|>La la la... una dolce melodia nel silenzio della sera.' }
        ]
    },
    {
        id: 'sfx',
        title: 'Effetti Vocali & Paralinguistici (SFX - 9 Tag)',
        shortTitle: 'SFX & Suoni (9)',
        icon: Volume2,
        color: 'text-emerald-400',
        badgeStyle: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-300',
            border: 'border-emerald-500/30',
            hoverBg: 'hover:bg-emerald-500/25',
        },
        tags: [
            { tag: '<|sfx:laughter|>', name: 'Laughter', label: 'Laughter (Risata)', description: 'Risata inserita naturalmente nel flusso del discorso', example: '<|sfx:laughter|> Questa è senza dubbio la scusa più ridicola che abbia mai sentito!' },
            { tag: '<|sfx:sigh|>', name: 'Sigh', label: 'Sigh (Sospiro)', description: 'Espirazione udibile di stanchezza, rassegnazione o sollievo', example: '<|sfx:sigh|> Un\'altra riunione inutile che poteva essere un\'email.' },
            { tag: '<|sfx:cough|>', name: 'Cough', label: 'Cough (Tosse)', description: 'Colpo di tosse secco con successivo recupero vocale', example: '<|sfx:cough|> Scusatemi, la nebbia stasera è particolarmente densa.' },
            { tag: '<|sfx:crying|>', name: 'Crying', label: 'Crying (Pianto)', description: 'Voce rotta dal pianto con tremolio respiratorio', example: '<|sfx:crying|> Non volevo che finisse così... non è giusto.' },
            { tag: '<|sfx:screaming|>', name: 'Screaming', label: 'Screaming (Urlo)', description: 'Grido acuto di spavento o allarme immediato', example: '<|sfx:screaming|> Aiuto! C\'è qualcuno qui dentro!' },
            { tag: '<|sfx:humming|>', name: 'Humming', label: 'Humming (Mugolio)', description: 'Canticchiare a bocca chiusa (Mh mh)', example: '<|sfx:humming|> Mh mh mh... stavo solo ripensando a quella melodia.' },
            { tag: '<|sfx:sniff|>', name: 'Sniff', label: 'Sniff (Tirare su col naso)', description: 'Tirare su col naso per commozione o freddo', example: '<|sfx:sniff|> Ho un freddo terribile, spero di non ammalarmi.' },
            { tag: '<|sfx:sneeze|>', name: 'Sneeze', label: 'Sneeze (Starnuto)', description: 'Starnuto acustico naturale', example: '<|sfx:sneeze|> Etciù! Scusatemi tanto.' },
            { tag: '<|sfx:burping|>', name: 'Burping', label: 'Burping (Rutto)', description: 'Suono paralinguistico di digestione', example: '<|sfx:burping|> Scusate, quel pasto era davvero abbondante.' }
        ]
    },
    {
        id: 'prosody',
        title: 'Prosodia, Ritmo & Intonazione (10 Tag)',
        shortTitle: 'Prosodia (10)',
        icon: Activity,
        color: 'text-blue-400',
        badgeStyle: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-300',
            border: 'border-blue-500/30',
            hoverBg: 'hover:bg-blue-500/25',
        },
        tags: [
            { tag: '<|prosody:pause|>', name: 'Pause', label: 'Pause (Pausa breve)', description: 'Inserisce un silenzio ritmico naturale prima della parola successiva', example: 'La risposta è semplice: <|prosody:pause|> non è mai esistito.' },
            { tag: '<|prosody:long_pause|>', name: 'Long Pause', label: 'Long Pause (Pausa lunga)', description: 'Pausa drammatica prolungata di riflessione o attesa', example: 'E poi accadde l\'impensabile. <|prosody:long_pause|> Tutto svanì nel nulla.' },
            { tag: '<|prosody:speed_slow|>', name: 'Speed Slow', label: 'Speed Slow (Parlato lento)', description: 'Vocali distese, cadenza posata e misurata', example: '<|prosody:speed_slow|>Ogni singolo dettaglio... deve essere curato con precisione.' },
            { tag: '<|prosody:speed_fast|>', name: 'Speed Fast', label: 'Speed Fast (Parlato rapido)', description: 'Cadenza accelerata, concitata ed energica', example: '<|prosody:speed_fast|>Dobbiamo fare in fretta, il treno sta per partire!' },
            { tag: '<|prosody:speed_very_slow|>', name: 'Very Slow', label: 'Very Slow (Molto lento)', description: 'Cadenza solenne, ipnotica o grave molto rallentata', example: '<|prosody:speed_very_slow|>Il tempo... sembra essersi fermato del tutto.' },
            { tag: '<|prosody:speed_very_fast|>', name: 'Very Fast', label: 'Very Fast (Molto rapido)', description: 'Raffica verbale concitata ad alta velocità', example: '<|prosody:speed_very_fast|>Via via via, non c\'è un secondo da perdere!' },
            { tag: '<|prosody:pitch_high|>', name: 'Pitch High', label: 'Pitch High (Tono acuto)', description: 'Frequenza fondamentale alzata mantenendo il timbro clone', example: '<|prosody:pitch_high|>Sei assolutamente certo che quella creaturina sia innocua?' },
            { tag: '<|prosody:pitch_low|>', name: 'Pitch Low', label: 'Pitch Low (Tono grave / profondo)', description: 'Frequenza fondamentale abbassata, registro scuro o cupo', example: '<|prosody:pitch_low|>Entrate pure... ma lasciate ogni speranza.' },
            { tag: '<|prosody:expressive_high|>', name: 'Expressive High', label: 'Expressive High (Enfasi dinamica)', description: 'Massima escursione dinamica e tonale della recitazione', example: '<|prosody:expressive_high|>È la scoperta del secolo! Cambierà la storia!' },
            { tag: '<|prosody:expressive_low|>', name: 'Expressive Low', label: 'Expressive Low (Tono piatto)', description: 'Recitazione monocorde, impassibile o burocratica', example: '<|prosody:expressive_low|>I moduli devono essere compilati in triplice copia.' }
        ]
    },
    {
        id: 'env',
        title: 'Ambiente Acustico (2 Tag)',
        shortTitle: 'Ambiente (2)',
        icon: Music,
        color: 'text-indigo-400',
        badgeStyle: {
            bg: 'bg-indigo-500/10',
            text: 'text-indigo-300',
            border: 'border-indigo-500/30',
            hoverBg: 'hover:bg-indigo-500/25',
        },
        tags: [
            { tag: '<|env:noise|>', name: 'Noise', label: 'Noise (Rumore di fondo)', description: 'Suggerisce una leggera tessitura acustica ambientale rumorosa', example: '<|env:noise|>Riesci a sentirmi attraverso il traffico della città?' },
            { tag: '<|env:music|>', name: 'Music', label: 'Music (Sottofondo musicale)', description: 'Suggerisce atmosfera musicale di sottofondo', example: '<|env:music|>Benvenuti alla nostra trasmissione serale.' }
        ]
    }
];

export const TOTAL_HIGGS_TAGS_COUNT = HIGGS_TAG_CATEGORIES.reduce(
    (acc, cat) => acc + cat.tags.length,
    0
);
