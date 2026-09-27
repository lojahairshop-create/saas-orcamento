import React from "react";
import { Modal } from "@/components/ui/Modal";
import NestingViewerAdapter from "@/components/nesting/NestingViewerAdapter";

interface NestingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nestingJson: any[] | null;
}

export default function NestingPreviewModal({ isOpen, onClose, nestingJson }: NestingPreviewModalProps) {
  if (!isOpen || !nestingJson) return null;


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualização de Arranjo (Preview)" size="full">
      <div className="h-[75vh] w-full flex flex-col bg-slate-50 relative">
        <NestingViewerAdapter nesting={nestingJson} readOnly={true} isPreviewMode={true} />
      </div>
    </Modal>
  );
}
