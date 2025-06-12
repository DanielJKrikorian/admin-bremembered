import React from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ImportStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
  totalRows?: number
  processedRows?: number
  successRows?: number
  errorRows?: number
  errors?: string[]
}

interface ImportProgressProps {
  importStatus: ImportStatus
}

export function ImportProgress({ importStatus }: ImportProgressProps) {
  const { status, progress, message, totalRows, processedRows, successRows, errorRows, errors } = importStatus

  if (status === 'idle') return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center">
        {status === 'uploading' || status === 'processing' ? (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2" />
        ) : status === 'success' ? (
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>

      {(status === 'uploading' || status === 'processing') && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {totalRows && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Rows:</span>
            <span className="ml-1 font-medium">{totalRows}</span>
          </div>
          {processedRows !== undefined && (
            <div>
              <span className="text-gray-500">Processed:</span>
              <span className="ml-1 font-medium">{processedRows}</span>
            </div>
          )}
          {successRows !== undefined && (
            <div>
              <span className="text-green-600">Success:</span>
              <span className="ml-1 font-medium text-green-600">{successRows}</span>
            </div>
          )}
          {errorRows !== undefined && errorRows > 0 && (
            <div>
              <span className="text-red-600">Errors:</span>
              <span className="ml-1 font-medium text-red-600">{errorRows}</span>
            </div>
          )}
        </div>
      )}

      {errors && errors.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center text-amber-600 mb-2">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Import Errors:</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 max-h-32 overflow-y-auto">
            <ul className="text-xs space-y-1">
              {errors.slice(0, 10).map((error, index) => (
                <li key={index} className="text-amber-700">• {error}</li>
              ))}
              {errors.length > 10 && (
                <li className="text-amber-600 font-medium">
                  + {errors.length - 10} more errors...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}