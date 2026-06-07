/**
 * Braille Editor V2 - Página principal do novo editor
 * Interface limpa com suporte aos 5 graus de dificuldade.
 * 
 * STATUS: AGUARDANDO IMPLEMENTAÇÃO
 */

import { useState } from 'react';
import SiteLayout from '@/components/SiteLayout';
import ScoreRendererV2 from '@/components/v2/ScoreRendererV2';

export default function BrailleEditorV2() {
  const [brailleContent, setBrailleContent] = useState('');

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Editor de Musicografia Braille V2</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            Em desenvolvimento
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Texto em Braille</h2>
            <textarea
              value={brailleContent}
              onChange={(e) => setBrailleContent(e.target.value)}
              className="w-full h-64 p-3 border rounded-lg font-mono text-2xl"
              placeholder="Digite em Braille musical..."
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Partitura (VexFlow)</h2>
            <ScoreRendererV2 elements={[]} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
