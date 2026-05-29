import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const insertTag = (openTag: string, closeTag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "texto";
    const newValue =
      value.substring(0, start) +
      openTag +
      selectedText +
      closeTag +
      value.substring(end);

    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt("Digite a URL (ex: https://exemplo.com):");
    if (url) {
      insertTag(`<a href="${url}">`, "</a>");
    }
  };

  const insertHeading = () => {
    insertTag("<h2>", "</h2>");
  };

  const insertBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "Item 1\nItem 2\nItem 3";
    const items = selectedText.split("\n").filter((item) => item.trim());
    const listHtml = items.map((item) => `<li>${item}</li>`).join("\n");
    const newValue =
      value.substring(0, start) +
      `<ul>\n${listHtml}\n</ul>` +
      value.substring(end);

    onChange(newValue);
  };

  const insertOrderedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "Item 1\nItem 2\nItem 3";
    const items = selectedText.split("\n").filter((item) => item.trim());
    const listHtml = items.map((item) => `<li>${item}</li>`).join("\n");
    const newValue =
      value.substring(0, start) +
      `<ol>\n${listHtml}\n</ol>` +
      value.substring(end);

    onChange(newValue);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertTag("<b>", "</b>")}
          title="Negrito"
          className="w-10 h-10 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => insertTag("<i>", "</i>")}
          title="Itálico"
          className="w-10 h-10 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={insertBulletList}
          title="Lista com pontos"
          className="w-10 h-10 p-0"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={insertOrderedList}
          title="Lista numerada"
          className="w-10 h-10 p-0"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={insertHeading}
          title="Título"
          className="w-10 h-10 p-0"
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={insertLink}
          title="Inserir link"
          className="w-10 h-10 p-0"
        >
          <Link2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
        className="min-h-64 font-mono text-sm rounded-none border-none focus-visible:ring-0"
      />

      {/* Info */}
      <div className="px-4 py-2 bg-muted border-t border-border text-xs text-muted-foreground">
        <p className="mb-1">💡 Dicas:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Use os botões acima para adicionar formatação</li>
          <li>Você pode colar textos grandes sem problemas</li>
          <li>O HTML será convertido automaticamente para email</li>
        </ul>
      </div>
    </div>
  );
}
