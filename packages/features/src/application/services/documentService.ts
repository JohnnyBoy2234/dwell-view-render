import { supabase } from '@mzanzihomes/supabase/client';
import { DOCUMENT_TYPES, MAX_DOCUMENT_SIZE } from '@mzanzihomes/common/constants/applicationConstants';
import type { DocRef } from '../types';

const BUCKET_BY_TYPE: Record<string, string> = {
  [DOCUMENT_TYPES.ID_DOCUMENT]: 'id-documents',
  [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: 'id-documents',
  [DOCUMENT_TYPES.EXPERIAN_CREDIT_REPORT]: 'income-documents',
  [DOCUMENT_TYPES.INCOME]: 'income-documents',
  [DOCUMENT_TYPES.PET_PHOTO]: 'income-documents'
};

const ACCEPTED_MIME: Record<string, string[]> = {
  [DOCUMENT_TYPES.ID_DOCUMENT]: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  [DOCUMENT_TYPES.EXPERIAN_CREDIT_REPORT]: ['application/pdf', 'image/jpeg', 'image/png'],
  [DOCUMENT_TYPES.INCOME]: [
    'application/pdf', 'image/jpeg', 'image/png',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  [DOCUMENT_TYPES.PET_PHOTO]: ['image/jpeg', 'image/png', 'image/webp']
};

/** Returns a user-readable problem with the file, or null if acceptable. */
export function fileProblem(file: File, documentType: string): string | null {
  if (file.size > MAX_DOCUMENT_SIZE) {
    return `File is larger than ${Math.round(MAX_DOCUMENT_SIZE / 1024 / 1024)} MB. Please compress it and try again.`;
  }
  const accepted = ACCEPTED_MIME[documentType] ?? [];
  if (!accepted.includes(file.type)) {
    return 'Unsupported file type. Please upload a PDF or an image.';
  }
  return null;
}

/**
 * Uploads to the private bucket for the document type and records it in the
 * documents table. Returns a DocRef holding the storage path — never a public
 * URL; viewing goes through signed URLs.
 */
export async function uploadApplicationDocument(
  file: File,
  documentType: string,
  userId: string
): Promise<DocRef> {
  const problem = fileProblem(file, documentType);
  if (problem) throw new Error(problem);

  const bucket = BUCKET_BY_TYPE[documentType] ?? 'income-documents';
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${userId}/${documentType}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;

  const { error: recordError } = await (supabase.from('documents') as any).insert({
    user_id: userId,
    document_type: documentType,
    file_path: path,
    file_type: file.type
  });
  if (recordError) {
    await supabase.storage.from(bucket).remove([path]);
    throw recordError;
  }

  return {
    name: file.name,
    path,
    bucket,
    type: documentType,
    uploaded_at: new Date().toISOString()
  };
}

export async function removeApplicationDocument(doc: DocRef): Promise<void> {
  const { error } = await supabase.storage.from(doc.bucket).remove([doc.path]);
  if (error) throw error;
  await (supabase.from('documents') as any).delete().eq('file_path', doc.path);
}

/** Short-lived signed URL for previewing a private document. */
export async function getDocumentUrl(doc: DocRef): Promise<string> {
  const { data, error } = await supabase.storage
    .from(doc.bucket)
    .createSignedUrl(doc.path, 60 * 10);
  if (error || !data?.signedUrl) throw error ?? new Error('Could not create document link');
  return data.signedUrl;
}
