
export function forgotPasswordTemplate(token: string, frontendHost: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Olvidaste tu contraseña</title>
        </head>
        <body>
            <h1>Restablece tu contraseña</h1>
            <p>Hola!</p>
            <p>Solicitaste un restablecimiento de contraseña para tu cuenta .</p>
            <p>
            haz clic en el siguiente enlace para restablecer tu contraseña:
            <a href="${frontendHost}/forgotPassword?t=${token}">Restablecer contraseña</a>
            Este enlace es válido por 10 minutos.
            </p>
            <p>Si no solicitaste esto, ignora este mensaje.</p>
            <p>Muchas gracias!</p>
        </body>
        </html>
    `;
}