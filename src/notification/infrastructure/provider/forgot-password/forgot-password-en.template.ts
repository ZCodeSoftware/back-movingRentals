
export function forgotPasswordTemplateEn(token: string, frontendHost: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Forgot your password</title>
        </head>
        <body>
            <h1>Reset your password</h1>
            <p>Hello!</p>
            <p>You requested a password reset for your account.</p>
            <p>
            Click the following link to reset your password:
            <a href="${frontendHost}/forgotPassword?t=${token}">Reset password</a>
            This link is valid for 10 minutes.
            </p>
            <p>If you didn't request this, please ignore this message.</p>
            <p>Thank you!</p>
        </body>
        </html>
    `;
}
