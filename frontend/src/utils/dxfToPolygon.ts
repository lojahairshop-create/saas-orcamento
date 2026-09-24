import DxfParser from 'dxf-parser';
import { Polygon } from '../types/nesting';

/**
 * Converte o texto de um arquivo DXF para um array de Polygons.
 * Essa função extrai as linhas (LINE, LWPOLYLINE, etc) e as converte
 * em uma sequência de pontos flat [x1, y1, x2, y2] para o Konva.Line.
 */
export function parseDxfToPolygons(dxfString: string): Polygon[] {
  const parser = new DxfParser();
  try {
    const dxf = parser.parseSync(dxfString);
    if (!dxf || !dxf.entities) return [];

    const polygons: Polygon[] = [];
    
    // Simplificação para o esqueleto arquitetural.
    // O ideal para True Shape é conectar LINEs, ARCs soltos num contorno único.
    
    dxf.entities.forEach((entity: any, index: number) => {
      let points: number[] = [];
      
      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const vertices = entity.vertices;
        if (vertices) {
          vertices.forEach((v: any) => {
            points.push(v.x, v.y);
          });
        }
      } else if (entity.type === 'LINE') {
        points.push(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[1].x, entity.vertices[1].y);
      }
      
      if (points.length > 0) {
        polygons.push({
          id: `poly-${index}`,
          points,
          closed: true, // Forçando fechar conforme diretriz obrigatória
        });
      }
    });

    return polygons;
  } catch (error) {
    console.error("Erro ao fazer parse do DXF:", error);
    return [];
  }
}
