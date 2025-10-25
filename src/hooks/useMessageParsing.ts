import { useMemo } from 'react';
import { URL_PATTERNS } from '@/constants/messageConstants';

export interface ParsedURL {
  href: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedContent {
  textParts: string[];
  urls: ParsedURL[];
  inviteUrl: string | null;
  hasUrls: boolean;
}

export interface MessageParsingOptions {
  content: string;
}

/**
 * Hook to parse message content and extract URLs
 */
export function useMessageParsing({ content }: MessageParsingOptions): ParsedContent {
  return useMemo(() => {
    // Handle empty or null content
    if (!content) {
      return {
        textParts: [''],
        urls: [],
        inviteUrl: null,
        hasUrls: false,
      };
    }

    // Safely get URL matches
    const urlMatches = content ? Array.from(content.matchAll(URL_PATTERNS.GENERAL)) : [];
    const urls: ParsedURL[] = urlMatches.map(match => ({
      href: match[0],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
    }));

    const inviteUrl = urls.find((url) => url.href.includes(URL_PATTERNS.INVITE))?.href || null;
    
    if (urls.length === 0) {
      return {
        textParts: [content || ''],
        urls: [],
        inviteUrl,
        hasUrls: false,
      };
    }

    // Split content into text parts
    const textParts: string[] = [];
    let lastIndex = 0;
    
    urls.forEach((url) => {
      textParts.push(content.slice(lastIndex, url.startIndex));
      lastIndex = url.endIndex;
    });
    textParts.push(content.slice(lastIndex));

    return {
      textParts,
      urls,
      inviteUrl,
      hasUrls: true,
    };
  }, [content]);
}