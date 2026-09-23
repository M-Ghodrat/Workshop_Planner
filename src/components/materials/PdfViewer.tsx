import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  Layers,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker URL for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  blob?: Blob | null;
  fileName?: string;
  onDownload?: () => void;
  onOpenExternal?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  blob,
  fileName = 'document.pdf',
  onDownload,
  onOpenExternal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setPageInput('1');

    const loadPdf = async () => {
      try {
        let loadingTask: any;

        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          });
        } else if (url) {
          loadingTask = pdfjsLib.getDocument({
            url,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          });
        } else {
          throw new Error('No PDF source provided');
        }

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to load PDF in popup viewer:', err);
        if (!isCancelled) {
          setErrorMessage(err?.message || 'Unable to decode PDF stream');
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url, blob]);

  // Render current page onto canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;
      setIsRenderingPage(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate viewport with scale & rotation
        const viewport = page.getViewport({ scale, rotation });

        // Handle high DPI screens
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform || undefined,
          viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page rendering warning:', err);
        }
      } finally {
        setIsRenderingPage(false);
      }
    },
    [pdfDoc, scale, rotation]
  );

  useEffect(() => {
    if (pdfDoc && viewMode === 'single') {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, viewMode, renderPage]);

  // Page Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
        setCurrentPage(parsed);
      } else {
        setPageInput(String(currentPage));
      }
    }
  };

  // Zoom Controls
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleFitWidth = () => {
    if (containerRef.current && pdfDoc) {
      pdfDoc.getPage(currentPage).then((page: any) => {
        const viewport = page.getViewport({ scale: 1, rotation });
        const containerWidth = containerRef.current?.clientWidth || 800;
        const targetScale = (containerWidth - 60) / viewport.width;
        setScale(Math.max(0.6, Math.min(targetScale, 2.0)));
      });
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-8 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-700">
          Loading and rendering PDF pages in window...
        </p>
        <span className="text-[11px] text-slate-400 font-mono">{fileName}</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">PDF Direct Rendering Fallback</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {errorMessage}. You can download the file or open it in a browser viewer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          )}
          {onOpenExternal && (
            <button
              type="button"
              onClick={onOpenExternal}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-200/90 rounded-xl shadow-md border border-slate-300 overflow-hidden">
      {/* Top PDF Controls Toolbar */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0">
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-xs font-semibold px-1">
            <span>Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-10 text-center py-0.5 px-1 bg-slate-800 border border-slate-700 rounded text-white text-xs font-mono focus:ring-1 focus:ring-sky-400 outline-none"
            />
            <span className="text-slate-400">of {numPages}</span>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom and Fit */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-slate-300 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 transition-colors cursor-pointer hidden sm:inline-block"
            title="Fit to Width"
          >
            Fit Width
          </button>
        </div>

        {/* Right: Rotate & Indicator */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider bg-sky-950 px-2 py-0.5 rounded border border-sky-800 hidden md:inline">
            Interactive PDF View
          </span>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center relative custom-scrollbar bg-slate-300/60"
      >
        {isRenderingPage && (
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg z-10">
            <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            <span>Rendering page {currentPage}...</span>
          </div>
        )}

        <div className="bg-white shadow-2xl rounded-sm border border-slate-300 transition-transform duration-100 flex items-center justify-center max-w-full">
          <canvas ref={canvasRef} className="block max-w-full" />
        </div>
      </div>

      {/* Bottom Status Ribbon */}
      <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
        <span className="font-mono truncate">{fileName}</span>
        <span className="font-semibold text-slate-500">
          Showing page {currentPage} of {numPages} • Zoom {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
};
