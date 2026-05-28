import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Undo2,
  Redo2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || "";
      setIsInitialized(true);
    }
  }, [isInitialized, value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("Digite a URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    try {
      // Try to get HTML first, fall back to plain text
      let content = e.clipboardData.getData("text/html");
      if (!content) {
        content = e.clipboardData.getData("text/plain");
        // Convert plain text line breaks to HTML paragraphs
        content = content
          .split("\n\n")
          .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
          .join("");
      }
      document.execCommand("insertHTML", false, content);
    } catch (error) {
      console.error("Paste error:", error);
      // Fallback: insert as plain text
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background relative">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("bold")}
          title="Negrito (Ctrl+B)"
          className="w-10 h-10 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("italic")}
          title="Itálico (Ctrl+I)"
          className="w-10 h-10 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("insertUnorderedList")}
          title="Lista com pontos"
          className="w-10 h-10 p-0"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("insertOrderedList")}
          title="Lista numerada"
          className="w-10 h-10 p-0"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("formatBlock", "h2")}
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

        <div className="w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("undo")}
          title="Desfazer"
          className="w-10 h-10 p-0"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => execCommand("redo")}
          title="Refazer"
          className="w-10 h-10 p-0"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-64 p-4 focus:outline-none focus:ring-0 prose prose-sm dark:prose-invert max-w-none text-foreground"
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
        }}
        suppressContentEditableWarning
      />
      {!value && placeholder && (
        <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}

      {/* Info */}
      <div className="px-4 py-2 bg-muted border-t border-border text-xs text-muted-foreground">
        Escreva como um email normal. A formatação será convertida automaticamente para HTML.
      </div>
    </div>
  );
}
