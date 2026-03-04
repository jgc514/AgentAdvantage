import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function CsvUploadButton({ collapsed }: { collapsed: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';

    setState('uploading');
    setResult(null);
    setErrorMsg('');

    try {
      const data = await apiService.importCsv(file);
      setResult({ imported: data.imported, skipped: data.skipped });
      setState('success');
      // Refresh all property queries so dashboards reload with the new data
      queryClient.invalidateQueries();
      setTimeout(() => setState('idle'), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Upload failed';
      setErrorMsg(msg);
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }

  const label = collapsed ? '' : (
    state === 'uploading' ? 'Uploading…'
    : state === 'success'   ? `${result?.imported} imported`
    : state === 'error'     ? 'Upload failed'
    : 'Import CSV'
  );

  const icon = (
    state === 'uploading' ? (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    ) : state === 'success' ? (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : state === 'error' ? (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    )
  );

  const colorClass =
    state === 'success' ? 'text-emerald-400 hover:text-emerald-300'
    : state === 'error'   ? 'text-red-400 hover:text-red-300'
    : 'text-slate-400 hover:text-white';

  return (
    <div className={`${collapsed ? 'flex justify-center px-2' : 'px-3'} mb-1`}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => state === 'idle' && inputRef.current?.click()}
        disabled={state === 'uploading'}
        title={collapsed ? 'Import CSV' : errorMsg || undefined}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors
          ${collapsed ? 'justify-center' : ''}
          ${colorClass}
          ${state === 'idle' ? 'hover:bg-slate-800' : ''}
          disabled:cursor-not-allowed`}
      >
        <span className="flex-shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && state === 'success' && result?.skipped ? (
          <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{result.skipped} skipped</span>
        ) : null}
      </button>
      {!collapsed && state === 'error' && errorMsg && (
        <p className="text-xs text-red-400 px-3 pb-1 leading-snug">{errorMsg}</p>
      )}
    </div>
  );
}
