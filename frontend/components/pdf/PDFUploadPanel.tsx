'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { uploadPDF, deletePDF, listPDFs } from '@/lib/sse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { PDFMetadata } from '@/types';

interface PDFUploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PDFUploadPanel({ isOpen, onClose }: PDFUploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch PDF list
  const { data: pdfs = [], isLoading } = useQuery<PDFMetadata[]>({
    queryKey: ['pdfs'],
    queryFn: listPDFs,
    refetchOnWindowFocus: false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadPDF,
    onSuccess: (data) => {
      setUploadProgress(`Uploaded: ${data.filename}`);
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
      setTimeout(() => setUploadProgress(null), 3000);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadProgress(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deletePDF,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
    },
  });

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are allowed');
      return;
    }

    setUploadError(null);
    setUploadProgress(`Uploading ${file.name}...`);
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Manage Documents
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload and manage your PDF documents
          </p>
        </DialogHeader>

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                Drag and drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>
          </div>
        </div>

        {/* Upload Status */}
        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
            {uploadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Check className="w-4 h-4 text-primary" />
            )}
            <span className="text-foreground">{uploadProgress}</span>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-destructive flex-1">{uploadError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadError(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Document List */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Uploaded Documents ({pdfs.length})
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No documents uploaded yet.</p>
              <p className="text-sm mt-1">Upload a PDF to get started.</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {pdfs.map((pdf) => (
                  <div
                    key={pdf.filename}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {pdf.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pdf.page_count} pages · {formatFileSize(pdf.size_bytes)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${pdf.filename}"?`)) {
                          deleteMutation.mutate(pdf.filename);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
