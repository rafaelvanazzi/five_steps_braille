/**
 * ScoreRenderer V2 - Renderizador baseado em VexFlow
 * Suporta múltiplas vozes, acordes e renderização adaptativa por grau.
 * 
 * STATUS: AGUARDANDO IMPLEMENTAÇÃO
 */

import { useEffect, useRef } from 'react';

interface ScoreRendererV2Props {
  elements: any[];
  width?: number;
  height?: number;
}

export default function ScoreRendererV2({ elements, width = 1000, height = 300 }: ScoreRendererV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">ScoreRenderer V2 - Em desenvolvimento</div>';
  }, [elements]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: height }} />;
}
