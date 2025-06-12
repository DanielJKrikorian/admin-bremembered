import React, { useCallback } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onRemoveFile: () => void
  accept?: string
  disabled?: boolean
}

export function FileUpload({ 
  onFileSelect, 
  selectedFile, 
  onRemoveFile, 
  accept = '.csv', 
  disabled = false 
}: FileUploadProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (disabled) return
      
      const files = Array.from(e.dataTransfer.files)
      const csvFile = files.find(file => file.name.endsWith('.csv'))
      
      if (csvFile) {
        onFileSelect(csvFile)
      }
    },
    [onFileSelect, disabled]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  if (selectedFile) {
    return (
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
              <p className="text-xs text-green-700">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onRemoveFile}
            disabled={disabled}
            className="inline-flex items-center p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <div className="mt-4">
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="text-sm font-medium text-gray-900">
            Upload CSV file
          </span>
          <span className="text-sm text-gray-500"> or drag and drop</span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-gray-500 mt-1">CSV files up to 10MB</p>
      </div>
    </div>
  )
}