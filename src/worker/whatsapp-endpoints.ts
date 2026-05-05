import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";
import type { MochaUser } from "@getmocha/users-service/shared";
import { createWhatsAppService } from "../shared/whatsapp";
import { hasPermission, PERMISSIONS } from "./permissions";

type Bindings = {
  DB: D1Database;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
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

    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

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

    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Check if all required credentials are configured
    if (!c.env.WHATSAPP_ACCESS_TOKEN) {
      return c.json({
        connected: false,
        error: 'WHATSAPP_ACCESS_TOKEN no configurado',
        advice: 'Necesitas proporcionar el Access Token de WhatsApp Business API. Sigue las instrucciones abajo para obtenerlo.'
      });
    }

    if (!c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({
        connected: false,
        error: 'WHATSAPP_PHONE_NUMBER_ID no configurado',
        advice: 'Necesitas proporcionar el Phone Number ID de tu número de WhatsApp Business.'
      });
    }

    if (!c.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return c.json({
        connected: false,
        error: 'WHATSAPP_BUSINESS_ACCOUNT_ID no configurado',
        advice: 'Necesitas proporcionar el Business Account ID de tu cuenta de WhatsApp Business.'
      });
    }

    // Try to make a test API call to verify credentials
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${c.env.WHATSAPP_PHONE_NUMBER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${c.env.WHATSAPP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        return c.json({
          connected: false,
          error: errorData.error?.message || 'Error al conectar con WhatsApp API',
          advice: 'Verifica que el Access Token sea válido y tenga los permisos necesarios.'
        });
      }

      return c.json({
        connected: true,
        advice: 'La conexión con WhatsApp Business API está funcionando correctamente.'
      });
    } catch (testError) {
      console.error('WhatsApp API test error:', testError);
      return c.json({
        connected: false,
        error: testError instanceof Error ? testError.message : 'Error desconocido',
        advice: 'No se pudo conectar con la API de WhatsApp. Verifica tus credenciales.'
      });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return c.json({ error: 'Failed to test connection' }, 500);
  }
});

// Update user WhatsApp preferences (opt-in/opt-out)
app.post("/api/whatsapp/preferences", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const { whatsapp_phone, whatsapp_opt_in } = await c.req.json();

    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Validate phone number format if provided
    if (whatsapp_phone && !/^\+?[1-9]\d{1,14}$/.test(whatsapp_phone.replace(/[\s-]/g, ''))) {
      return c.json({ error: 'Número de teléfono inválido. Use formato internacional (ej: +584121234567)' }, 400);
    }

    // Update preferences
    await c.env.DB.prepare(`
      UPDATE users SET 
        whatsapp_phone = ?,
        whatsapp_opt_in = ?,
        whatsapp_opt_in_date = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE whatsapp_opt_in_date END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      whatsapp_phone || null,
      whatsapp_opt_in ? 1 : 0,
      whatsapp_opt_in ? 1 : 0,
      userProfile.id
    ).run();

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

    const userProfile = await c.env.DB.prepare(
      "SELECT whatsapp_phone, whatsapp_opt_in, whatsapp_opt_in_date FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

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

    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR' || !hasPermission(userProfile as any, PERMISSIONS.CHAT_SEND_BROADCAST)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { user_id, template_name, message_type, params } = await c.req.json();

    // Check if WhatsApp is configured
    if (!c.env.WHATSAPP_ACCESS_TOKEN || !c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({ error: 'WhatsApp no está configurado. Contacte al administrador.' }, 503);
    }

    // Get recipient
    const recipient = await c.env.DB.prepare(
      "SELECT whatsapp_phone, whatsapp_opt_in, first_name, last_name FROM users WHERE id = ?"
    ).bind(user_id).first();

    if (!recipient) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    if (!recipient.whatsapp_opt_in) {
      return c.json({ error: 'El usuario no ha autorizado notificaciones por WhatsApp' }, 400);
    }

    if (!recipient.whatsapp_phone) {
      return c.json({ error: 'El usuario no tiene número de WhatsApp configurado' }, 400);
    }

    // Create WhatsApp service
    const whatsappService = createWhatsAppService({
      accessToken: c.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: c.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    });

    // Send message
    const result = await whatsappService.sendTemplateMessage(
      String(recipient.whatsapp_phone),
      template_name,
      'es',
      params || []
    );

    // Log notification
    await c.env.DB.prepare(`
      INSERT INTO whatsapp_notifications (
        user_id, message_type, template_name, message_content, 
        whatsapp_message_id, status, error_message, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      user_id,
      message_type,
      template_name,
      JSON.stringify(params),
      result.messageId || null,
      result.success ? 'SENT' : 'FAILED',
      result.error || null
    ).run();

    if (!result.success) {
      return c.json({ error: result.error || 'Error al enviar mensaje' }, 500);
    }

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

    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR' || !hasPermission(userProfile as any, PERMISSIONS.CHAT_SEND_BROADCAST)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { target, template_name, message_type, params } = await c.req.json();

    // Check if WhatsApp is configured
    if (!c.env.WHATSAPP_ACCESS_TOKEN || !c.env.WHATSAPP_PHONE_NUMBER_ID) {
      return c.json({ error: 'WhatsApp no está configurado' }, 503);
    }

    // Get target users with WhatsApp opt-in
    let recipients;
    if (target === 'ALL') {
      recipients = await c.env.DB.prepare(`
        SELECT id, whatsapp_phone, first_name, last_name 
        FROM users 
        WHERE role = 'EMPLOYEE' AND status = 'ACTIVE' AND whatsapp_opt_in = 1 AND whatsapp_phone IS NOT NULL
      `).all();
    } else {
      recipients = await c.env.DB.prepare(`
        SELECT id, whatsapp_phone, first_name, last_name 
        FROM users 
        WHERE role = 'EMPLOYEE' AND status = 'ACTIVE' AND whatsapp_opt_in = 1 
          AND whatsapp_phone IS NOT NULL AND department = ?
      `).bind(target).all();
    }

    if (!recipients.results || recipients.results.length === 0) {
      return c.json({ error: 'No hay empleados con WhatsApp habilitado para el objetivo seleccionado' }, 400);
    }

    // Create WhatsApp service
    const whatsappService = createWhatsAppService({
      accessToken: c.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: c.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    });

    let successCount = 0;
    let failCount = 0;

    // Send to each recipient
    for (const recipient of recipients.results) {
      try {
        // Personalize params if they contain placeholders
        const personalizedParams = (params || []).map((param: string) => 
          param
            .replace('{{first_name}}', (recipient as any).first_name)
            .replace('{{last_name}}', (recipient as any).last_name)
        );

        const result = await whatsappService.sendTemplateMessage(
          (recipient as any).whatsapp_phone,
          template_name,
          'es',
          personalizedParams
        );

        // Log notification
        await c.env.DB.prepare(`
          INSERT INTO whatsapp_notifications (
            user_id, message_type, template_name, message_content, 
            whatsapp_message_id, status, error_message, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          (recipient as any).id,
          message_type,
          template_name,
          JSON.stringify(personalizedParams),
          result.messageId || null,
          result.success ? 'SENT' : 'FAILED',
          result.error || null
        ).run();

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending to recipient ${(recipient as any).id}:`, error);
        failCount++;
      }
    }

    return c.json({
      success: true,
      total: recipients.results.length,
      sent: successCount,
      failed: failCount,
    });
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
      console.log('WhatsApp webhook verified');
      return c.text(challenge || '');
    }

    return c.json({ error: 'Verification failed' }, 403);
  } catch (error) {
    console.error('Error verifying webhook:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// WhatsApp webhook handler (POST) - receive incoming messages and status updates
app.post("/api/whatsapp/webhook", async (c) => {
  try {
    const body = await c.req.json();

    // Log webhook for debugging
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Handle status updates
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        const messageId = status.id;
        const newStatus = status.status; // sent, delivered, read, failed

        // Update notification status
        let statusValue = 'PENDING';
        
        if (newStatus === 'sent') {
          statusValue = 'SENT';
          await c.env.DB.prepare(`
            UPDATE whatsapp_notifications 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE whatsapp_message_id = ?
          `).bind(statusValue, messageId).run();
        } else if (newStatus === 'delivered') {
          statusValue = 'DELIVERED';
          await c.env.DB.prepare(`
            UPDATE whatsapp_notifications 
            SET status = ?, delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE whatsapp_message_id = ?
          `).bind(statusValue, messageId).run();
        } else if (newStatus === 'read') {
          statusValue = 'READ';
          await c.env.DB.prepare(`
            UPDATE whatsapp_notifications 
            SET status = ?, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE whatsapp_message_id = ?
          `).bind(statusValue, messageId).run();
        } else if (newStatus === 'failed') {
          statusValue = 'FAILED';
          await c.env.DB.prepare(`
            UPDATE whatsapp_notifications 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE whatsapp_message_id = ?
          `).bind(statusValue, messageId).run();
        }
      }
    }

    // Handle incoming messages (future: could integrate with chat system)
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = body.entry[0].changes[0].value.messages;
      
      for (const message of messages) {
        const from = message.from;
        const text = message.text?.body;
        
        // Find user by WhatsApp phone
        const user = await c.env.DB.prepare(
          "SELECT id FROM users WHERE whatsapp_phone = ?"
        ).bind(from).first();

        if (user && text) {
          // TODO: Integrate with chat system to create a message from this employee
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

    const userProfile = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let notifications;
    if (userProfile.role === 'HR') {
      // HR can see all notifications
      notifications = await c.env.DB.prepare(`
        SELECT n.*, u.first_name || ' ' || u.last_name as employee_name
        FROM whatsapp_notifications n
        JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
        LIMIT 100
      `).all();
    } else {
      // Employees see only their own
      notifications = await c.env.DB.prepare(`
        SELECT * FROM whatsapp_notifications 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(userProfile.id).all();
    }

    return c.json(notifications.results || []);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

export default app;
