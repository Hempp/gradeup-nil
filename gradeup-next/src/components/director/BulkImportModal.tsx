'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  parseCSV,
  autoDetectColumnMapping,
  mapAndValidateRows,
  getAllFields,
  getRequiredFields,
  formatFieldName,
  type ColumnMapping,
  type ParsedAthleteRow,
  type CSVParseResult,
  type ValidatedImportResult,
} from '@/lib/utils/csv-parser';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (results: ImportResultSummary) => void;
}

interface ImportResultSummary {
  total: number;
  successful: number;
  failed: number;
}

interface Sport {
  id: string;
  name: string;
  category?: string;
  gender?: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ACCEPTED_FILE_TYPES = '.csv,.txt';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

// ═══════════════════════════════════════════════════════════════════════════
// STEP INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: ImportStep;
  steps: { key: ImportStep; label: string }[];
}) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              index === currentIndex
                ? 'bg-[var(--color-primary)] text-black'
                : index < currentIndex
                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            )}
          >
            {index < currentIndex ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-xs">
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5',
                index < currentIndex
                  ? 'bg-[var(--color-success)]'
                  : 'bg-[var(--border-color)]'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE UPLOAD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function FileUploadStep({
  onFileSelect,
  error,
}: {
  onFileSelect: (file: File) => void;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const downloadTemplate = useCallback(() => {
    const template = `first_name,last_name,email,sport,position,year,gpa,jersey_number,major,hometown
John,Doe,john.doe@example.edu,Basketball,Guard,Junior,3.5,23,Business,Los Angeles CA
Jane,Smith,jane.smith@example.edu,Soccer,Midfielder,Sophomore,3.8,10,Engineering,Seattle WA`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'athlete-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
            : 'border-[var(--border-color)] hover:border-[var(--color-primary)]/50',
          error && 'border-[var(--color-error)]'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
        <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Drop your CSV file here
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          or click to browse
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Supports CSV files up to 5MB (max {MAX_ROWS} rows)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[var(--color-error)]/10 rounded-lg text-[var(--color-error)]">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Template download */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Need a template?
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Download our CSV template with sample data
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Template
        </Button>
      </div>

      {/* Required fields info */}
      <div className="p-4 border border-[var(--border-color)] rounded-lg">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Required Fields
        </h4>
        <div className="flex flex-wrap gap-2">
          {getRequiredFields().map(field => (
            <Badge key={field} variant="primary" size="sm">
              {formatFieldName(field)}
            </Badge>
          ))}
        </div>
        <h4 className="text-sm font-medium text-[var(--text-primary)] mt-4 mb-2">
          Optional Fields
        </h4>
        <div className="flex flex-wrap gap-2">
          {getAllFields()
            .filter(f => !getRequiredFields().includes(f))
            .map(field => (
              <Badge key={field} variant="outline" size="sm">
                {formatFieldName(field)}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN MAPPING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ColumnMappingStep({
  headers,
  mapping,
  onMappingChange,
  sampleData,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (header: string, field: string | null) => void;
  sampleData: string[][];
}) {
  const allFields = getAllFields();
  const requiredFields = getRequiredFields();

  // Check which required fields are mapped
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = requiredFields.filter(f => !mappedFields.has(f));

  return (
    <div className="space-y-6">
      {/* Warning for missing required fields */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-[var(--color-warning)]/10 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--color-warning)]">
              Missing required field mappings
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Please map the following fields:{' '}
              {missingRequired.map(f => formatFieldName(f)).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                CSV Column
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Sample Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Maps To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {headers.map((header, index) => (
              <tr key={header} className="hover:bg-[var(--bg-tertiary)]/50">
                <td className="px-4 py-3">
                  <code className="text-sm bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                    {header}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {sampleData[0]?.[index] || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={mapping[header] || ''}
                    onChange={e =>
                      onMappingChange(header, e.target.value || null)
                    }
                    className={cn(
                      'h-9 px-3 text-sm rounded-[var(--radius-md)] border bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
                      !mapping[header]
                        ? 'border-[var(--border-color)]'
                        : requiredFields.includes(mapping[header]!)
                          ? 'border-[var(--color-primary)]'
                          : 'border-[var(--color-success)]'
                    )}
                  >
                    <option value="">— Skip this column —</option>
                    <optgroup label="Required Fields">
                      {requiredFields.map(field => (
                        <option key={field} value={field}>
                          {formatFieldName(field)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Optional Fields">
                      {allFields
                        .filter(f => !requiredFields.includes(f))
                        .map(field => (
                          <option key={field} value={field}>
                            {formatFieldName(field)}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PreviewStep({
  validationResult,
  onToggleRow,
  selectedRows,
}: {
  validationResult: ValidatedImportResult;
  onToggleRow: (rowIndex: number) => void;
  selectedRows: Set<number>;
}) {
  const [showInvalid, setShowInvalid] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleErrorExpansion = (rowIndex: number) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const displayRows = showInvalid
    ? validationResult.invalidRows
    : validationResult.validRows;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {validationResult.totalRows}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Total Rows</p>
        </div>
        <div
          className={cn(
            'p-4 rounded-lg text-center cursor-pointer transition-colors',
            !showInvalid
              ? 'bg-[var(--color-success)]/20 ring-2 ring-[var(--color-success)]'
              : 'bg-[var(--color-success)]/10 hover:bg-[var(--color-success)]/15'
          )}
          onClick={() => setShowInvalid(false)}
        >
          <p className="text-2xl font-bold text-[var(--color-success)]">
            {validationResult.validCount}
          </p>
          <p className="text-sm text-[var(--color-success)]">Valid</p>
        </div>
        <div
          className={cn(
            'p-4 rounded-lg text-center cursor-pointer transition-colors',
            showInvalid
              ? 'bg-[var(--color-error)]/20 ring-2 ring-[var(--color-error)]'
              : 'bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/15'
          )}
          onClick={() => setShowInvalid(true)}
        >
          <p className="text-2xl font-bold text-[var(--color-error)]">
            {validationResult.invalidCount}
          </p>
          <p className="text-sm text-[var(--color-error)]">Invalid</p>
        </div>
      </div>

      {/* Selection info */}
      {!showInvalid && (
        <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-primary)]">
              {selectedRows.size}
            </span>{' '}
            athletes selected for import
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                validationResult.validRows.forEach(row =>
                  onToggleRow(row.rowIndex)
                );
              }}
            >
              {selectedRows.size === validationResult.validCount
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-[var(--bg-tertiary)] sticky top-0">
            <tr>
              {!showInvalid && (
                <th className="w-12 px-3 py-2 text-center">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                Row
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                Email
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                Sport
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                Year
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                GPA
              </th>
              {showInvalid && (
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Errors
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showInvalid ? 7 : 7}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  {showInvalid
                    ? 'No invalid rows'
                    : 'No valid rows to import'}
                </td>
              </tr>
            ) : (
              displayRows.map(row => (
                <tr
                  key={row.rowIndex}
                  className={cn(
                    'hover:bg-[var(--bg-tertiary)]/50',
                    !showInvalid &&
                      selectedRows.has(row.rowIndex) &&
                      'bg-[var(--color-primary)]/5'
                  )}
                >
                  {!showInvalid && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.rowIndex)}
                        onChange={() => onToggleRow(row.rowIndex)}
                        className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    {row.rowIndex}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
                    {row.data.first_name} {row.data.last_name}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    {row.data.email || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    {row.data.sport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    {row.data.year
                      ? formatFieldName(row.data.year.replace('_', ' '))
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    {row.data.gpa?.toFixed(2) || '—'}
                  </td>
                  {showInvalid && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleErrorExpansion(row.rowIndex)}
                        className="flex items-center gap-1 text-sm text-[var(--color-error)]"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {row.errors.length} error
                        {row.errors.length > 1 ? 's' : ''}
                        {expandedErrors.has(row.rowIndex) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {expandedErrors.has(row.rowIndex) && (
                        <ul className="mt-2 space-y-1">
                          {row.errors.map((error, i) => (
                            <li
                              key={i}
                              className="text-xs text-[var(--color-error)]"
                            >
                              {error}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTING PROGRESS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ImportingStep({
  progress,
  total,
  currentAthlete,
}: {
  progress: number;
  total: number;
  currentAthlete?: string;
}) {
  const percentage = Math.round((progress / total) * 100);

  return (
    <div className="py-8 space-y-6">
      <div className="text-center">
        <RefreshCw className="h-16 w-16 mx-auto text-[var(--color-primary)] animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Importing Athletes
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Please wait while we add your athletes to the system
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Progress</span>
          <span className="font-medium text-[var(--text-primary)]">
            {progress} of {total}
          </span>
        </div>
        <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {currentAthlete && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Currently importing: {currentAthlete}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function CompleteStep({
  results,
  onDownloadReport,
}: {
  results: ImportResultSummary & { failures?: Array<{ name: string; error: string }> };
  onDownloadReport: () => void;
}) {
  const hasFailures = results.failed > 0;

  return (
    <div className="py-8 space-y-6">
      <div className="text-center">
        {hasFailures ? (
          <AlertTriangle className="h-16 w-16 mx-auto text-[var(--color-warning)] mb-4" />
        ) : (
          <CheckCircle className="h-16 w-16 mx-auto text-[var(--color-success)] mb-4" />
        )}
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          {hasFailures ? 'Import Completed with Issues' : 'Import Successful'}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          {results.successful} athlete{results.successful !== 1 ? 's' : ''}{' '}
          imported successfully
          {hasFailures && `, ${results.failed} failed`}
        </p>
      </div>

      {/* Results summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {results.total}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Total</p>
        </div>
        <div className="p-4 bg-[var(--color-success)]/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-[var(--color-success)]">
            {results.successful}
          </p>
          <p className="text-sm text-[var(--color-success)]">Successful</p>
        </div>
        <div className="p-4 bg-[var(--color-error)]/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-[var(--color-error)]">
            {results.failed}
          </p>
          <p className="text-sm text-[var(--color-error)]">Failed</p>
        </div>
      </div>

      {/* Failures list */}
      {hasFailures && results.failures && results.failures.length > 0 && (
        <div className="border border-[var(--color-error)]/30 rounded-lg overflow-hidden">
          <div className="bg-[var(--color-error)]/10 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-error)]">
              Failed Imports
            </span>
            <Button variant="ghost" size="sm" onClick={onDownloadReport}>
              <Download className="h-4 w-4 mr-1" />
              Download Report
            </Button>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-[var(--border-color)]">
                {results.failures.map((failure, index) => (
                  <tr key={index} className="text-sm">
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {failure.name}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-error)]">
                      {failure.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: BulkImportModalProps) {
  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [_file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationResult, setValidationResult] =
    useState<ValidatedImportResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [currentAthlete, setCurrentAthlete] = useState<string>();
  const [importResults, setImportResults] = useState<
    ImportResultSummary & { failures?: Array<{ name: string; error: string }> }
  | null>(null);
  const [_sports, _setSports] = useState<Sport[]>([]);

  // Steps definition
  const steps: { key: ImportStep; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'preview', label: 'Preview' },
    { key: 'importing', label: 'Import' },
    { key: 'complete', label: 'Complete' },
  ];

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileError(undefined);
    setParseResult(null);
    setColumnMapping({});
    setValidationResult(null);
    setSelectedRows(new Set());
    setImportProgress(0);
    setCurrentAthlete(undefined);
    setImportResults(null);
    onClose();
  }, [onClose]);

  // File selection handler
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFileError(undefined);

    // Validate file type
    if (
      !selectedFile.name.endsWith('.csv') &&
      !selectedFile.name.endsWith('.txt')
    ) {
      setFileError('Please upload a CSV file');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);

    // Parse the file
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      const result = parseCSV(content);

      if (!result.success) {
        setFileError(result.error || 'Failed to parse CSV file');
        return;
      }

      if (result.rows.length === 0) {
        setFileError('CSV file contains no data rows');
        return;
      }

      if (result.rows.length > MAX_ROWS) {
        setFileError(`CSV file contains more than ${MAX_ROWS} rows`);
        return;
      }

      setParseResult(result);

      // Auto-detect column mapping
      const autoMapping = autoDetectColumnMapping(result.headers);
      setColumnMapping(autoMapping);

      setStep('mapping');
    };

    reader.onerror = () => {
      setFileError('Failed to read file');
    };

    reader.readAsText(selectedFile);
  }, []);

  // Handle mapping change
  const handleMappingChange = useCallback(
    (header: string, field: string | null) => {
      setColumnMapping(prev => ({
        ...prev,
        [header]: field as keyof ParsedAthleteRow['data'] | null,
      }));
    },
    []
  );

  // Check if mapping is valid (all required fields mapped)
  const isMappingValid = useMemo(() => {
    const requiredFields = getRequiredFields();
    const mappedFields = new Set(Object.values(columnMapping).filter(Boolean));
    return requiredFields.every(f => mappedFields.has(f));
  }, [columnMapping]);

  // Proceed to preview
  const handleProceedToPreview = useCallback(() => {
    if (!parseResult) return;

    const result = mapAndValidateRows(
      parseResult.headers,
      parseResult.rows,
      columnMapping
    );

    setValidationResult(result);

    // Select all valid rows by default
    const validRowIndices = new Set(result.validRows.map(r => r.rowIndex));
    setSelectedRows(validRowIndices);

    setStep('preview');
  }, [parseResult, columnMapping]);

  // Toggle row selection
  const handleToggleRow = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

  // Execute import
  const handleImport = useCallback(async () => {
    if (!validationResult) return;

    const rowsToImport = validationResult.validRows.filter(r =>
      selectedRows.has(r.rowIndex)
    );

    if (rowsToImport.length === 0) {
      return;
    }

    setStep('importing');
    setImportProgress(0);

    const failures: Array<{ name: string; error: string }> = [];
    let successCount = 0;

    try {
      // Prepare the data for API
      const athletes = rowsToImport.map(row => ({
        rowIndex: row.rowIndex,
        data: {
          first_name: row.data.first_name!,
          last_name: row.data.last_name!,
          email: row.data.email!,
          sport: row.data.sport,
          position: row.data.position,
          year: row.data.year,
          gpa: row.data.gpa,
          school_id: row.data.school_id,
          jersey_number: row.data.jersey_number,
          major: row.data.major,
          hometown: row.data.hometown,
          height_inches: row.data.height_inches,
          weight_lbs: row.data.weight_lbs,
        },
      }));

      // Make API call
      const response = await fetch('/api/athletes/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ athletes, skipExisting: false }),
      });

      const result = await response.json();

      if (result.results) {
        // Process results
        for (const res of result.results) {
          setImportProgress(prev => prev + 1);

          const athleteRow = rowsToImport.find(r => r.rowIndex === res.rowIndex);
          const name = athleteRow
            ? `${athleteRow.data.first_name} ${athleteRow.data.last_name}`
            : `Row ${res.rowIndex}`;

          setCurrentAthlete(name);

          if (res.success) {
            successCount++;
          } else {
            failures.push({ name, error: res.error || 'Unknown error' });
          }

          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const finalResults = {
        total: rowsToImport.length,
        successful: successCount,
        failed: failures.length,
        failures,
      };

      setImportResults(finalResults);
      setStep('complete');

      onImportComplete({
        total: finalResults.total,
        successful: finalResults.successful,
        failed: finalResults.failed,
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        total: rowsToImport.length,
        successful: 0,
        failed: rowsToImport.length,
        failures: [{ name: 'All', error: 'Import failed. Please try again.' }],
      });
      setStep('complete');
    }
  }, [validationResult, selectedRows, onImportComplete]);

  // Download failure report
  const handleDownloadReport = useCallback(() => {
    if (!importResults?.failures) return;

    const csv = [
      'Name,Error',
      ...importResults.failures.map(f => `"${f.name}","${f.error}"`),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-failures-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [importResults]);

  // Get sample data for mapping preview
  const sampleData = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.slice(0, 3).map(row => row.values);
  }, [parseResult]);

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return <FileUploadStep onFileSelect={handleFileSelect} error={fileError} />;

      case 'mapping':
        return parseResult ? (
          <ColumnMappingStep
            headers={parseResult.headers}
            mapping={columnMapping}
            onMappingChange={handleMappingChange}
            sampleData={sampleData}
          />
        ) : null;

      case 'preview':
        return validationResult ? (
          <PreviewStep
            validationResult={validationResult}
            onToggleRow={handleToggleRow}
            selectedRows={selectedRows}
          />
        ) : null;

      case 'importing':
        return (
          <ImportingStep
            progress={importProgress}
            total={selectedRows.size}
            currentAthlete={currentAthlete}
          />
        );

      case 'complete':
        return importResults ? (
          <CompleteStep
            results={importResults}
            onDownloadReport={handleDownloadReport}
          />
        ) : null;

      default:
        return null;
    }
  };

  // Render footer
  const renderFooter = () => {
    switch (step) {
      case 'upload':
        return (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        );

      case 'mapping':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleProceedToPreview}
              disabled={!isMappingValid}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        );

      case 'preview':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('mapping')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={selectedRows.size === 0}
            >
              Import {selectedRows.size} Athlete
              {selectedRows.size !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        );

      case 'importing':
        return null;

      case 'complete':
        return (
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'importing' ? () => {} : handleClose}
      title={
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Athletes
        </div>
      }
      size="lg"
      closeOnOverlayClick={step !== 'importing'}
      closeOnEscape={step !== 'importing'}
      showCloseButton={step !== 'importing'}
      footer={renderFooter()}
    >
      <StepIndicator currentStep={step} steps={steps} />
      {renderStepContent()}
    </Modal>
  );
}
