export function userAutoCreateTemplateEs(email: string, password: string, frontendHost: string): string {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Cuenta creada</title>
        </head>
        <body>
            <h1>¡Bienvenido a MoovAdventures!</h1>
            <p>Hola,</p>
            <p>Tu cuenta ha sido creada automáticamente por el equipo de MoovAdventures.</p>
            <p><strong>Correo electrónico:</strong> ${email}</p>
            <p><strong>Contraseña temporal:</strong> ${password}</p>
            <p>
                Puedes iniciar sesión en nuestro sistema usando tus credenciales.<br>
                Por seguridad, te recomendamos cambiar tu contraseña después de ingresar por primera vez.
            </p>
            <p>
                Accede <a href="${frontendHost}/login">aquí</a>
            </p>
            <p>Si no solicitaste esta cuenta, por favor ignora este mensaje.</p>
            <p>¡Muchas gracias!</p>
        </body>
        </html>
    `;
}