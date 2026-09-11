import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const CAT_VALUES = ['grammar', 'word_sense', 'collocation', 'polysemy'];

const TAGS = [
  { value: 'read',  label: 'Read' },
  { value: 'speak', label: 'Speak' },
  { value: 'write', label: 'Write' },
];

export default function KnowledgeEditModal({ item, onClose, onSaved }) {
  const { t } = useTranslation();
  const CATEGORIES = CAT_VALUES.map(value => ({ value, label: t(`categories.${value}`) }));
  const [form, setForm] = useState({
    category:      item.category      || 'grammar',
    term_en:       item.term_en       || '',
    meaning_zh:    item.meaning_zh    || '',
    usage_example: item.usage_example || '',
    study_note:    item.study_note    || '',
    skill_tags:    item.skill_tags    || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (value) =>
    setForm(f => ({
      ...f,
      skill_tags: f.skill_tags.includes(value) ? f.skill_tags.filter(t => t !== value) : [...f.skill_tags, value],
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateKnowledge(item.id, form);
      onSaved();
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg space-y-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('knowledge.editModal.title')}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.category')}</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.termEn')}</label>
            <input
              value={form.term_en}
              onChange={e => set('term_en', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.meaningZh')}</label>
          <input
            value={form.meaning_zh}
            onChange={e => set('meaning_zh', e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.example')}</label>
          <textarea
            value={form.usage_example}
            onChange={e => set('usage_example', e.target.value)}
            rows={2}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.studyNote')}</label>
          <textarea
            value={form.study_note}
            onChange={e => set('study_note', e.target.value)}
            rows={2}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('knowledge.fields.tags')}</label>
          <div className="flex gap-1.5">
            {TAGS.map(tg => (
              <button
                key={tg.value}
                type="button"
                onClick={() => toggleTag(tg.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  form.skill_tags.includes(tg.value)
                    ? 'border-blue-300 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {form.skill_tags.includes(tg.value) && <span className="mr-0.5">✓</span>}
                {tg.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? t('knowledge.saving') : t('common.save')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
