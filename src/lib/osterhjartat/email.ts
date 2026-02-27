/**
 * Österhjärtat - Email Service (SMTP)
 * Handles sending emails for registration, updates, and unsubscribe flows
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // Port 465 requires SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const FROM_EMAIL = 'Österhjärtat <noreply@ostersif.se>';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/**
 * Send registration confirmation email
 */
export async function sendRegistrationConfirmation(email: string, name: string) {
  try {
    await getTransporter().sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Välkommen till Österhjärtat!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1e0101; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e0101; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <tr>
                    <td style="background-color: #500100; border-radius: 16px; padding: 40px;">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        Välkommen till Österhjärtat!
                      </h1>
                      <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hej ${name},
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Tack för att du har registrerat dig för Österhjärtat! Du är nu en del av en unik gemenskap som stöttar Östers IF.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        <strong style="color: #ffffff;">Så här fungerar det:</strong><br>
                        Varje gång Östers IF vinner en match dras 96 kr automatiskt från ditt registrerade kort.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Tillsammans gör vi Östers IF starkare!
                      </p>
                      <div style="text-align: center;">
                        <a href="${getBaseUrl()}/osterhjartat" style="display: inline-block; background-color: #ffffff; color: #1e0101; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600;">
                          Besök Österhjärtat
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                        Östers IF • Österhjärtat
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`Registration confirmation sent to ${email}`);
  } catch (error) {
    console.error('Failed to send registration confirmation:', error);
  }
}

/**
 * Send email with card update link
 */
export async function sendUpdateCardEmail(email: string, updateUrl: string) {
  try {
    await getTransporter().sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Uppdatera dina kortuppgifter - Österhjärtat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1e0101; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e0101; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <tr>
                    <td style="background-color: #500100; border-radius: 16px; padding: 40px;">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        Uppdatera dina kortuppgifter
                      </h1>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Du har begärt att uppdatera dina kortuppgifter för Österhjärtat.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Klicka på knappen nedan för att ange nya kortuppgifter:
                      </p>
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${updateUrl}" style="display: inline-block; background-color: #ffffff; color: #1e0101; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600;">
                          Uppdatera kortuppgifter
                        </a>
                      </div>
                      <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0;">
                        Om du inte har begärt detta kan du ignorera detta mail.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                        Östers IF • Österhjärtat
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`Update card email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send update card email:', error);
  }
}

/**
 * Send email with unsubscribe link
 */
export async function sendUnsubscribeEmail(email: string, unsubscribeUrl: string) {
  try {
    await getTransporter().sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Avregistrera från Österhjärtat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1e0101; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e0101; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <tr>
                    <td style="background-color: #500100; border-radius: 16px; padding: 40px;">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        Avregistrera från Österhjärtat
                      </h1>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Du har begärt att avsluta ditt medlemskap i Österhjärtat.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Klicka på knappen nedan för att bekräfta avregistreringen:
                      </p>
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${unsubscribeUrl}" style="display: inline-block; background-color: #c52814; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600;">
                          Bekräfta avregistrering
                        </a>
                      </div>
                      <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0;">
                        Om du inte har begärt detta kan du ignorera detta mail. Din registrering kommer inte att påverkas.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                        Östers IF • Österhjärtat
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`Unsubscribe email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send unsubscribe email:', error);
  }
}

/**
 * Send unsubscribe confirmation email
 */
export async function sendUnsubscribeConfirmation(email: string) {
  try {
    await getTransporter().sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Du är nu avregistrerad från Österhjärtat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1e0101; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e0101; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <tr>
                    <td style="background-color: #500100; border-radius: 16px; padding: 40px;">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        Avregistrering genomförd
                      </h1>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Du är nu avregistrerad från Österhjärtat. Inga fler betalningar kommer att dras från ditt kort.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Vi hoppas att vi ses igen! Du är alltid välkommen tillbaka.
                      </p>
                      <div style="text-align: center;">
                        <a href="${getBaseUrl()}/osterhjartat" style="display: inline-block; background-color: #ffffff; color: #1e0101; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600;">
                          Registrera dig igen
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                        Östers IF • Österhjärtat
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`Unsubscribe confirmation sent to ${email}`);
  } catch (error) {
    console.error('Failed to send unsubscribe confirmation:', error);
  }
}

/**
 * Send card update confirmation email
 */
export async function sendUpdateConfirmation(email: string) {
  try {
    await getTransporter().sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Kortuppgifter uppdaterade - Österhjärtat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1e0101; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e0101; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <tr>
                    <td style="background-color: #500100; border-radius: 16px; padding: 40px;">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        Kortuppgifter uppdaterade!
                      </h1>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Dina kortuppgifter har uppdaterats. Nästa gång Östers IF vinner kommer beloppet att dras från ditt nya kort.
                      </p>
                      <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Tack för att du fortsätter stötta Östers IF!
                      </p>
                      <div style="text-align: center;">
                        <a href="${getBaseUrl()}/osterhjartat" style="display: inline-block; background-color: #ffffff; color: #1e0101; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600;">
                          Besök Österhjärtat
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                        Östers IF • Österhjärtat
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`Update confirmation sent to ${email}`);
  } catch (error) {
    console.error('Failed to send update confirmation:', error);
  }
}
