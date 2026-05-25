import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Trash2, Eye, FileMusic, FileText, Code } from "lucide-react";
import { toast } from "sonner";

interface BrailleProject {
  id: number;
  userId: number;
  title: string;
  language: "pt" | "en" | "es";
  contentBraille?: string;
  contentText?: string;
  contentMusicXml?: string;
  createdAt: Date;
  updatedAt: Date;
  userName?: string | null;
  userEmail?: string | null;
}

export default function BrailleProjectsAdmin() {
  const [selectedProject, setSelectedProject] = useState<BrailleProject | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportFormat, setExportFormat] = useState<"brf" | "txt">("brf");

  const { data: projects = [], isLoading } = trpc.editor.all.useQuery();
  const { data: stats } = trpc.editor.stats.useQuery();
  const deleteMutation = trpc.editor.delete.useMutation({
    onSuccess: () => {
      toast.success("Projeto deletado com sucesso");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const exportMutation = trpc.editor.export.useMutation({
    onSuccess: (data) => {
      // Criar link de download
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.fileName;
      link.click();
      toast.success(`Arquivo ${data.fileName} baixado com sucesso`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const filteredProjects = projects.filter(
    (proj: any) =>
      proj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.language.includes(searchTerm)
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;
    await deleteMutation.mutateAsync({ id });
  };

  const handleExport = async (id: number, format: "brf" | "txt") => {
    await exportMutation.mutateAsync({ id, format });
  };

  const getLanguageName = (lang: string) => {
    const names: Record<string, string> = {
      pt: "Português",
      en: "English",
      es: "Español",
    };
    return names[lang] || lang;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats?.total || 0}</div>
            <div className="text-sm text-gray-600 mt-2">Total de Projetos</div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {filteredProjects.length}
            </div>
            <div className="text-sm text-gray-600 mt-2">Projetos Encontrados</div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {new Set(filteredProjects.map((p: BrailleProject) => p.userId)).size}
            </div>
            <div className="text-sm text-gray-600 mt-2">Usuários Ativos</div>
          </div>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por título ou idioma..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Tabela de Projetos */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead>Caracteres Braille</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando projetos...
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((proj: BrailleProject) => (
                  <TableRow key={proj.id}>
                    <TableCell className="font-medium">{proj.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getLanguageName(proj.language)}</Badge>
                    </TableCell>
                    <TableCell>{proj.contentBraille?.length || 0}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(proj.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProject(proj);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Menu de exportação */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Exportar como BRF"
                            onClick={() => handleExport(proj.id, "brf")}
                            disabled={exportMutation.isPending}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            title="Exportar como TXT"
                            onClick={() => handleExport(proj.id, "txt")}
                            disabled={exportMutation.isPending}
                          >
                            <Code className="w-4 h-4" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(proj.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProject?.title}</DialogTitle>
            <DialogDescription>
              Idioma: {getLanguageName(selectedProject?.language || "pt")} • Criado em{" "}
              {selectedProject && formatDate(selectedProject.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Conteúdo Braille</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
                  {selectedProject.contentBraille || "(vazio)"}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Conteúdo em Tinta</h3>
                <div className="bg-gray-100 p-3 rounded text-sm max-h-32 overflow-y-auto">
                  {selectedProject.contentText || "(vazio)"}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleExport(selectedProject.id, "brf")}
                  disabled={exportMutation.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar BRF
                </Button>

                <Button
                  onClick={() => handleExport(selectedProject.id, "txt")}
                  disabled={exportMutation.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar TXT
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
