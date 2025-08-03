export function userAutoCreateTemplateEn(email: string, password: string, frontendHost: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Account Created</title>
        </head>
        <body>
            <h1>Welcome to MoovAdventures!</h1>
            <p>Hello,</p>
            <p>Your account has been automatically created by the MoovAdventures team.</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary password:</strong> ${password}</p>
            <p>
                You can log in to our system using your credentials.<br>
                For security reasons, we recommend that you change your password after logging in for the first time.
            </p>
            <p>
                Access <a href="${frontendHost}/login">here/login</a>
            </p>
            <p>If you did not request this account, please ignore this message.</p>
            <p>Thank you very much!</p>
        </body>
        </html>
    `;
}