import { Hono } from 'hono';
import { authMiddleware, type AuthUser } from './supabase-auth';
import { db } from './db';

type Bindings = { SUPABASE_JWT_SECRET: string };

const app = new Hono<{ Bindings: Bindings }>();

// GET /api/notifications — lista las últimas 30 del usuario autenticado
app.get('/api/notifications', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user') as AuthUser;
    const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100);

    const { data: profile } = await db
      .from('users').select('id').eq('mocha_user_id', authUser.id).single();
    if (!profile) return c.json({ error: 'User not found' }, 404);

    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return c.json(data || []);
  } catch (err) {
    console.error('[notifications] GET error:', err);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// PATCH /api/notifications/:id/read — marcar una como leída
app.patch('/api/notifications/:id/read', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user') as AuthUser;
    const id = parseInt(c.req.param('id'));

    const { data: profile } = await db
      .from('users').select('id').eq('mocha_user_id', authUser.id).single();
    if (!profile) return c.json({ error: 'User not found' }, 404);

    const { error } = await db
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.error('[notifications] PATCH read error:', err);
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

// PATCH /api/notifications/read-all — marcar todas como leídas
app.patch('/api/notifications/read-all', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user') as AuthUser;

    const { data: profile } = await db
      .from('users').select('id').eq('mocha_user_id', authUser.id).single();
    if (!profile) return c.json({ error: 'User not found' }, 404);

    const now = new Date().toISOString();
    const { error } = await db
      .from('notifications')
      .update({ is_read: true, read_at: now, updated_at: now })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.error('[notifications] PATCH read-all error:', err);
    return c.json({ error: 'Failed to mark all as read' }, 500);
  }
});

// DELETE /api/notifications/:id — borrar una notificación
app.delete('/api/notifications/:id', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user') as AuthUser;
    const id = parseInt(c.req.param('id'));

    const { data: profile } = await db
      .from('users').select('id').eq('mocha_user_id', authUser.id).single();
    if (!profile) return c.json({ error: 'User not found' }, 404);

    const { error } = await db
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.error('[notifications] DELETE error:', err);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

export default app;
