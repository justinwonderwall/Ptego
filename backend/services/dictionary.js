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

// Fallback phonetic/audio/English-definition source. Reachable everywhere and
// officially licensed, but the phonetic it returns is MW's own respelling
// notation, not IPA, and audio is US-only. Used only if lookupYoudao fails.
async function lookupMerriamWebster(word) {
  const apiKey = process.env.MERRIAM_WEBSTER_API_KEY;
  if (!apiKey) throw new Error('Merriam-Webster API key not configured');

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

  return {
    phonetic, audio_url, definitions, zh_definitions: null,
    phonetic_uk: null, phonetic_us: phonetic,
    audio_url_uk: null, audio_url_us: audio_url,
  };
}

// dict.youdao.com's own public JSON endpoint (the one that backs their dictionary
// website) — not an officially documented developer API, so no ToS grant for
// third-party programmatic use; treated as best-effort with Merriam-Webster as a
// fallback. It bundles real IPA (uk/usphone), UK/US audio, and Chinese glosses
// from Youdao's own "有道词典" content. The same response also embeds
// Oxford-licensed fields (oxford, oxfordAdvance*) — those are deliberately never
// read here, since redistributing Oxford's copyrighted dictionary text isn't ours
// to do (see the mdx-dictionary discussion this integration replaced).
async function lookupYoudao(word) {
  const url = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Word "${word}" not found in Youdao dictionary`);
  const data = await res.json();

  const entry = data.ec?.word?.[0] || data.simple?.word?.[0];
  if (!entry) throw new Error(`Word "${word}" not found in Youdao dictionary`);

  const dictvoice = (speech) => speech ? `https://dict.youdao.com/dictvoice?audio=${speech}` : null;
  const phonetic_uk = entry.ukphone || null;
  const phonetic_us = entry.usphone || null;
  const audio_url_uk = dictvoice(entry.ukspeech);
  const audio_url_us = dictvoice(entry.usspeech);

  const zh_definitions = (entry.trs || []).flatMap(t => {
    const line = t.tr?.[0]?.l?.i?.[0];
    if (!line) return [];
    const m = line.match(/^([a-zA-Z.]+)\.\s*(.*)$/);
    return [m ? { partOfSpeech: m[1], meaning_zh: m[2] } : { partOfSpeech: null, meaning_zh: line }];
  });

  return {
    phonetic: phonetic_uk || phonetic_us, audio_url: audio_url_uk || audio_url_us,
    definitions: [], zh_definitions,
    phonetic_uk, phonetic_us, audio_url_uk, audio_url_us,
  };
}

// Fast path: phonetic/audio only. Used internally whenever a knowledge point is
// saved (to fill in phonetic + audio_url) — no AI call, cheap.
async function lookup(word) {
  try {
    return await lookupYoudao(word);
  } catch (err) {
    console.error('Youdao lookup failed, falling back to Merriam-Webster:', err.message);
    return lookupMerriamWebster(word);
  }
}

// Rich path: adds Chinese definitions + an AI-generated example sentence. Used only
// by the explicit dictionary search endpoint.
async function lookupRich(word) {
  const aiDictionary = require('./aiDictionary');
  const [baseResult, aiResult] = await Promise.allSettled([lookup(word), aiDictionary.defineWord(word)]);

  if (baseResult.status === 'rejected' && aiResult.status === 'rejected') {
    throw new Error(`Word "${word}" not found in dictionary`);
  }

  const base = baseResult.status === 'fulfilled' ? baseResult.value : {
    phonetic: null, audio_url: null, definitions: [], zh_definitions: null,
    phonetic_uk: null, phonetic_us: null, audio_url_uk: null, audio_url_us: null,
  };
  const ai = aiResult.status === 'fulfilled' ? aiResult.value : { definitions: [], example_en: null, example_zh: null };

  return {
    phonetic: base.phonetic,
    audio_url: base.audio_url,
    phonetic_uk: base.phonetic_uk,
    phonetic_us: base.phonetic_us,
    audio_url_uk: base.audio_url_uk,
    audio_url_us: base.audio_url_us,
    definitions: base.definitions,
    zh_definitions: base.zh_definitions?.length ? base.zh_definitions : ai.definitions,
    example_en: ai.example_en,
    example_zh: ai.example_zh,
  };
}

module.exports = { lookup, lookupRich };
