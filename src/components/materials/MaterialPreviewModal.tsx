import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  File,
  Loader2,
  Copy,
  Check,
  Search,
  BookOpen,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';
import mammoth from 'mammoth';
import { Material } from '../../types';
import { fileStorage } from '../../utils/fileStorage';
import { PdfViewer } from './PdfViewer';
import { SpreadsheetViewer } from './SpreadsheetViewer';

interface MaterialPreviewModalProps {
  material: Material | null;
  onClose: () => void;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  material,
  onClose,
}) => {
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'preview' | 'source'>('preview');

  useEffect(() => {
    if (!material) return;

    let isMounted = true;
    setIsLoading(true);
    setDocxHtml(null);
    setTextContent(null);
    setFileBlob(null);
    setActiveViewMode('preview');

    const resolveAndParseDocument = async () => {
      try {
        let blob: Blob | File | null = null;
        let url = material.downloadUrl || '';

        // 1. Check IndexedDB for binary file
        const localBlob = await fileStorage.getFileBlob(material.id);
        if (localBlob) {
          blob = localBlob;
          url = URL.createObjectURL(localBlob);
        }

        // 2. If data URL, convert to Blob for high-performance direct parsing
        if (!blob && url.startsWith('data:')) {
          try {
            const arr = url.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const bstr = atob(arr[1] || '');
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            blob = new Blob([u8arr], { type: mime });
          } catch (dataUrlErr) {
            console.warn('Data URL to blob conversion error:', dataUrlErr);
          }
        }

        // 3. If remote URL, attempt fetch to get blob for offline-capable parsing
        if (!blob && url && !url.startsWith('blob:') && !url.startsWith('data:')) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              blob = await resp.blob();
            }
          } catch (fetchErr) {
            console.warn('Direct fetch error, using url string fallback:', fetchErr);
          }
        }

        if (!isMounted) return;

        if (blob) {
          setFileBlob(blob);
          if (!url || url.startsWith('data:')) {
            url = URL.createObjectURL(blob);
          }
        }

        setActiveUrl(url);

        const fileName = (material.fileName || '').toLowerCase();
        const fileType = (material.fileType || '').toLowerCase();

        // 4. Parse DOCX Word Documents via Mammoth
        if ((fileName.endsWith('.docx') || fileName.endsWith('.doc')) && blob) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(
                result.value ||
                  '<p class="text-slate-500 italic">This Word document contains no readable text content.</p>'
              );
            }
          } catch (docxErr) {
            console.warn('Mammoth docx parsing fallback:', docxErr);
          }
        }

        // 5. Parse Text / Code / Markdown / JSON / HTML / XML / Python / SQL
        else if (
          fileName.endsWith('.txt') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.json') ||
          fileName.endsWith('.js') ||
          fileName.endsWith('.ts') ||
          fileName.endsWith('.py') ||
          fileName.endsWith('.html') ||
          fileName.endsWith('.xml') ||
          fileName.endsWith('.sql') ||
          fileType.includes('text') ||
          fileType.includes('json')
        ) {
          try {
            let text = '';
            if (blob) {
              text = await blob.text();
            } else if (url.startsWith('data:')) {
              text = decodeURIComponent(escape(atob(url.split(',')[1] || '')));
            } else if (url) {
              const r = await fetch(url);
              text = await r.text();
            }
            if (isMounted) {
              setTextContent(text);
            }
          } catch (textErr) {
            console.warn('Text reading error:', textErr);
          }
        }
      } catch (err) {
        console.warn('Document preview resolution error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    resolveAndParseDocument();

    return () => {
      isMounted = false;
    };
  }, [material]);

  if (!material) return null;

  const fileName = (material.fileName || '').toLowerCase();
  const fileType = (material.fileType || '').toLowerCase();

  const isPdf = fileType.includes('pdf') || fileName.endsWith('.pdf');
  const isSpreadsheet =
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv') ||
    fileType.includes('spreadsheet') ||
    fileType.includes('excel') ||
    fileType.includes('csv');
  const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = fileType.includes('video') || /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(fileName);
  const isAudio = fileType.includes('audio') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
  const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm') || fileType.includes('html');
  const isPresentation =
    fileName.endsWith('.pptx') ||
    fileName.endsWith('.ppt') ||
    fileType.includes('presentation') ||
    fileType.includes('powerpoint');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleCopyContent = () => {
    const textToCopy = textContent || docxHtml?.replace(/<[^>]*>?/gm, '') || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    if (activeUrl) {
      window.open(activeUrl, '_blank');
    }
  };

  const handleDownload = () => {
    const dlUrl = activeUrl || material.downloadUrl;
    if (!dlUrl) return;
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = material.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`bg-white flex flex-col shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'w-full h-full rounded-none'
            : 'max-w-5xl w-full h-[90vh] rounded-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:px-6 bg-[#002B49] text-white flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-950/80 px-2.5 py-0.5 rounded border border-sky-800">
                {material.category}
              </span>
              <span className="text-xs text-sky-200 font-mono hidden sm:inline">
                {formatFileSize(material.fileSize)}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1">
              {material.title}
            </h3>
            <p className="text-[11px] text-sky-300/80 font-mono truncate">{material.fileName}</p>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {textContent && (
              <button
                type="button"
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                title="Copy document text"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Text</span>
                  </>
                )}
              </button>
            )}

            {/* Optional open in browser tab */}
            {activeUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                title="Open in new window (external)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">New Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs cursor-pointer transition-colors"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors hidden sm:flex items-center justify-center"
              title={isMaximized ? 'Restore Window Size' : 'Maximize Window'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Preview Body */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center m-auto">
              <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                Loading & rendering document preview inside window...
              </p>
            </div>
          ) : isPdf ? (
            /* Interactive PDF Viewer inside the Pop-up Window */
            <PdfViewer
              url={activeUrl || material.downloadUrl || ''}
              blob={fileBlob}
              fileName={material.fileName}
              onDownload={handleDownload}
              onOpenExternal={handleOpenExternal}
            />
          ) : isSpreadsheet ? (
            /* Interactive Spreadsheet Table Viewer inside the Pop-up Window */
            <SpreadsheetViewer
              url={activeUrl || material.downloadUrl || ''}
              blob={fileBlob}
              fileName={material.fileName}
              onDownload={handleDownload}
              onOpenExternal={handleOpenExternal}
            />
          ) : docxHtml ? (
            /* DOCX Rich Word Document Preview inside the Pop-up Window */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold px-5 shrink-0">
                <span className="flex items-center gap-2 text-sky-800 font-bold">
                  <BookOpen className="w-4 h-4 text-sky-600" /> Word Document View (.docx)
                </span>
                <span className="text-[11px] text-slate-400">
                  Rendered via UCW Document Reader
                </span>
              </div>
              <div
                className="flex-1 p-6 sm:p-10 overflow-y-auto prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-table:border prose-table:border-slate-300 custom-scrollbar select-text"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : isHtml && textContent !== null ? (
            /* Interactive HTML Document Viewer inside the Pop-up Window */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 px-4 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-[#002B49]">
                  <FileCode className="w-4 h-4 text-sky-600" />
                  <span>HTML Document View ({textContent.length} characters)</span>
                </div>
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('preview')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-all ${
                      activeViewMode === 'preview'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Rendered Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('source')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-all ${
                      activeViewMode === 'source'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Source Code
                  </button>
                </div>
              </div>

              {activeViewMode === 'preview' ? (
                /* Sandboxed Iframe for Beautiful HTML Rendering */
                <div className="flex-1 bg-white relative">
                  <iframe
                    srcDoc={textContent}
                    title="HTML Preview"
                    sandbox="allow-scripts"
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              ) : (
                /* Code Source View */
                <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
                  <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed custom-scrollbar whitespace-pre-wrap select-text">
                    {textContent}
                  </div>
                </div>
              )}
            </div>
          ) : !isHtml && textContent !== null ? (
            /* Plain Text / Code / Markdown / JSON Preview */
            <div className="w-full h-full bg-slate-950 text-slate-100 rounded-xl shadow-md border border-slate-800 flex flex-col overflow-hidden">
              <div className="p-2.5 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
                <span className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <span>{material.fileName}</span>
                </span>
                <span>{textContent.length} characters</span>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed custom-scrollbar whitespace-pre-wrap select-text">
                {textContent}
              </div>
            </div>
          ) : isImage ? (
            /* Image Viewer inside Window */
            <div className="w-full h-full bg-slate-900/10 rounded-xl border border-slate-200 flex items-center justify-center p-4 overflow-auto">
              <img
                src={activeUrl || material.downloadUrl}
                alt={material.title}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-xl border border-slate-200 bg-white"
              />
            </div>
          ) : isVideo ? (
            /* Video Player inside Window */
            <div className="w-full h-full bg-black rounded-xl border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
              <video
                controls
                autoPlay
                playsInline
                src={activeUrl || material.downloadUrl}
                className="max-h-[75vh] max-w-full rounded-xl shadow-2xl"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          ) : isAudio ? (
            /* Audio Player inside Window */
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Music className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{material.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{material.fileName}</p>
                </div>
                <audio controls src={activeUrl || material.downloadUrl} className="w-full mt-2" />
              </div>
            </div>
          ) : isPresentation ? (
            /* Presentation Deck View */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col justify-center items-center p-8 text-center space-y-5 m-auto max-w-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Presentation className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {material.category}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-2">{material.title}</h4>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {material.fileName} • {formatFileSize(material.fileSize)}
                </p>
                {material.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left">
                    {material.description}
                  </p>
                )}
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002B49] text-white text-xs font-bold shadow-md hover:bg-[#003d66] cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download Presentation ({formatFileSize(material.fileSize)})</span>
                </button>
                {activeUrl && (
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Browser</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* General Document Fallback Card */
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center shadow-md border border-slate-200 space-y-5 m-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto border border-sky-100">
                <FileText className="w-8 h-8 text-[#002B49]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {material.category}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-2">{material.title}</h4>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {material.fileName} • {formatFileSize(material.fileSize)}
                </p>
                {material.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left">
                    {material.description}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002B49] text-white text-xs font-bold shadow-md hover:bg-[#003d66] cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download File ({formatFileSize(material.fileSize)})</span>
                </button>
                {activeUrl && (
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Browser</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center shrink-0">
          <span className="truncate">
            Workshop: <strong className="text-slate-700">{material.workshopTitle || 'General Curriculum'}</strong>
          </span>
          <span className="shrink-0 text-[11px]">
            Uploaded by: <strong className="text-slate-700">{material.uploadedByName || 'Faculty'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
