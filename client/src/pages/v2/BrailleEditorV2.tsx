import { useState, useEffect, useRef } from "react";
import SiteLayout from "@/components/SiteLayout";
import { parseBrailleMusic } from "@/lib/v2/brailleParserV2";
import type { ParseResult } from "@/lib/v2/brailleModelV2";
import { getGradeDescription } from "@/lib/v2/brailleModelV2";
import ScoreRendererV2 from "@/components/v2/ScoreRendererV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BrailleEditorV2() {
  const [brailleContent, setBrailleContent] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Analisa o texto automaticamente sempre que ele muda
  useEffect(() => {
    if (brailleContent.trim()) {
      const result = parseBrailleMusic(brailleContent);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [brailleContent]);

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Editor de Musicografia Braille V2</h1>
          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
            Versão Experimental (Foco nos Graus 1, 2 e 3)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Painel 1: Entrada de Texto Braille */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Texto em Braille
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                ref={textareaRef}
                value={brailleContent}
                onChange={(e) => setBrailleContent(e.target.value)}
                className="w-full h-64 p-4 border rounded-lg bg-card text-card-foreground font-mono text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Digite em Braille musical aqui... (ex: ⠼⠙⠲ ⠐⠹⠱⠫⠻)"
                spellCheck={false}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{brailleContent.length} caracteres</span>
                <Button size="sm" variant="outline" onClick={() => textareaRef.current?.focus()}>
                  Focar no Editor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Painel 2: Visualização e Diagnóstico */}
          <div className="space-y-6">
            
            {/* Renderizador VexFlow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Partitura (VexFlow)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] border rounded-lg bg-white p-2 overflow-x-auto">
                  {parseResult && parseResult.measures.length > 0 && parseResult.measures[0].elements.length > 0 ? (
                    <ScoreRendererV2 
                      elements={parseResult.measures[0].elements} 
                      width={600} 
                      height={200} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                      <p>Digite notas em Braille para ver a partitura aqui.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Painel de Diagnóstico Didático (Metadados) */}
            {parseResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Diagnóstico do Parser</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Grau de Dificuldade:</span>
                    <span className="font-bold text-primary">
                      Grau {parseResult.maxGrade} - {getGradeDescription(parseResult.maxGrade)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted p-2 rounded">
                      <div className="text-lg font-bold">{parseResult.stats.noteCount}</div>
                      <div className="text-xs text-muted-foreground">Notas</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="text-lg font-bold">{parseResult.stats.restCount}</div>
                      <div className="text-xs text-muted-foreground">Pausas</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="text-lg font-bold">{parseResult.stats.measureCount}</div>
                      <div className="text-xs text-muted-foreground">Compassos</div>
                    </div>
                  </div>

                  {parseResult.errors.length > 0 && (
                    <div className="bg-red-50 text-red-700 p-3 rounded text-xs border border-red-200">
                      <strong>⚠️ Erros encontrados:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {parseResult.errors.map((err, i) => (
                          <li key={i}>{err.message} (posição {err.sourceIndex})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
