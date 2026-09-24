import React, { useEffect, useRef } from 'react';
import { Layer, Transformer } from 'react-konva';
import { useNestingStore } from '../../store/nestingStore';
import Konva from 'konva';

interface TransformerLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const TransformerLayer: React.FC<TransformerLayerProps> = ({ stageRef }) => {
  const { parts, updatePart } = useNestingStore();
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!stageRef.current || !transformerRef.current) return;

    const selectedParts = parts.filter((p) => p.selected);

    const nodes = stageRef.current.find('.part-group').filter((node) => {
      return selectedParts.some(p => p.id === node.id());
    });

    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [parts, stageRef]);

  const handleTransformEnd = () => {
    if (!transformerRef.current) return;
    const nodes = transformerRef.current.nodes();
    nodes.forEach(node => {
      updatePart(node.id(), {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      });
    });
  };

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        onTransformEnd={handleTransformEnd}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit resize if needed, though mostly parts shouldn't be freely resized, only rotated
          return newBox;
        }}
        resizeEnabled={false} // Disable resize for nesting parts typically
        rotateEnabled={true}
        anchorSize={8}
        borderStroke="#60a5fa"
        anchorStroke="#60a5fa"
        anchorFill="#fff"
      />
    </Layer>
  );
};
