/**
 * WhatsApp Business API Service
 * Handles sending messages and managing WhatsApp Business API interactions
 */

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
}

export interface SendMessageParams {
  to: string; // Phone number in international format (e.g., "5491234567890")
  type: 'text' | 'template';
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Format phone number to WhatsApp format (remove + and spaces)
   */
  private formatPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Send a text message (limited use - requires 24hr conversation window)
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: text },
          }),
        }
      );

      const data = await response.json() as any;

      if (!response.ok) {
        console.error('WhatsApp API error:', data);
        
        // Handle specific error codes
        let errorMessage = data.error?.message || 'Failed to send message';
        
        if (data.error?.code === 131030) {
          errorMessage = 'Tu cuenta de WhatsApp Business está en modo de desarrollo. ' +
            'Los números de destinatarios deben estar agregados a la lista de permitidos en Meta Business Manager. ' +
            'Visita https://business.facebook.com y agrega los números de teléfono en la configuración de tu aplicación de WhatsApp.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a template message (recommended for notifications)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'es',
    params: string[] = []
  ): Promise<WhatsAppResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      const components = params.length > 0 ? [{
        type: 'body',
        parameters: params.map(param => ({
          type: 'text',
          text: param,
        })),
      }] : [];

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components: components,
            },
          }),
        }
      );

      const data = await response.json() as any;

      if (!response.ok) {
        console.error('WhatsApp API error:', data);
        
        // Handle specific error codes
        let errorMessage = data.error?.message || 'Failed to send template message';
        
        if (data.error?.code === 131030) {
          errorMessage = 'Tu cuenta de WhatsApp Business está en modo de desarrollo. ' +
            'Los números de destinatarios deben estar agregados a la lista de permitidos en Meta Business Manager. ' +
            'Visita https://business.facebook.com y agrega los números de teléfono en la configuración de tu aplicación de WhatsApp.';
        } else if (data.error?.code === 132000) {
          errorMessage = 'La plantilla de mensaje no ha sido aprobada. Verifica que el nombre de la plantilla sea correcto y esté aprobada en Meta Business Manager.';
        } else if (data.error?.code === 100) {
          errorMessage = 'Parámetros inválidos. Verifica que los parámetros coincidan con la plantilla configurada.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      console.error('Error sending WhatsApp template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature (for receiving messages)
   * TODO: Implement proper signature verification using crypto
   */
  static verifyWebhookSignature(
    _payload: string,
    _signature: string,
    _appSecret: string
  ): boolean {
    // This would use crypto to verify the signature
    // For now, simplified version
    return true;
  }

  /**
   * Parse incoming webhook message
   */
  static parseWebhookMessage(body: any): {
    from: string;
    message: string;
    timestamp: number;
  } | null {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) return null;

      return {
        from: message.from,
        message: message.text?.body || '',
        timestamp: message.timestamp,
      };
    } catch (error) {
      console.error('Error parsing webhook message:', error);
      return null;
    }
  }
}

export function createWhatsAppService(config: WhatsAppConfig): WhatsAppService {
  return new WhatsAppService(config);
}
