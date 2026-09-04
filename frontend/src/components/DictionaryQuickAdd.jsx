import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DictResultPanel, useDictLookup } from './DictionaryLookup';

const TAGS = [
  { value: 'read',  label: 'Read' },
  { value: 'speak', label: 'Speak' },
  { value: 'write', label: 'Write' },
];

export default function DictionaryQuickAdd() {
  const [query, setQuery]   = useState('');
  const { queriedWord, dict, loading, error, lookup } = useDictLookup();

  const [addToKB, setAddToKB] = useState(false);
  const [meaningZh, setMeaningZh] = useState('');
  const [tags, setTags]       = useState([]);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedMsg, setSavedMsg]   = useState(null);

  const search = () => {
    const word = query.trim();
    if (!word) return;
    setAddToKB(false);
    setMeaningZh('');
    setTags([]);
    setSaveError(null);
    lookup(word);
  };

  // Prefill 中文解释 once the AI-generated Chinese definitions arrive
  useEffect(() => {
    if (dict?.zh_definitions?.length) {
      setMeaningZh(dict.zh_definitions.map(d => d.meaning_zh).join('；'));
    }
  }, [dict]);

  const toggleTag = (value) =>
    setTags(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);

  const save = async () => {
    if (!queriedWord || !meaningZh.trim()) {
      setSaveError('请填写中文解释');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const [saved] = await api.saveKnowledge([{
        category: 'word_sense',
        term_en: queriedWord,
        meaning_zh: meaningZh.trim(),
        usage_example: dict?.example_en || null,
        skill_tags: tags,
        source_type: 'dictionary',
      }]);
      setSavedMsg(saved.duplicate ? '该词已在知识库中' : '已加入知识库 ✓');
      setAddToKB(false);
      setMeaningZh('');
      setTags([]);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 space-y-2.5">
      <label className="text-xs text-slate-400 block">字典查询</label>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="输入英文单词…"
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
            dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-3 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40 transition-colors"
        >
          查询
        </button>
      </div>

      <DictResultPanel queriedWord={queriedWord} dict={dict} loading={loading} error={error} />

      {dict && (
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={addToKB} onChange={e => setAddToKB(e.target.checked)} className="accent-blue-500" />
            录入知识库
          </label>

          {addToKB && (
            <div className="space-y-2 pl-1">
              <input
                value={meaningZh}
                onChange={e => setMeaningZh(e.target.value)}
                placeholder="中文解释"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              />

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">标签</label>
                <div className="flex gap-1.5">
                  {TAGS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTag(t.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        tags.includes(t.value)
                          ? 'border-blue-300 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {tags.includes(t.value) && <span className="mr-0.5">✓</span>}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-medium
                  disabled:opacity-40 transition-colors"
              >
                {saving ? '保存中…' : '加入知识库'}
              </button>
            </div>
          )}
        </div>
      )}

      {savedMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
          {savedMsg}
        </div>
      )}
    </div>
  );
}
