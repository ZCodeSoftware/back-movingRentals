import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  // URLs por defecto del frontend
  const defaultFrontUrls = [
    'https://moovadventures.com',
    'https://www.moovadventures.com',
    'https://moovadventures.mx',
    'https://www.moovadventures.mx',
  ];

  let frontBaseUrls = defaultFrontUrls;
  
  // Intentar parsear las URLs del .env si existen
  if (process.env.FRONT_BASE_URLS) {
    try {
      const parsedUrls = JSON.parse(process.env.FRONT_BASE_URLS);
      if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
        frontBaseUrls = parsedUrls;
      }
    } catch (error) {
      console.warn('Error parsing FRONT_BASE_URLS, using default URLs:', error.message);
    }
  }

  return {
    app: {
      appName: process.env.APP_NAME,
      app_port: process.env.PORT,
      api_key: process.env.APP_API_KEY,
      app_global_prefix: process.env.APP_GLOBAL_PREFIX,
      front: {
        front_base_urls: frontBaseUrls,
      },
      domain: process.env.APP_DOMAIN,
      env: process.env.NODE_ENV,
      backend_url: process.env.BACKEND_URL,
    },
    auth: {
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION_TIME,
      },
    },
    business: {
      contact_email: process.env.BUSINESS_CONTACT_EMAIL,
      frontURL: process.env.FRONT_BASE_URL,
    },
    mongo: {
      mongo_uri: process.env.MONGO_URI,
    },
    providerEmail: {
      nodemailer: {
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASSWORD,
        },
      },
      brevo: {
        apiKey: process.env.BREVO_API_KEY,
      },
      resend: {
        apyKey: process.env.RESEND_API_KEY,
      },
    },
    paymentMethod: {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
    exchangeRate: {
      url: process.env.EXCHANGE_RATE_URL,
      apiKey: process.env.EXCHANGE_RATE_API_KEY,
    },
  };
});
