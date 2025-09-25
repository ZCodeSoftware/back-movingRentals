import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    app: {
      appName: process.env.APP_NAME,
      app_port: process.env.PORT,
      api_key: process.env.APP_API_KEY,
      app_global_prefix: process.env.APP_GLOBAL_PREFIX,
      front: {
        front_base_urls: JSON.parse(process.env.FRONT_BASE_URLS) ?? [],
      },
      domain: process.env.APP_DOMAIN,
      env: process.env.NODE_ENV,
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
      mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      },
    },
    exchangeRate: {
      url: process.env.EXCHANGE_RATE_URL,
      apiKey: process.env.EXCHANGE_RATE_API_KEY,
    },
  };
});
