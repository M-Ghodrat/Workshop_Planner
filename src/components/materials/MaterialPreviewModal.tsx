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
} from 'lucide-react';
import mammoth from 'mammoth';
import { Material } from '../../types';
import { fileStorage } from '../../utils/fileStorage';

interface MaterialPreviewModalProps {
  material: Material | null;
  onClose: () => void;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  material,
  onClose,
}) => {
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [csvSearch, setCsvSearch] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'preview' | 'source' | 'office'>('preview');

  useEffect(() => {
    if (!material) return;

    let isMounted = true;
    setIsLoading(true);
    setDocxHtml(null);
    setTextContent(null);
    setCsvRows(null);
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
        } else if (url && !url.startsWith('blob:')) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              blob = await resp.blob();
            }
          } catch (fetchErr) {
            console.warn('Direct fetch error, using url string:', fetchErr);
          }
        }

        if (!isMounted) return;
        setActiveUrl(url);

        const fileName = (material.fileName || '').toLowerCase();
        const fileType = (material.fileType || '').toLowerCase();

        // 2. Parse DOCX Word Documents
        if (fileName.endsWith('.docx') && blob) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value || '<p class="text-slate-500 italic">Document has no readable text content.</p>');
            }
          } catch (docxErr) {
            console.warn('Mammoth docx parsing fallback:', docxErr);
          }
        }

        // 3. Parse CSV Spreadsheets
        else if (fileName.endsWith('.csv') || fileType.includes('csv')) {
          try {
            let text = '';
            if (blob) {
              text = await blob.text();
            } else if (url.startsWith('data:')) {
              text = atob(url.split(',')[1] || '');
            } else if (url) {
              const r = await fetch(url);
              text = await r.text();
            }

            if (text && isMounted) {
              const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
              const rows = lines.map((line) => {
                // Simple CSV splitter handling quoted commas
                const row: string[] = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < line.length; i++) {
                  const char = line[i];
                  if (char === '"') {
                    inQuotes = !inQuotes;
                  } else if (char === ',' && !inQuotes) {
                    row.push(current.trim());
                    current = '';
                  } else {
                    current += char;
                  }
                }
                row.push(current.trim());
                return row;
              });
              setCsvRows(rows);
              setTextContent(text);
            }
          } catch (csvErr) {
            console.warn('CSV parsing error:', csvErr);
          }
        }

        // 4. Parse Text / Code / Markdown / JSON / HTML / XML
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
  const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = fileType.includes('video') || /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(fileName);
  const isAudio = fileType.includes('audio') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
  const isOfficeRemote =
    (fileName.endsWith('.pptx') ||
      fileName.endsWith('.ppt') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')) &&
    activeUrl &&
    activeUrl.startsWith('http');

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

  const filteredCsvRows = React.useMemo(() => {
    if (!csvRows || csvRows.length === 0) return [];
    if (!csvSearch) return csvRows;
    const s = csvSearch.toLowerCase();
    const header = csvRows[0];
    const dataRows = csvRows.slice(1).filter((r) => r.some((c) => c.toLowerCase().includes(s)));
    return [header, ...dataRows];
  }, [csvRows, csvSearch]);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:px-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800">
                {material.category}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                {formatFileSize(material.fileSize)}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1">
              {material.title}
            </h3>
            <p className="text-[11px] text-slate-300 font-mono truncate">{material.fileName}</p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {textContent && (
              <button
                type="button"
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
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

            {activeUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </button>
            )}

            <a
              href={activeUrl || material.downloadUrl}
              download={material.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Preview Body */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-auto flex flex-col justify-center relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center m-auto">
              <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                Loading & rendering document preview...
              </p>
            </div>
          ) : docxHtml ? (
            /* DOCX Rich Word Document Preview */
            <div className="w-full h-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold px-5 shrink-0">
                <span className="flex items-center gap-2 text-sky-700 font-bold">
                  <BookOpen className="w-4 h-4" /> Word Document View (.docx)
                </span>
                <span className="text-[11px] text-slate-400">Rendered via UCW Document Reader</span>
              </div>
              <div
                className="flex-1 p-6 sm:p-10 overflow-y-auto prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-table:border prose-table:border-slate-300 custom-scrollbar"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : csvRows && csvRows.length > 0 ? (
            /* CSV Interactive Table Preview */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>
                    Dataset Table View ({csvRows.length - 1} rows, {csvRows[0]?.length || 0}{' '}
                    columns)
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={csvSearch}
                    onChange={(e) => setCsvSearch(e.target.value)}
                    placeholder="Search table rows..."
                    className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 px-3 w-10 text-center text-slate-400 border-r border-slate-200">
                        #
                      </th>
                      {filteredCsvRows[0]?.map((col, idx) => (
                        <th key={idx} className="p-2.5 px-3 border-r border-slate-200 last:border-0 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCsvRows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="p-2 px-3 text-center text-[10px] text-slate-400 border-r border-slate-100 font-mono">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-2 px-3 border-r border-slate-100 last:border-0 text-slate-800 whitespace-nowrap"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : textContent !== null ? (
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
          ) : isPdf ? (
            /* PDF Document Viewer */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <object
                data={`${activeUrl || material.downloadUrl}#toolbar=1`}
                type="application/pdf"
                className="w-full h-full rounded-xl"
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white">
                  <FileText className="w-12 h-12 text-rose-600" />
                  <div>
                    <h4 className="text-base font-bold text-slate-900">PDF Document Ready</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Your browser is displaying this PDF in an interactive window. You can view or
                      download the document directly.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOpenExternal}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in New Window
                    </button>
                    <a
                      href={activeUrl || material.downloadUrl}
                      download={material.fileName}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  </div>
                </div>
              </object>
            </div>
          ) : isVideo ? (
            /* Video Player */
            <div className="max-w-full max-h-full flex flex-col items-center justify-center p-2 m-auto">
              <video
                controls
                autoPlay
                playsInline
                src={activeUrl || material.downloadUrl}
                className="max-h-[72vh] max-w-full rounded-xl shadow-2xl bg-black border border-slate-700"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          ) : isAudio ? (
            /* Audio Player */
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200 space-y-5 m-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{material.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{material.fileName}</p>
              </div>
              <audio controls src={activeUrl || material.downloadUrl} className="w-full mt-2" />
            </div>
          ) : isImage ? (
            /* Image Viewer */
            <div className="max-w-full max-h-full flex items-center justify-center m-auto">
              <img
                src={activeUrl || material.downloadUrl}
                alt={material.title}
                className="max-h-[72vh] rounded-xl object-contain shadow-xl border border-slate-200 bg-white"
              />
            </div>
          ) : isOfficeRemote ? (
            /* Office Documents via Microsoft Online Viewer Embed */
            <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                  activeUrl
                )}`}
                title={material.title}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            /* Fallback Document Card with Rich Details & Direct Open */
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
                <a
                  href={activeUrl || material.downloadUrl}
                  download={material.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002B49] text-white text-xs font-bold shadow-md hover:bg-[#003d66] cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download File ({formatFileSize(material.fileSize)})</span>
                </a>
                {activeUrl && (
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tab</span>
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

