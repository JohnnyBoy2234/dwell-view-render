import { resolveSupabaseEnv } from './env';

interface MessageBody {
  text: string;
  html: string;
}

/**
 * Poll the local test mailbox for `email` and return the Supabase confirmation
 * link (`/auth/v1/verify?...`) from the newest message. Supports Mailpit (current
 * Supabase CLI) and falls back to Inbucket (older CLIs); both listen on :54324.
 */
export async function waitForConfirmationLink(email: string, timeoutMs = 20_000): Promise<string> {
  const { inbucketUrl } = resolveSupabaseEnv();
  const base = inbucketUrl;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const body = (await fetchViaMailpit(base, email)) ?? (await fetchViaInbucket(base, email));
    if (body) {
      const link = extractConfirmationLink(body.html) ?? extractConfirmationLink(body.text);
      if (link) return link;
    }
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 500);
    await promise;
  }

  throw new Error(
    `No confirmation email for ${email} within ${timeoutMs}ms. ` +
      'Ensure Supabase auth SMTP is routed to the bundled mailbox (see supabase/config.toml) and the stack was restarted.',
  );
}

async function fetchViaMailpit(base: string, email: string): Promise<MessageBody | null> {
  const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
  if (!search.ok) return null;
  const id = parseMailpitLatestId(await search.json());
  if (!id) return null;
  const message = await fetch(`${base}/api/v1/message/${encodeURIComponent(id)}`);
  if (!message.ok) return null;
  return parseMailpitBody(await message.json());
}

async function fetchViaInbucket(base: string, email: string): Promise<MessageBody | null> {
  const mailbox = email.split('@')[0];
  const list = await fetch(`${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
  if (!list.ok) return null;
  const ids = parseInbucketIds(await list.json());
  if (ids.length === 0) return null;
  const message = await fetch(`${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${encodeURIComponent(ids[ids.length - 1])}`);
  if (!message.ok) return null;
  return parseInbucketBody(await message.json());
}

function extractConfirmationLink(source: string): string | null {
  if (!source) return null;
  const href = source.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/i);
  const raw = source.match(/(https?:\/\/\S+\/auth\/v1\/verify\S*)/i);
  const found = href?.[1] ?? raw?.[1];
  if (!found) return null;
  return found.replace(/&amp;/g, '&').replace(/["'>]+$/, '');
}

function parseMailpitLatestId(value: unknown): string | null {
  if (value && typeof value === 'object' && 'messages' in value) {
    const { messages } = value;
    if (Array.isArray(messages) && messages.length > 0) {
      const first = messages[0];
      if (first && typeof first === 'object' && 'ID' in first) {
        const { ID } = first;
        if (typeof ID === 'string') return ID;
      }
    }
  }
  return null;
}

function parseMailpitBody(value: unknown): MessageBody {
  if (value && typeof value === 'object') {
    const html = 'HTML' in value && typeof value.HTML === 'string' ? value.HTML : '';
    const text = 'Text' in value && typeof value.Text === 'string' ? value.Text : '';
    return { text, html };
  }
  return { text: '', html: '' };
}

function parseInbucketIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (entry && typeof entry === 'object' && 'id' in entry) {
      const { id } = entry;
      if (typeof id === 'string') ids.push(id);
      else if (typeof id === 'number') ids.push(String(id));
    }
  }
  return ids;
}

function parseInbucketBody(value: unknown): MessageBody {
  if (value && typeof value === 'object' && 'body' in value) {
    const { body } = value;
    if (body && typeof body === 'object') {
      const text = 'text' in body && typeof body.text === 'string' ? body.text : '';
      const html = 'html' in body && typeof body.html === 'string' ? body.html : '';
      return { text, html };
    }
  }
  return { text: '', html: '' };
}
