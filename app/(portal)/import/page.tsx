"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  Loader2, Info, Download, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewData {
  preview: Array<Record<string, unknown>>;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: Array<{ row: number; issue: string; data: unknown }>;
}

interface ImportResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{ issue?: string; row?: number; data?: unknown }>;
}

type Step = "upload" | "preview" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Only Excel (.xlsx, .xls) or CSV files are supported");
      return;
    }
    setFile(f);
    setStep("upload");
    setPreview(null);
    setResult(null);
  }

  async function uploadForPreview() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        setPreview(json.data);
        setStep("preview");
      } else {
        toast.error(json.error || "Failed to parse file");
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "confirm");

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        setResult(json.data);
        setStep("result");
        toast.success(`Imported ${json.data.successRows} rows successfully!`);
      } else {
        toast.error(json.error || "Import failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const XLSX = require("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Phone", "Year", "Month", "Subscription", "Savings", "Interest", "Loan Repayment", "Social Fund", "Hosting Fund"],
      ["John Okafor", "08012345678", 2024, 1, 500, 1000, 50, 0, 200, 100],
      ["Jane Smith", "08098765432", 2024, 2, 500, 1000, 50, 500, 200, 100],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Import");
    XLSX.writeFile(wb, "new-era-import-template.xlsx");
    toast.success("Template downloaded");
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Import Data</h1>
        <p className="page-subtitle">Upload historical ledger records from Excel or CSV files</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { key: "upload", label: "Upload File" },
          { key: "preview", label: "Review Data" },
          { key: "result", label: "Import Result" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              step === s.key ? "bg-blue-700 text-white" :
              (["preview", "result"].includes(step) && i < ["upload", "preview", "result"].indexOf(step))
                ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {i < ["upload", "preview", "result"].indexOf(step) ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium", step === s.key ? "text-blue-700" : "text-slate-400")}>
              {s.label}
            </span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Template Download */}
          <div className="card p-4 flex items-start gap-4 border-blue-200 bg-blue-50">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-800">Expected File Format</p>
              <p className="text-blue-600 text-sm mt-1">
                Your Excel/CSV must have columns: <span className="font-mono">Name, Phone, Year, Month</span> and optionally:
                Subscription, Savings, Interest, Loan Repayment, Social Fund, Hosting Fund.
              </p>
              <button onClick={downloadTemplate} className="btn-secondary btn-sm mt-3">
                <Download className="w-4 h-4" /> Download Template
              </button>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors",
              dragging ? "border-blue-500 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div>
                <FileSpreadsheet className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-700 font-semibold text-lg">{file.name}</p>
                <p className="text-green-600 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold text-lg">Drop your file here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse — Excel (.xlsx) or CSV</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex gap-3">
              <button onClick={reset} className="btn-secondary">Cancel</button>
              <button onClick={uploadForPreview} disabled={loading} className="btn-primary flex-1">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing file...</> : "Preview Import →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card border-blue-200">
              <div className="stat-value text-blue-700">{preview.totalRows}</div>
              <div className="stat-label">Total Rows</div>
            </div>
            <div className="stat-card border-green-200">
              <div className="stat-value text-green-600">{preview.validRows}</div>
              <div className="stat-label">Valid Rows</div>
            </div>
            <div className="stat-card border-red-200">
              <div className="stat-value text-red-600">{preview.errorRows}</div>
              <div className="stat-label">Error Rows</div>
            </div>
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div className="card p-5 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-700">Rows with Errors (will be skipped)</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {preview.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg p-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-700 font-medium">Row {err.row}:</span>{" "}
                      <span className="text-red-600">{err.issue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div>
            <h3 className="section-title mb-3">Preview (first 20 valid rows)</h3>
            <div className="table-container">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Year</th>
                    <th>Month</th>
                    <th>Savings</th>
                    <th>Subscription</th>
                    <th>Loan Repay.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i}>
                      <td className="font-medium">{String(row.fullName || "—")}</td>
                      <td className="font-mono">{String(row.phone || "—")}</td>
                      <td>{String(row.year || "—")}</td>
                      <td>{String(row.month || "—")}</td>
                      <td>{String(row.savings || "0")}</td>
                      <td>{String(row.subscription || "0")}</td>
                      <td>{String(row.loanRepayment || "0")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.validRows > 20 && (
              <p className="text-slate-400 text-sm mt-2 text-center">
                Showing 20 of {preview.validRows} valid rows
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <p className="font-semibold mb-1">⚠ Before you confirm:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-600">
              <li>New members will be created with the default password</li>
              <li>Existing member records will be updated</li>
              <li>This import runs inside a database transaction — all or nothing</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary">← Start Over</button>
            {preview.validRows > 0 && (
              <button onClick={confirmImport} disabled={loading} className="btn-primary flex-1">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing {preview.validRows} rows...</>
                  : `Confirm Import (${preview.validRows} rows)`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">Import Complete</h2>
            <p className="text-slate-500 mt-2">Your data has been imported into the system.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card border-blue-200">
              <div className="stat-value text-blue-700">{result.totalRows}</div>
              <div className="stat-label">Total Rows</div>
            </div>
            <div className="stat-card border-green-200">
              <div className="stat-value text-green-600">{result.successRows}</div>
              <div className="stat-label">Imported</div>
            </div>
            <div className="stat-card border-red-200">
              <div className="stat-value text-red-600">{result.failedRows}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="card p-5 border-red-200">
              <h3 className="font-semibold text-red-700 mb-3">Failed Rows</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                    {err.issue || "Unknown error"}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset} className="btn-primary w-full">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
