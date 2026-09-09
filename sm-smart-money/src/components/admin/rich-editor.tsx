'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Editor rich text do CMS (G01). Entrega HTML, que e' o que a pagina do portal
 * renderiza. Escrito apenas por administradores autenticados.
 */
export function RichEditor({
  value,
  onChange,
  placeholder = 'Escreva o conteúdo...',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    // Sem isso o Tiptap renderiza no servidor e quebra a hidratacao.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose-sm-money max-w-none px-4 py-3',
        'data-placeholder': placeholder,
      },
    },
  });

  if (!editor) {
    return (
      <div className="h-80 animate-pulse rounded-md border border-line-strong bg-surface-sunken" />
    );
  }

  const actions = [
    { icon: Bold, label: 'Negrito', run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { icon: Italic, label: 'Italico', run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { icon: Heading2, label: 'Título 2', run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { icon: Heading3, label: 'Título 3', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { icon: List, label: 'Lista', run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { icon: ListOrdered, label: 'Lista numerada', run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { icon: Quote, label: 'Citacao', run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
  ];

  function setLink() {
    const previous = editor!.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL do link', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    editor!.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="tiptap-editor overflow-hidden rounded-md border border-line-strong bg-surface">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-sunken p-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.run}
            aria-label={action.label}
            aria-pressed={action.active}
            title={action.label}
            className={cn(
              'grid size-8 place-items-center rounded-sm transition-colors',
              action.active
                ? 'bg-brand-soft text-brand-strong'
                : 'text-text-2 hover:bg-surface hover:text-text-1',
            )}
          >
            <action.icon className="size-4" aria-hidden="true" />
          </button>
        ))}

        <button
          type="button"
          onClick={setLink}
          aria-label="Inserir link"
          title="Inserir link"
          className={cn(
            'grid size-8 place-items-center rounded-sm transition-colors',
            editor.isActive('link')
              ? 'bg-brand-soft text-brand-strong'
              : 'text-text-2 hover:bg-surface hover:text-text-1',
          )}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </button>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="Desfazer"
          title="Desfazer"
          className="grid size-8 place-items-center rounded-sm text-text-2 transition-colors hover:bg-surface hover:text-text-1"
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="Refazer"
          title="Refazer"
          className="grid size-8 place-items-center rounded-sm text-text-2 transition-colors hover:bg-surface hover:text-text-1"
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
