import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface DisplayNameDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  language?: string;
}

export function DisplayNameDialog({ open, onClose, onSaved, language = "pt" }: DisplayNameDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const utils = trpc.useUtils();

  const setDisplayName = trpc.forum.setDisplayName.useMutation({
    onSuccess: () => {
      utils.forum.getDisplayName.invalidate();
      toast.success(language === "en" ? "Display name saved!" : language === "es" ? "¡Nombre guardado!" : "Nome salvo!");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    setDisplayName.mutate({ displayName: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {language === "en" ? "Choose your display name" : language === "es" ? "Elige tu nombre de usuario" : "Escolha seu nome de exibição"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {language === "en"
            ? "This is how your name will appear in the forum. You can change it later."
            : language === "es"
            ? "Así aparecerá tu nombre en el foro. Puedes cambiarlo más tarde."
            : "É assim que seu nome aparecerá no fórum. Você pode alterá-lo a qualquer momento."}
        </p>
        <div className="py-2">
          <Label htmlFor="display-name-input">
            {language === "en" ? "Display name" : language === "es" ? "Nombre de usuario" : "Nome de exibição"}
          </Label>
          <Input
            id="display-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={64}
            aria-required="true"
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {language === "en" ? "Cancel" : language === "es" ? "Cancelar" : "Cancelar"}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || setDisplayName.isPending}>
            {setDisplayName.isPending ? "..." : language === "en" ? "Save" : language === "es" ? "Guardar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
