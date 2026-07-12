import { config } from '../config/app.config';
import { logger } from '../config/logger.config';

export async function sendSms(to: string, message: string): Promise<void> {
  const provider = config.sms.provider;

  // ── Africa's Talking ────────────────────────────────────────────────────────
  if (provider === 'africastalking') {
    const apiKey   = config.sms.atApiKey;
    const username = config.sms.atUsername;

    if (!apiKey || !username) {
      logger.warn('[AfricasTalking] Missing AT_API_KEY or AT_USERNAME. Falling back to mock.');
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AfricasTalking = require('africastalking');
        const at = AfricasTalking({ apiKey, username });
        const sms = at.SMS;

        const result = await sms.send({
          to: [to],
          message,
          // Remove the `from` field when using sandbox — it's not needed
          ...(username !== 'sandbox' && config.sms.atSenderId
            ? { from: config.sms.atSenderId }
            : {}),
        });

        logger.info(`[AfricasTalking] SMS sent to ${to}`, result);
        return;
      } catch (err) {
        logger.error('[AfricasTalking] Failed to send SMS', { to, error: err });
        throw new Error('Failed to send SMS.');
      }
    }
  }

  // ── Twilio ──────────────────────────────────────────────────────────────────
  if (provider === 'twilio') {
    const accountSid  = config.sms.twilioAccountSid;
    const authToken   = config.sms.twilioAuthToken;
    const phoneNumber = config.sms.twilioPhoneNumber;

    if (!accountSid || !authToken || !phoneNumber) {
      logger.warn('[Twilio] Configuration is missing. Falling back to mock.');
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        await client.messages.create({ body: message, from: phoneNumber, to });
        logger.info(`[Twilio] SMS sent to ${to}`);
        return;
      } catch (err) {
        logger.error('[Twilio] Failed to send SMS', { to, error: err });
        throw new Error('Failed to send SMS.');
      }
    }
  }

  // ── Mock / Fallback (development) ───────────────────────────────────────────
  logger.info('\n=============================================');
  logger.info(`💬 MOCK SMS to: ${to}`);
  logger.info(`Message: ${message}`);
  logger.info('=============================================\n');
}
