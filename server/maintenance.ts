import { Hono } from 'hono';
import { z } from 'zod';
import type { MaintenanceMessage, TicketUnreadSummary } from '../src/types/maintenance';

const app = new Hono();
const messages: MaintenanceMessage[] = [];

const bodySchema = z.object({
  body: z.string().min(1).max(5000),
  senderUserId: z.string().optional(),
  senderRole: z.enum(['TENANT', 'LANDLORD', 'CONTRACTOR']).optional(),
});

app.get('/api/maintenance/tickets/:id/messages', (c) => {
  const ticketId = c.req.param('id');
  const limit = Number(c.req.query('limit') || '20');
  const cursor = c.req.query('cursor');
  let ticketMessages = messages.filter(m => m.ticketId === ticketId);
  ticketMessages = ticketMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const start = cursor ? ticketMessages.findIndex(m => m.id === cursor) + 1 : 0;
  const slice = ticketMessages.slice(start, start + limit);
  const nextCursor = slice.length + start < ticketMessages.length ? slice[slice.length - 1].id : null;
  return c.json({ messages: slice, cursor: nextCursor });
});

app.post('/api/maintenance/tickets/:id/messages', async (c) => {
  const ticketId = c.req.param('id');
  const form = await c.req.parseBody();
  const result = bodySchema.safeParse(form);
  if (!result.success) {
    return c.json({ error: 'Invalid body' }, 400);
  }

  const { body, senderUserId = 'anonymous', senderRole = 'TENANT' } = result.data;

  const msg: MaintenanceMessage = {
    id: Math.random().toString(36).slice(2),
    ticketId,
    senderUserId,
    senderRole,
    recipientUserId: senderRole === 'LANDLORD' ? 'tenant' : 'landlord',
    body,
    createdAt: new Date().toISOString(),
  };
  messages.push(msg);
  return c.json(msg);
});

app.patch('/api/maintenance/messages/:id/read', (c) => {
  const id = c.req.param('id');
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.readAt = new Date().toISOString();
  }
  return c.json({ success: true });
});

app.get('/api/maintenance/responses/unread', (c) => {
  const summaries: TicketUnreadSummary[] = [];
  return c.json(summaries);
});

app.get('/api/maintenance/unread-counts', (c) => {
  return c.json({});
});

export default app;
