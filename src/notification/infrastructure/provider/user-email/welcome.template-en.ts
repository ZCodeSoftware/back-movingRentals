export function userWelcomeTemplateEn(
  email: string,
  frontendHost: string,
): string {
  const brandColor = '#14b8a6'; // Main turquoise color from your website
  const bgColor = '#f3f4f6';
  const textColor = '#374151';
  const lightTextColor = '#6b7280';
  const containerBg = '#ffffff';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to MoovAdventures!</title>
        <style>
            body { margin: 0; padding: 0; }
            a { color: ${brandColor}; text-decoration: none; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
            <tr>
                <td align="center">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 30px 10px;">
                        <!-- Logo Header -->
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                <a href="${frontendHost}" target="_blank">
                                    <img src="https://www.moovadventures.com/assets/logo-DLz-SDwo.png" alt="MoovAdventures Logo" width="80" style="display: block;" />
                                </a>
                            </td>
                        </tr>
                        <!-- Main Content -->
                        <tr>
                            <td align="center" style="background-color: ${containerBg}; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                                <h1 style="color: ${textColor}; font-size: 24px; margin: 0 0 20px 0;">Welcome to MoovAdventures!</h1>
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                                    Hello,
                                </p>
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                    Thank you for signing up with MoovAdventures! Your account has been successfully created.
                                </p>
                                
                                <!-- Account Info Box -->
                                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 25px; text-align: left;">
                                    <p style="color: ${textColor}; font-size: 16px; margin: 0;"><strong>Your email:</strong> ${email}</p>
                                </div>
                                
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    You can now log in using your email address and the password you chose during registration.
                                </p>

                                <!-- CTA Button -->
                                <a href="${frontendHost}/login" target="_blank" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                                    Log In
                                </a>
                                
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                                    We're excited to have you with us. Start exploring our services!
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 30px 10px;">
                                <p style="color: ${lightTextColor}; font-size: 14px;">If you didn't create this account, please contact us immediately.</p>
                                <p style="color: ${lightTextColor}; font-size: 12px; margin-top: 10px;">
                                    © ${new Date().getFullYear()} MoovAdventures. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}
