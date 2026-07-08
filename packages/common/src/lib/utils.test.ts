import { describe, it, expect } from 'vitest';
import { getAttachmentKind, isImageAttachment } from './utils';

describe('getAttachmentKind', () => {
  it('classifies images', () => {
    expect(getAttachmentKind('https://x.supabase.co/storage/v1/object/public/chat-attachments/u1/123.jpg')).toBe('image');
    expect(getAttachmentKind('https://x.co/a/b.PNG?token=abc')).toBe('image');
  });

  it('classifies video', () => {
    expect(getAttachmentKind('https://x.co/a/b.mp4')).toBe('video');
  });

  it('classifies audio', () => {
    expect(getAttachmentKind('https://x.co/a/b.m4a')).toBe('audio');
  });

  it('falls back to file for anything else', () => {
    expect(getAttachmentKind('https://x.co/a/b.pdf')).toBe('file');
    expect(getAttachmentKind('https://x.co/a/no-extension')).toBe('file');
  });
});

describe('isImageAttachment', () => {
  it('agrees with getAttachmentKind', () => {
    expect(isImageAttachment('https://x.co/a/b.jpg')).toBe(true);
    expect(isImageAttachment('https://x.co/a/b.pdf')).toBe(false);
  });
});
