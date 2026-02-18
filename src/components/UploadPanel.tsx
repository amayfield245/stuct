'use client'

import { useState, useRef } from 'react'

interface Document {
  id: string
  filename: string
  fileType: string
  fileSize: number
  status: string
  createdAt: string
}

interface UploadPanelProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export default function UploadPanel({ projectId, onClose, onSuccess }: UploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [uploadedDocs, setUploadedDocs] = useState<Document[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = (files: File[]) => {
    // Filter for supported file types
    const supportedTypes = ['.txt', '.md', '.csv', '.pdf', '.docx']
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return supportedTypes.includes(ext)
    })

    setSelectedFiles(validFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-[#0033CC]', 'bg-[#E6F0FF]')
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-[#0033CC]', 'bg-[#E6F0FF]')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-[#0033CC]', 'bg-[#E6F0FF]')
    }
    
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(Array.from(e.target.files))
    }
  }

  const startUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress('Preparing upload...')
    setUploadedDocs([])

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      setUploadProgress('Uploading files...')

      const uploadResponse = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const uploadResult = await uploadResponse.json()
      setUploadedDocs(uploadResult.documents)
      setUploadProgress('Files uploaded. Starting extraction...')

      // Extract each document
      for (let i = 0; i < uploadResult.documents.length; i++) {
        const doc = uploadResult.documents[i]
        setUploadProgress(`Extracting ${doc.filename} (${i + 1}/${uploadResult.documents.length})...`)

        try {
          const extractResponse = await fetch(`/api/projects/${projectId}/documents/${doc.id}/extract`, {
            method: 'POST'
          })

          if (extractResponse.ok) {
            // Update document status in our local list
            setUploadedDocs(prev => prev.map(d => 
              d.id === doc.id ? { ...d, status: 'extracted' } : d
            ))
          }
        } catch (error) {
          console.error(`Failed to extract ${doc.filename}:`, error)
          // Continue with other documents even if one fails
        }
      }

      setUploadProgress('Extraction complete!')
      
      // Wait a moment then call success handler
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress('Upload failed. Please try again.')
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFiles([])
    setUploadedDocs([])
    setUploadProgress('')
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-[#CCCCCC] rounded-lg p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-black text-xl font-semibold tracking-wide">
            📄 INGEST DOCUMENTS
          </h2>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-black text-xl"
            disabled={isUploading}
          >
            ✕
          </button>
        </div>

        {!isUploading ? (
          <>
            {/* File Drop Zone */}
            <div className="mb-6">
              <label className="block text-[#666666] text-sm mb-2 font-semibold tracking-wide">
                UPLOAD FILES
              </label>
              <div
                ref={dropZoneRef}
                className="border-2 border-dashed border-[#CCCCCC] rounded-lg p-12 text-center cursor-pointer hover:border-[#0033CC] hover:bg-[#E6F0FF] transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p className="text-[#666666] mb-2">📎 Drag & drop files here</p>
                <p className="text-[#666666] text-sm">
                  or <strong className="text-[#0033CC]">click to browse</strong>
                </p>
                <p className="text-[#999999] text-xs mt-2">
                  Supported: .txt, .md, .csv, .pdf, .docx
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.pdf,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <div className="text-[#666666] text-sm mb-2 font-semibold tracking-wide">
                  SELECTED FILES ({selectedFiles.length})
                </div>
                <div className="bg-[#F5F5F5] rounded border border-[#CCCCCC] p-4 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center py-1 text-sm">
                      <span className="text-black truncate flex-1">{file.name}</span>
                      <span className="text-[#666666] ml-2">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={resetUpload}
                className="px-6 py-2 bg-white border border-[#CCCCCC] text-[#333333] rounded hover:bg-[#F5F5F5] transition-colors"
              >
                Clear
              </button>
              <button
                onClick={startUpload}
                disabled={selectedFiles.length === 0}
                className="px-6 py-2 bg-[#0033CC] text-white rounded font-semibold hover:bg-[#0029A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Ingestion
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Upload Progress */}
            <div className="text-center py-8">
              <div className="text-[#0033CC] text-lg mb-4 font-medium">
                {uploadProgress}
              </div>
              
              {/* Progress indicator */}
              <div className="w-full bg-[#F5F5F5] rounded-full h-2 mb-6 border border-[#CCCCCC]">
                <div 
                  className="bg-[#0033CC] h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: uploadedDocs.length > 0 
                      ? `${(uploadedDocs.filter(d => d.status === 'extracted').length / uploadedDocs.length) * 100}%`
                      : '10%'
                  }}
                />
              </div>

              {/* Document Status */}
              {uploadedDocs.length > 0 && (
                <div className="text-left">
                  <div className="text-[#666666] text-sm mb-3 font-medium">Document Status:</div>
                  {uploadedDocs.map(doc => (
                    <div key={doc.id} className="flex justify-between items-center py-2 text-sm border-b border-[#CCCCCC] last:border-b-0">
                      <span className="text-black truncate flex-1">{doc.filename}</span>
                      <span className={`ml-2 text-xs font-medium ${
                        doc.status === 'extracted' ? 'text-green-600' :
                        doc.status === 'processing' ? 'text-orange-600' :
                        'text-[#666666]'
                      }`}>
                        {doc.status === 'extracted' ? '✓ Extracted' :
                         doc.status === 'processing' ? '⧗ Processing' :
                         '⧗ Uploaded'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}