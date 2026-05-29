import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value changes into the editor (only if not from internal edits)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    // Only update if content actually differs (avoids cursor jump)
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  // Emit HTML on every input
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    isInternalUpdate.current = true;
    onChange(editor.innerHTML);
  }, [onChange]);

  // Handle paste: clean up and insert as clean HTML
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const clipboardData = e.clipboardData;
        // Try HTML first
        let html = clipboardData.getData("text/html");
        if (html) {
          // Clean up Word/Outlook HTML junk
          html = html
            .replace(/<meta[^>]*>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/class="[^"]*"/gi, "")
            .replace(/style="[^"]*"/gi, "")
            .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1")
            .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, "$1")
            .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<div[^>]*>/gi, "<p>")
            .replace(/<\/div>/gi, "</p>")
            .trim();
          document.execCommand("insertHTML", false, html);
        } else {
          // Plain text: convert line breaks to paragraphs
          const text = clipboardData.getData("text/plain");
          if (text) {
            const paragraphs = text.split(/\n\s*\n/);
            const htmlParagraphs = paragraphs
              .map((para) => {
                const trimmed = para.trim();
                if (!trimmed) return "";
                // Check for bullet lists
                const lines = trimmed.split("\n");
                const isList = lines.some((line) => /^\s*[•\-*]\s/.test(line));
                if (isList) {
                  const items = lines
                    .map((line) => {
                      const cleaned = line.replace(/^\s*[•\-*]\s*/, "").trim();
                      return cleaned ? `<li>${cleaned}</li>` : "";
                    })
                    .filter(Boolean);
                  return `<ul>${items.join("")}</ul>`;
                }
                // Regular paragraph
                const withBr = lines
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .join("<br>");
                return `<p>${withBr}</p>`;
              })
              .filter(Boolean);
            document.execCommand("insertHTML", false, htmlParagraphs.join(""));
          }
        }
        handleInput();
      } catch (err) {
        // Fallback: insert as plain text
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
        handleInput();
      }
    },
    [handleInput]
  );

  // Execute formatting commands
  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const insertLink = () => {
    const url = prompt("Digite a URL (ex: https://exemplo.com):");
    if (url) {
      execCmd("createLink", url);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("bold"); }}
          title="Negrito (Ctrl+B)"
          className="w-9 h-9 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("italic"); }}
          title="Itálico (Ctrl+I)"
          className="w-9 h-9 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("underline"); }}
          title="Sublinhado (Ctrl+U)"
          className="w-9 h-9 p-0"
        >
          <Underline className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("insertUnorderedList"); }}
          title="Lista com pontos"
          className="w-9 h-9 p-0"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("insertOrderedList"); }}
          title="Lista numerada"
          className="w-9 h-9 p-0"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("formatBlock", "h2"); }}
          title="Título"
          className="w-9 h-9 p-0"
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
          title="Inserir link"
          className="w-9 h-9 p-0"
        >
          <Link2 className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("removeFormat"); }}
          title="Remover formatação"
          className="w-9 h-9 p-0"
        >
          <RemoveFormatting className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("undo"); }}
          title="Desfazer (Ctrl+Z)"
          className="w-9 h-9 p-0"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onMouseDown={(e) => { e.preventDefault(); execCmd("redo"); }}
          title="Refazer (Ctrl+Y)"
          className="w-9 h-9 p-0"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* WYSIWYG Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder || "Escreva o conteúdo do email aqui..."}
        className="min-h-64 p-4 text-sm focus:outline-none prose prose-sm max-w-none
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none
          [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-3
          [&_a]:text-blue-500 [&_a]:underline"
        style={{ minHeight: "16rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      />

      {/* Info */}
      <div className="px-4 py-2 bg-muted border-t border-border text-xs text-muted-foreground">
        Escreva normalmente como num email. Use os botões acima para formatar. Atalhos: Ctrl+B (negrito), Ctrl+I (itálico), Ctrl+U (sublinhado), Ctrl+Z (desfazer).
      </div>
    </div>
  );
}
