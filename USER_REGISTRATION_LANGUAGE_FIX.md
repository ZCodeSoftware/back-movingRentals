# Fix: Email de Registro de Usuario - Idioma y Envío de Email

## Problemas Identificados

### Problema 1: Email en idioma incorrecto
Cuando se creaba un usuario desde la web en inglés, el email de confirmación de cuenta creada llegaba en español en lugar de inglés.

### Problema 2: No se enviaban emails en el registro público
El endpoint público `POST /user` no enviaba ningún email de bienvenida al usuario registrado, solo creaba la cuenta en la base de datos.

## Causa Raíz

### Problema del Idioma
El problema estaba en la lógica de selección del idioma del email en el método `sendUserAutoCreate` del archivo `user-email.provider.ts`:

```typescript
// ANTES (código problemático)
const template = lang === 'es' ? userAutoCreateTemplateEs : userAutoCreateTemplateEn;
```

Cuando el parámetro `lang` no se proporcionaba o era `undefined`, la condición `lang === 'es'` evaluaba a `false`, por lo que se usaba la plantilla en inglés por defecto. Sin embargo, el problema era que **debería usar español por defecto**, no inglés.

### Problema del Email
El método `create()` del servicio de usuario solo creaba el usuario en la base de datos pero no emitía ningún evento para enviar el email de bienvenida.

## Solución Implementada

### 1. Normalización del Idioma en `user-email.provider.ts`

Se modificó el método `sendUserAutoCreate` para:
- Normalizar el idioma recibido (eliminar espacios)
- Usar **español ('es') como idioma por defecto** cuando no se proporciona
- Cambiar la lógica para verificar si el idioma es 'en' (inglés) en lugar de 'es'

```typescript
async sendUserAutoCreate(
  email: string,
  password: string,
  frontendHost: string,
  lang?: string,
): Promise<any> {
  const context = `auto-create-${email}`;
  // Normalizar el idioma - usar 'es' por defecto si no se proporciona
  const normalizedLang = lang?.trim() || 'es';
  this.logger.log(`[${context}] Iniciando sendUserAutoCreate, lang recibido: ${lang}, normalizado: ${normalizedLang}`);

  try {
    const template =
      normalizedLang === 'en' ? userAutoCreateTemplateEn : userAutoCreateTemplateEs;
    const htmlContent = template(email, password, frontendHost);

    const emailData = this.createBrevoEmailData(
      { email: config().business.contact_email, name: 'MoovAdventures' },
      email,
      normalizedLang === 'en' ? 'Account created' : 'Cuenta creada',
      htmlContent,
    );

    emailData.tags = ['account-creation', normalizedLang];

    return await this.sendEmailWithBrevo(emailData, context);
  } catch (error) {
    this.logger.error(`[${context}] Error en sendUserAutoCreate:`, error);
    throw new InternalServerErrorException(error.message);
  }
}
```

### 2. Nuevo Método `createWithEmail` en el Servicio

Se implementó el método `createWithEmail` en `user.service.ts` que:
- Crea el usuario con la contraseña proporcionada por el usuario
- Guarda la contraseña en texto plano temporalmente para enviarla por email
- Hashea la contraseña antes de guardarla en la base de datos
- Emite el evento para enviar el email de bienvenida con las credenciales

```typescript
async createWithEmail(
  user: IUserCreate,
  frontendHost: string,
  lang: string = 'es',
): Promise<UserModel> {
  try {
    // Normalizar el idioma
    const normalizedLang = lang?.trim() || 'es';
    console.log(`[UserService.createWithEmail] Lang recibido: "${lang}", normalizado: "${normalizedLang}"`);
    console.log(`[UserService.createWithEmail] Creating user: ${user.email}`);
    
    const { role, address, ...rest } = user;
    const foundEmail = await this.userRepository.findByEmail(rest.email);

    if (foundEmail)
      throw new BaseErrorException(
        'This email is already in use',
        HttpStatus.BAD_REQUEST,
      );

    // Guardar la contraseña en texto plano para enviarla por email
    const plainPassword = rest.password;
    const hashedPassword = await hashPassword(rest.password);

    const userModel = UserModel.create({
      ...rest,
      password: hashedPassword,
      isActive: true,
    });

    // ... crear dirección y guardar usuario ...

    // Enviar email de bienvenida con las credenciales
    if (userSave) {
      console.log(`[UserService.createWithEmail] User created successfully, emitting email event with lang: "${normalizedLang}"`);
      this.eventEmitter.emit('send-user.auto-create', {
        email: userSave.toJSON().email,
        password: plainPassword,
        frontendHost: validFrontendUrl,
        lang: normalizedLang,
      });
    }
    
    return userSave;
  } catch (error) {
    console.error(`[UserService.createWithEmail] Error:`, error);
    throw new BaseErrorException(error.message, error.statusCode);
  }
}
```

### 3. Modificación del Endpoint `POST /user`

Se modificó el endpoint existente `POST /user` en `user.controller.ts` para que ahora:
- Acepte el parámetro `lang` en el query string
- Llame al nuevo método `createWithEmail` en lugar de `create`
- Envíe el email de bienvenida automáticamente

```typescript
@Post()
@ApiResponse({ status: 201, description: 'Create a new user and send welcome email' })
@ApiResponse({ status: 400, description: 'Invalid request' })
@ApiBody({ type: CreateUserDTO })
@ApiQuery({
  name: 'lang',
  type: String,
  required: false,
  description: 'Language for the email notification (es or en). Defaults to es.',
})
async createUser(
  @Body() user: CreateUserDTO,
  @Headers('origin') requestHost: string,
  @Query('lang') lang: string,
): Promise<any> {
  return await this.userService.createWithEmail(user, requestHost, lang);
}
```

### 4. Normalización en `autoCreate`

También se agregó normalización en el método `autoCreate` del servicio de usuario:

```typescript
async autoCreate(
  user: IAutoCreate & { ... },
  frontendHost: string,
  lang: string = 'es',
): Promise<UserModel> {
  try {
    // Normalizar el idioma - usar 'es' por defecto si no se proporciona o está vacío
    const normalizedLang = lang?.trim() || 'es';
    console.log(`[UserService.autoCreate] Lang recibido: "${lang}", normalizado: "${normalizedLang}"`);
    
    // ... resto del código ...
    
    if (userSave) {
      console.log(`[UserService.autoCreate] Emitiendo evento con lang: "${normalizedLang}"`);
      this.eventEmitter.emit('send-user.auto-create', {
        email: userSave.toJSON().email,
        password,
        frontendHost: validFrontendUrl,
        lang: normalizedLang,
      });
    }
    
    return userSave;
  } catch (error) {
    throw new BaseErrorException(error.message, error.statusCode);
  }
}
```

## Archivos Modificados

1. **`src/notification/infrastructure/provider/user-email/user-email.provider.ts`**
   - Método `sendUserAutoCreate`: Normalización del idioma y cambio de lógica para usar español por defecto

2. **`src/user/application/services/user.service.ts`**
   - Método `autoCreate`: Normalización del idioma antes de emitir el evento
   - **NUEVO** Método `createWithEmail`: Crea usuario y envía email de bienvenida

3. **`src/user/domain/services/user.interface.service.ts`**
   - Agregada la firma del método `createWithEmail` a la interfaz

4. **`src/user/infrastructure/nest/controllers/user.controller.ts`**
   - **MODIFICADO** Endpoint `POST /user`: Ahora acepta parámetro `lang` y envía email de bienvenida

## Comportamiento Esperado

### Antes del Fix
- Usuario creado desde web en inglés → Email en español ❌
- Usuario creado desde `POST /user` → No se enviaba email ❌

### Después del Fix
- Usuario creado desde web en inglés con `?lang=en` → Email en inglés ✅
- Usuario creado desde web en español con `?lang=es` → Email en español ✅
- Usuario creado sin especificar idioma → Email en español (por defecto) ✅
- **Todos los usuarios creados reciben email de bienvenida** ✅

## Cómo Usar desde el Frontend

El frontend debe agregar el parámetro `lang` al endpoint existente:

```typescript
// ANTES (no enviaba email)
POST /api/user

// AHORA (envía email en el idioma correcto)
const lang = i18n.language; // 'en' o 'es'
const response = await fetch(`/api/user?lang=${lang}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'origin': window.location.origin
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John',
    lastName: 'Doe',
    cellphone: '+1234567890',
    newsletter: true,
    address: {
      countryId: '507f1f77bcf86cd799439011'
    }
  })
});
```

## Endpoints Disponibles

### 1. `POST /user` (Modificado - Público)
**Uso para registro desde el frontend web**

Ahora envía email de bienvenida automáticamente.

```typescript
POST /api/user?lang=en  // o ?lang=es
```

### 2. `POST /user/automatic-register` (Existente - Requiere Autenticación)
Endpoint protegido para que administradores creen usuarios. Genera una contraseña aleatoria y envía email.

```typescript
// Requiere token de autenticación de ADMIN/SUPERADMIN/SELLER/SUPERVISOR
POST /api/user/automatic-register?lang=en
```

## Logs de Debugging

Se agregaron logs para facilitar el debugging:
- `[UserService.createWithEmail] Lang recibido: "...", normalizado: "..."`
- `[UserService.createWithEmail] Creating user: email@example.com`
- `[UserService.createWithEmail] User created successfully, emitting email event with lang: "..."`
- `[UserService.autoCreate] Lang recibido: "...", normalizado: "..."`
- `[UserService.autoCreate] Emitiendo evento con lang: "..."`
- `[auto-create-{email}] Iniciando sendUserAutoCreate, lang recibido: ..., normalizado: ...`

Estos logs ayudarán a identificar si el idioma se está pasando correctamente desde el frontend y si el email se está enviando.

## Testing

Para probar el fix:

1. **Crear usuario desde web en inglés:**
   ```bash
   POST /api/user?lang=en
   ```
   Verificar que:
   - El usuario se cree en la BD
   - Se vean los logs en la consola
   - El email llegue en inglés

2. **Crear usuario desde web en español:**
   ```bash
   POST /api/user?lang=es
   ```
   Verificar que el email llegue en español

3. **Crear usuario sin especificar idioma:**
   ```bash
   POST /api/user
   ```
   Verificar que el email llegue en español (idioma por defecto)

## Notas Adicionales

- El idioma por defecto es español ('es') ya que es el idioma principal de la aplicación
- Se recomienda que el frontend siempre envíe el parámetro `lang` explícitamente para evitar ambigüedades
- El método `create()` original sigue existiendo pero ya no se usa desde el controlador
- Si necesitas crear usuarios sin enviar email (por ejemplo, en migraciones), puedes llamar directamente a `userService.create()` desde otro servicio
