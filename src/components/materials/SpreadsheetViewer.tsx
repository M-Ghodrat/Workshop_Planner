import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  ExternalLink,
  Loader2,
  Table as TableIcon,
  ChevronRight,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SpreadsheetViewerProps {
  url: string;
  blob?: Blob | null;
  fileName?: string;
  onDownload?: () => void;
  onOpenExternal?: () => void;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  url,
  blob,
  fileName = 'spreadsheet.xlsx',
  onDownload,
  onOpenExternal,
}) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetDataMap, setSheetDataMap] = useState<Record<string, string[][]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setSheetNames([]);
    setSheetDataMap({});

    const loadSpreadsheet = async () => {
      try {
        let arrayBuffer: ArrayBuffer;

        if (blob) {
          arrayBuffer = await blob.arrayBuffer();
        } else if (url.startsWith('data:')) {
          const base64 = url.split(',')[1] || '';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else if (url) {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
          arrayBuffer = await resp.arrayBuffer();
        } else {
          throw new Error('No spreadsheet data source available');
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No worksheets found in this workbook');
        }

        const sheets: Record<string, string[][]> = {};
        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (ws) {
            const rawRows = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              defval: '',
              blankrows: false,
            }) as any[][];
            // Format cells to string
            const stringRows = rawRows.map((r) =>
              (Array.isArray(r) ? r : []).map((cell) => (cell !== null && cell !== undefined ? String(cell) : ''))
            );
            sheets[name] = stringRows;
          }
        }

        if (!isCancelled) {
          setSheetNames(workbook.SheetNames);
          setActiveSheet(workbook.SheetNames[0]);
          setSheetDataMap(sheets);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to parse spreadsheet in popup viewer:', err);
        if (!isCancelled) {
          setErrorMessage(err?.message || 'Unable to parse spreadsheet');
          setIsLoading(false);
        }
      }
    };

    loadSpreadsheet();

    return () => {
      isCancelled = true;
    };
  }, [url, blob]);

  const currentRows = useMemo(() => {
    return sheetDataMap[activeSheet] || [];
  }, [sheetDataMap, activeSheet]);

  const filteredRows = useMemo(() => {
    if (!currentRows || currentRows.length === 0) return [];
    if (!searchTerm.trim()) return currentRows;

    const term = searchTerm.toLowerCase();
    const header = currentRows[0];
    const dataRows = currentRows.slice(1).filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(term))
    );
    return [header, ...dataRows];
  }, [currentRows, searchTerm]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-8 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-700">
          Loading and parsing spreadsheet data into table...
        </p>
        <span className="text-[11px] text-slate-400 font-mono">{fileName}</span>
      </div>
    );
  }

  if (errorMessage || currentRows.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white rounded-xl border border-slate-200">
        <FileSpreadsheet className="w-12 h-12 text-emerald-600" />
        <div>
          <h4 className="text-base font-bold text-slate-900">Spreadsheet File Ready</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {errorMessage || 'This spreadsheet does not contain any printable tabular rows.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Spreadsheet
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

  const headerRow = filteredRows[0] || [];
  const dataRows = filteredRows.slice(1);

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
      {/* Top Controls Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>
            {activeSheet} ({dataRows.length} {dataRows.length === 1 ? 'row' : 'rows'},{' '}
            {headerRow.length} {headerRow.length === 1 ? 'column' : 'columns'})
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search spreadsheet cells..."
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
          />
        </div>
      </div>

      {/* Sheet Tabs Bar (if multiple sheets) */}
      {sheetNames.length > 1 && (
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Worksheets:
          </span>
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActiveSheet(name);
                setSearchTerm('');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                activeSheet === name
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Spreadsheet Table Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-300 z-10 shadow-2xs">
            <tr>
              <th className="p-2.5 px-3 w-12 text-center text-slate-400 border-r border-slate-200 bg-slate-100">
                #
              </th>
              {headerRow.map((col, idx) => (
                <th
                  key={idx}
                  className="p-2.5 px-3 border-r border-slate-200 last:border-0 whitespace-nowrap bg-slate-100 font-bold text-slate-800"
                >
                  {col || `Col ${idx + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {dataRows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(headerRow.length + 1, 2)}
                  className="p-8 text-center text-slate-400 text-xs italic font-sans"
                >
                  {searchTerm ? 'No matching rows found for query.' : 'Empty worksheet.'}
                </td>
              </tr>
            ) : (
              dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="p-2 px-3 text-center text-[10px] text-slate-400 border-r border-slate-100 font-mono bg-slate-50/60 select-none">
                    {rIdx + 1}
                  </td>
                  {headerRow.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-2 px-3 border-r border-slate-100 last:border-0 text-slate-800 whitespace-nowrap"
                    >
                      {row[cIdx] || ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status Ribbon */}
      <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
        <span className="font-mono truncate">{fileName}</span>
        <span className="font-semibold text-slate-500">
          Worksheet: {activeSheet} ({dataRows.length} records)
        </span>
      </div>
    </div>
  );
};
