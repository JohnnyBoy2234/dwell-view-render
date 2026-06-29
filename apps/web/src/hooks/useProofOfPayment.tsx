// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

export interface ProofDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  description: string;
  type: 'bank_statement' | 'transfer_receipt' | 'other';
  status: 'uploaded' | 'processing' | 'verified';
  filePath: string;
}

export function useProofOfPayment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ProofDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proof_of_payment')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDocs: ProofDocument[] = data.map(doc => ({
        id: doc.id,
        fileName: doc.file_name,
        fileSize: formatFileSize(doc.file_size),
        uploadDate: doc.created_at,
        description: doc.description || doc.file_name,
        type: doc.document_type as 'bank_statement' | 'transfer_receipt' | 'other',
        status: doc.status as 'uploaded' | 'processing' | 'verified',
        filePath: doc.file_path
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch documents'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, description?: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please log in to upload documents'
      });
      return false;
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload PDF or image files only.'
      });
      return false;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload files smaller than 10MB.'
      });
      return false;
    }

    setUploading(true);
    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('proof-of-payment')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Determine document type based on filename
      const documentType = file.name.toLowerCase().includes('statement') ? 'bank_statement' : 
                          file.name.toLowerCase().includes('receipt') ? 'transfer_receipt' : 'other';

      // Save document record to database
      const { error: dbError } = await supabase
        .from('proof_of_payment')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          description: description || file.name.replace(/\.[^/.]+$/, ''),
          document_type: documentType,
          status: 'uploaded'
        });

      if (dbError) throw dbError;

      toast({
        title: 'Upload successful',
        description: 'Your proof of payment has been uploaded successfully.'
      });

      // Refresh documents list
      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Please try again or contact support if the problem persists.'
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    if (!user) return false;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('proof-of-payment')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('proof_of_payment')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      toast({
        title: 'Document deleted',
        description: 'The document has been removed from your records.'
      });

      // Refresh documents list
      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Failed to delete document. Please try again.'
      });
      return false;
    }
  };

  const downloadDocument = async (documentId: string, filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('proof-of-payment')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `Downloading ${fileName}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Failed to download document. Please try again.'
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refetch: fetchDocuments
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}