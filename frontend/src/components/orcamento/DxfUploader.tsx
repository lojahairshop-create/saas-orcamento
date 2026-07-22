"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileCheck, FileX, Loader } from "lucide-react";
import { api } from "@/lib/api";
import { DXFResult } from "@/types";

interface DxfUploaderProps {
  onSuccess: (results: DXFResult[]) => void;
}

export const DxfUploader: React.FC<DxfUploaderProps> = ({ onSuccess }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [splitParts, setSplitParts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const dxfFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith(".dxf"));
    if (dxfFiles.length === 0) {
      setError("Apenas arquivos .DXF são aceitos.");
      setFileName(null);
      return;
    }

    setError(null);
    setLoading(true);
    
    if (dxfFiles.length === 1) {
      setFileName(dxfFiles[0].name);
    } else {
      setFileName(`${dxfFiles[0].name} e mais ${dxfFiles.length - 1} arquivos`);
    }

    try {
      const promises = dxfFiles.map(file => api.processarDxf(file, splitParts));
      const results = await Promise.all(promises);
      
      const flatResults: DXFResult[] = [];
      for (const res of results) {
        if (Array.isArray(res)) {
          flatResults.push(...res);
        } else {
          flatResults.push(res);
        }
      }

      onSuccess(flatResults);
      setFileName(null); // Limpa após sucesso para permitir novos uploads
    } catch (err: any) {
      setError(err.message || "Erro ao ler metadados dos arquivos DXF.");
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 bg-gray-50 hover:bg-white/[0.04] p-3 rounded-lg border border-gray-200 w-fit transition-colors select-none">
        <input
          type="checkbox"
          id="splitParts"
          checked={splitParts}
          onChange={(e) => setSplitParts(e.target.checked)}
          className="rounded border-gray-200 bg-white/[0.03] text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
        />
        <label htmlFor="splitParts" className="text-xs font-semibold text-slate-600 cursor-pointer">
          Este arquivo contém múltiplas peças (individualizar automaticamente)
        </label>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`w-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-500/5"
            : "border-gray-200 bg-white hover:bg-gray-50 hover:border-white/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".dxf"
          onChange={handleFileInput}
          disabled={loading}
          multiple
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="h-10 w-10 text-teal-500 animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">
                Analisando Geometria...
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-xs">
                {fileName}
              </span>
            </div>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-3">
            <FileCheck className="h-10 w-10 text-emerald-500" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">
                DXF Importado com Sucesso!
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-xs">
                {fileName}
              </span>
            </div>
            <span className="text-[10px] text-teal-500 hover:underline">
              Clique para substituir o arquivo
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="h-10 w-10 text-slate-500" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">
                Arraste seu desenho DXF aqui
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Ou clique para navegar nos arquivos
              </span>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/20 px-3 py-1 rounded-full border border-red-900/30 mt-2">
                <FileX className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default DxfUploader;