import { Hono } from "hono";
import { authMiddleware, type AuthUser as MochaUser } from "./supabase-auth";
import { createWhatsAppService } from "../shared/whatsapp";
import { hasPermission, PERMISSIONS } from "./permissions";
import { db } from "./db";

type Bindings = {
  SUPABASE_JWT_SECRET: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Check WhatsApp configuration status (HR only)
app.get("/api/whatsapp/config-status", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users').select('role').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    return c.json({
      connected: false,
      hasAccessToken: !!c.env.WHATSAPP_ACCESS_TOKEN,
      hasPhoneNumberId: !!c.env.WHATSAPP_PHONE_NUMBER_ID,
      hasBusinessAccountId: !!c.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      hasVerifyToken: !!c.env.WHATSAPP_VERIFY_TOKEN,
    });
  } catch (error) {
    console.error('Error checking config status:', error);
    return c.json({ error: 'Failed to check configuration' }, 500);
  }
});

// Test WhatsApp connection (HR only)
app.get("/api/whatsapp/test-connection", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users').select('role').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!c.env.WHATSAPP_ACCESS_TOKEN) {
      return c.json({ connected: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado', advice: 'Necesitas proporcionar el Access Token de WhatsApp Business API.' });
    }
    if (!c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({ connected: false, error: 'WHATSAPP_PHONE_NUMBER_ID no configurado', advice: 'Necesitas proporcionar el Phone Number ID de tu número de WhatsApp Business.' });
    }
    if (!c.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return c.json({ connected: false, error: 'WHATSAPP_BUSINESS_ACCOUNT_ID no configurado', advice: 'Necesitas proporcionar el Business Account ID.' });
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${c.env.WHATSAPP_PHONE_NUMBER_ID}`,
        { headers: { 'Authorization': `Bearer ${c.env.WHATSAPP_ACCESS_TOKEN}` } }
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        return c.json({ connected: false, error: errorData.error?.message || 'Error al conectar con WhatsApp API', advice: 'Verifica que el Access Token sea válido.' });
      }

      return c.json({ connected: true, advice: 'La conexión con WhatsApp Business API está funcionando correctamente.' });
    } catch (testError) {
      return c.json({ connected: false, error: testError instanceof Error ? testError.message : 'Error desconocido', advice: 'No se pudo conectar con la API de WhatsApp.' });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return c.json({ error: 'Failed to test connection' }, 500);
  }
});

// Update user WhatsApp preferences
app.post("/api/whatsapp/preferences", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const { whatsapp_phone, whatsapp_opt_in } = await c.req.json();

    const { data: userProfile } = await db
      .from('users').select('id').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile) return c.json({ error: 'User profile not found' }, 404);

    if (whatsapp_phone && !/^\+?[1-9]\d{1,14}$/.test(whatsapp_phone.replace(/[\s-]/g, ''))) {
      return c.json({ error: 'Número de teléfono inválido. Use formato internacional (ej: +584121234567)' }, 400);
    }

    const now = new Date().toISOString();
    const updateData: any = {
      whatsapp_phone: whatsapp_phone || null,
      whatsapp_opt_in: whatsapp_opt_in,
      updated_at: now,
    };
    if (whatsapp_opt_in) {
      updateData.whatsapp_opt_in_date = now;
    }

    const { error: updateErr } = await db.from('users').update(updateData).eq('id', userProfile.id);
    if (updateErr) throw updateErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating WhatsApp preferences:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

// Get user WhatsApp preferences
app.get("/api/whatsapp/preferences", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users')
      .select('whatsapp_phone, whatsapp_opt_in, whatsapp_opt_in_date')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) return c.json({ error: 'User profile not found' }, 404);

    return c.json({
      whatsapp_phone: userProfile.whatsapp_phone,
      whatsapp_opt_in: !!userProfile.whatsapp_opt_in,
      whatsapp_opt_in_date: userProfile.whatsapp_opt_in_date,
    });
  } catch (error) {
    console.error('Error getting WhatsApp preferences:', error);
    return c.json({ error: 'Failed to get preferences' }, 500);
  }
});

// Send WhatsApp notification (HR only)
app.post("/api/whatsapp/send", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users').select('id, role, hr_permissions').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile || userProfile.role !== 'HR' || !hasPermission(userProfile, PERMISSIONS.CHAT_SEND_BROADCAST)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { user_id, template_name, message_type, params } = await c.req.json();

    if (!c.env.WHATSAPP_ACCESS_TOKEN || !c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({ error: 'WhatsApp no está configurado. Contacte al administrador.' }, 503);
    }

    const { data: recipient } = await db
      .from('users')
      .select('whatsapp_phone, whatsapp_opt_in, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (!recipient) return c.json({ error: 'Usuario no encontrado' }, 404);
    if (!recipient.whatsapp_opt_in) return c.json({ error: 'El usuario no ha autorizado notificaciones por WhatsApp' }, 400);
    if (!recipient.whatsapp_phone) return c.json({ error: 'El usuario no tiene número de WhatsApp configurado' }, 400);

    const whatsappService = createWhatsAppService({
      accessToken: c.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: c.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    });

    const result = await whatsappService.sendTemplateMessage(
      String(recipient.whatsapp_phone),
      template_name,
      'es',
      params || []
    );

    await db.from('whatsapp_notifications').insert({
      user_id,
      message_type,
      template_name,
      message_content: JSON.stringify(params),
      whatsapp_message_id: result.messageId || null,
      status: result.success ? 'SENT' : 'FAILED',
      error_message: result.error || null,
      sent_at: new Date().toISOString(),
    });

    if (!result.success) return c.json({ error: result.error || 'Error al enviar mensaje' }, 500);

    return c.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Send WhatsApp broadcast (HR only)
app.post("/api/whatsapp/broadcast", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users').select('id, role, hr_permissions').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile || userProfile.role !== 'HR' || !hasPermission(userProfile, PERMISSIONS.CHAT_SEND_BROADCAST)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { target, template_name, message_type, params } = await c.req.json();

    if (!c.env.WHATSAPP_ACCESS_TOKEN || !c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({ error: 'WhatsApp no está configurado' }, 503);
    }

    let query = db
      .from('users')
      .select('id, whatsapp_phone, first_name, last_name')
      .eq('role', 'EMPLOYEE')
      .eq('status', 'ACTIVE')
      .eq('whatsapp_opt_in', true)
      .not('whatsapp_phone', 'is', null);

    if (target !== 'ALL') {
      query = query.eq('department', target) as any;
    }

    const { data: recipients } = await query;

    if (!recipients || recipients.length === 0) {
      return c.json({ error: 'No hay empleados con WhatsApp habilitado para el objetivo seleccionado' }, 400);
    }

    const whatsappService = createWhatsAppService({
      accessToken: c.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: c.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    });

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const personalizedParams = (params || []).map((param: string) =>
          param
            .replace('{{first_name}}', recipient.first_name)
            .replace('{{last_name}}', recipient.last_name)
        );

        const result = await whatsappService.sendTemplateMessage(
          recipient.whatsapp_phone,
          template_name,
          'es',
          personalizedParams
        );

        await db.from('whatsapp_notifications').insert({
          user_id: recipient.id,
          message_type,
          template_name,
          message_content: JSON.stringify(personalizedParams),
          whatsapp_message_id: result.messageId || null,
          status: result.success ? 'SENT' : 'FAILED',
          error_message: result.error || null,
          sent_at: new Date().toISOString(),
        });

        if (result.success) successCount++; else failCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error sending to recipient ${recipient.id}:`, err);
        failCount++;
      }
    }

    return c.json({ success: true, total: recipients.length, sent: successCount, failed: failCount });
  } catch (error) {
    console.error('Error sending WhatsApp broadcast:', error);
    return c.json({ error: 'Failed to send broadcast' }, 500);
  }
});

// WhatsApp webhook verification (GET)
app.get("/api/whatsapp/webhook", async (c) => {
  try {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    if (mode === 'subscribe' && token === c.env.WHATSAPP_VERIFY_TOKEN) {
      return c.text(challenge || '');
    }

    return c.json({ error: 'Verification failed' }, 403);
  } catch (error) {
    console.error('Error verifying webhook:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// WhatsApp webhook handler (POST)
app.post("/api/whatsapp/webhook", async (c) => {
  try {
    const body = await c.req.json();
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      for (const status of statuses) {
        const messageId = status.id;
        const newStatus = status.status;
        let statusValue = 'SENT';
        const updateData: any = { updated_at: new Date().toISOString() };

        if (newStatus === 'delivered') {
          statusValue = 'DELIVERED';
          updateData.delivered_at = new Date().toISOString();
        } else if (newStatus === 'read') {
          statusValue = 'READ';
          updateData.read_at = new Date().toISOString();
        } else if (newStatus === 'failed') {
          statusValue = 'FAILED';
        }
        updateData.status = statusValue;

        await db.from('whatsapp_notifications').update(updateData).eq('whatsapp_message_id', messageId);
      }
    }

    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = body.entry[0].changes[0].value.messages;
      for (const message of messages) {
        const from = message.from;
        const text = message.text?.body;
        const { data: user } = await db.from('users').select('id').eq('whatsapp_phone', from).single();
        if (user && text) {
          console.log(`Incoming WhatsApp message from user ${user.id}: ${text}`);
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// Get WhatsApp notification history (HR only)
app.get("/api/whatsapp/notifications", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile } = await db
      .from('users').select('id, role').eq('mocha_user_id', mochaUser.id).single();

    if (!userProfile) return c.json({ error: 'User profile not found' }, 404);

    if (userProfile.role === 'HR') {
      const { data: notifications } = await db
        .from('whatsapp_notifications')
        .select('*, users!whatsapp_notifications_user_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      return c.json((notifications || []).map((n: any) => ({
        ...n,
        employee_name: n.users ? `${n.users.first_name} ${n.users.last_name}` : null,
        users: undefined,
      })));
    } else {
      const { data: notifications } = await db
        .from('whatsapp_notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      return c.json(notifications || []);
    }
  } catch (error) {
    console.error('Error getting notifications:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

export default app;
