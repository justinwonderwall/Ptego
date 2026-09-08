import React from 'react';
import {
  MDXEditor,
  headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin,
  markdownShortcutPlugin, linkPlugin, linkDialogPlugin, imagePlugin, tablePlugin,
  toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect,
  ListsToggle, CreateLink, InsertImage, InsertTable, InsertThematicBreak,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { api } from '../api';
import { useTheme } from '../useTheme';

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const { url } = await api.uploadTemplateImage(fd);
  return url;
}

export default function MarkdownEditor({ markdown, onChange, readOnly, editorKey }) {
  const { theme } = useTheme();

  // MDXEditor ships its own "dark-theme" CSS-module class carrying its own
  // color tokens (independent of, and loaded after, the app's `.dark` class
  // on <html>) — without applying it explicitly the editor silently falls
  // back to its light palette even inside our dark mode.
  const themeClass = theme === 'dark' ? 'dark-theme' : '';

  return (
    <div className={readOnly
      ? ''
      : 'border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden'
    }>
      <MDXEditor
        key={editorKey}
        className={themeClass}
        markdown={markdown || ''}
        onChange={onChange}
        readOnly={readOnly}
        contentEditableClassName={readOnly
          ? 'prose prose-slate dark:prose-invert max-w-none px-0 py-2 text-[15px] leading-[1.85]'
          : 'prose prose-sm dark:prose-invert max-w-none min-h-[480px] max-h-[75vh] overflow-y-auto px-4 py-3 text-sm'
        }
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          imagePlugin({ imageUploadHandler: uploadImage }),
          markdownShortcutPlugin(),
          ...(readOnly ? [] : [
            toolbarPlugin({
              toolbarContents: () => (
                <div className="flex items-center gap-1 flex-wrap">
                  <UndoRedo />
                  <BoldItalicUnderlineToggles />
                  <BlockTypeSelect />
                  <ListsToggle />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                </div>
              ),
            }),
          ]),
        ]}
      />
    </div>
  );
}
