import { useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Spinner from "react-bootstrap/Spinner";
import { API_URL, apiUpload } from "../api/client";
import { useToast } from "./Toasts";

/**
 * The house rich-text editor (TipTap). Emits HTML; the server sanitizes it
 * against the same node set on save. Used for article bodies and job
 * descriptions — anywhere formatted content is allowed.
 */
type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function ToolbarButton({
  editor,
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  editor: Editor | null;
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}
      title={label}
      aria-label={label}
      disabled={!editor || disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
        code: false,
      }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Write here…" }),
    ],
    content: value || "",
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (empty removes the link)", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function onPickImage(file: File | undefined) {
    if (!file || !editor) return;
    uploadingRef.current = true;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiUpload<{ url: string }>("/admin/uploads", form);
      editor.chain().focus().setImage({ src: `${API_URL}${res.url}`, alt: file.name.replace(/\.[a-z0-9]+$/i, "") }).run();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Image upload failed.", "danger");
    } finally {
      uploadingRef.current = false;
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton editor={editor} icon="bi-paragraph" label="Paragraph" active={editor?.isActive("paragraph") && !editor?.isActive("heading")} onClick={() => editor?.chain().focus().setParagraph().run()} />
        <ToolbarButton editor={editor} icon="bi-type-h2" label="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton editor={editor} icon="bi-type-h3" label="Heading 3" active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
        <span className="vr mx-1" aria-hidden="true"></span>
        <ToolbarButton editor={editor} icon="bi-type-bold" label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ToolbarButton editor={editor} icon="bi-type-italic" label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ToolbarButton editor={editor} icon="bi-type-strikethrough" label="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} />
        <span className="vr mx-1" aria-hidden="true"></span>
        <ToolbarButton editor={editor} icon="bi-list-ul" label="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <ToolbarButton editor={editor} icon="bi-list-ol" label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton editor={editor} icon="bi-quote" label="Blockquote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton editor={editor} icon="bi-hr" label="Divider" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
        <span className="vr mx-1" aria-hidden="true"></span>
        <ToolbarButton editor={editor} icon="bi-link-45deg" label="Link" active={editor?.isActive("link")} onClick={setLink} />
        <ToolbarButton editor={editor} icon="bi-image" label="Insert image" onClick={() => fileRef.current?.click()} />
        <span className="vr mx-1" aria-hidden="true"></span>
        <ToolbarButton editor={editor} icon="bi-arrow-counterclockwise" label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} />
        <ToolbarButton editor={editor} icon="bi-arrow-clockwise" label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} />
        {uploadingRef.current && <Spinner size="sm" className="ms-2 align-self-center" />}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
