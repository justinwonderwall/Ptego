async function fetchWithTimeout(url, ms = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// MW audio filenames map to a subdirectory: https://dictionaryapi.com/products/json#sec-2.prs
function mwAudioUrl(filename) {
  let subdir;
  if (filename.startsWith('bix')) subdir = 'bix';
  else if (filename.startsWith('gg')) subdir = 'gg';
  else if (/^[^a-zA-Z]/.test(filename)) subdir = 'number';
  else subdir = filename[0];
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${filename}.mp3`;
}

async function lookupMerriamWebster(word, apiKey) {
  const url = `https://www.dictionaryapi.com/api/v3/references/sd3/json/${encodeURIComponent(word)}?key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Word "${word}" not found in dictionary`);
  const data = await res.json();

  const entries = (data || []).filter(e => typeof e === 'object' && e.meta);
  if (entries.length === 0) throw new Error(`Word "${word}" not found in dictionary`);

  let phonetic = null;
  let audio_url = null;
  for (const e of entries) {
    for (const pr of e.hwi?.prs || []) {
      if (!phonetic && pr.mw) phonetic = pr.mw;
      if (!audio_url && pr.sound?.audio) audio_url = mwAudioUrl(pr.sound.audio);
    }
  }

  const definitions = entries.flatMap(e =>
    (e.shortdef || []).slice(0, 2).map(def => ({
      partOfSpeech: e.fl || null,
      definition: def,
      example: null,
    }))
  );

  return { phonetic, audio_url, definitions };
}

async function lookupFreeDictionaryApi(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Word "${word}" not found in dictionary`);
  const data = await res.json();
  const entry = data[0];

  let phonetic = entry.phonetic || null;
  let audio_url = null;

  for (const ph of entry.phonetics || []) {
    if (!phonetic && ph.text) phonetic = ph.text;
    if (!audio_url && ph.audio) audio_url = ph.audio;
  }

  const definitions = (entry.meanings || []).flatMap(m =>
    (m.definitions || []).slice(0, 2).map(d => ({
      partOfSpeech: m.partOfSpeech,
      definition: d.definition,
      example: d.example || null,
    }))
  );

  return { phonetic, audio_url, definitions };
}

// Fast path: phonetic/audio/English definitions only. Used internally whenever a
// knowledge point is saved (to fill in phonetic + audio_url) — no AI call, cheap.
async function lookup(word) {
  const mwKey = process.env.MERRIAM_WEBSTER_API_KEY;
  return mwKey ? lookupMerriamWebster(word, mwKey) : lookupFreeDictionaryApi(word);
}

// Rich path: adds AI-generated Chinese definitions + example sentence. Used only by
// the explicit dictionary search endpoint, since it costs an AI call.
async function lookupRich(word) {
  const aiDictionary = require('./aiDictionary');
  const [baseResult, aiResult] = await Promise.allSettled([lookup(word), aiDictionary.defineWord(word)]);

  if (baseResult.status === 'rejected' && aiResult.status === 'rejected') {
    throw new Error(`Word "${word}" not found in dictionary`);
  }

  const base = baseResult.status === 'fulfilled' ? baseResult.value : { phonetic: null, audio_url: null, definitions: [] };
  const ai   = aiResult.status   === 'fulfilled' ? aiResult.value   : { definitions: [], example_en: null, example_zh: null };

  return {
    phonetic: base.phonetic,
    audio_url: base.audio_url,
    definitions: base.definitions,
    zh_definitions: ai.definitions,
    example_en: ai.example_en,
    example_zh: ai.example_zh,
  };
}

module.exports = { lookup, lookupRich };
