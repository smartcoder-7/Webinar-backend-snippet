import dotenv from 'dotenv';

dotenv.config();

const domain =
  process.env.NODE_ENV === 'production'
    ? 'ewebinar.com'
    : process.env.NODE_ENV === 'staging'
    ? 'staging.ewebinar.com'
    : process.env.NODE_ENV === 'development'
    ? 'dev.ewebinar.com'
    : process.env.DOMAIN || 'local.dawson.fm';

export const config = {
  port: process.env.SERVER_PORT || 4000,
  accessTokenMaxAge: 24 * 7 * 60 * 60 * 1000,
  refreshTokenMaxAge: 24 * 7 * 60 * 60 * 1000,

  cors: {
    credentials: true,
    origin: [
      'http://localhost:8000',
      'http://local.dawson.fm',
      /ewebinar\.com$/,
      /ewebinar-frontend\.netlify\.com$/,
      /ewebinar-frontend-staging\.netlify\.com$/,
      /ewebinar-frontend-dev\.netlify\.com$/,
    ],
  },

  DOMAIN: domain,

  MAIN_FRONTEND_URL: process.env.MAIN_FRONTEND_URL || `https://app.${domain}`,
  MAIN_BACKEND_URL: process.env.MAIN_BACKEND_URL || `https://api.${domain}`,
  SQS_WORKER_URL:
    process.env.SQS_WORKER_URL ||
    'https://sqs.us-east-1.amazonaws.com/272181950121/worker-dev.fifo',

  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'NO_KEY!',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'NO_SECRET_KEY!',

  ASSETS_S3_BUCKET: process.env.ASSETS_S3_BUCKET || 'ewebinar-assets-dev',

  STRIPE_API_KEY: process.env.STRIPE_API_KEY || 'sk_test_mUt7uSCgWhbK7ZjYXNg33TCd00AH3gU3f7',
  STRIPE_STANDARD_PLAN: process.env.STRIPE_STANDARD_PLAN || 'standard-monthly',
  VIMEO_BASE_URL: process.env.VIMEO_BASE_URL || 'https://api.vimeo.com',
  VIMEO_ACCESS_TOKEN: process.env.VIMEO_ACCESS_TOKEN,

  API_GATEWAY_ENDPOINT:
    process.env.API_GATEWAY_ENDPOINT ||
    'https://ey3fagru4c.execute-api.us-east-1.amazonaws.com/dev',

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'access-token-2093842l',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh-token-0293849322',
  PAGINATION_LIMIT: process.env.PAGINATION_LIMIT || 10,
  WELCOME_MESSAGE_TO_SHOW_AFTER_SECS: 30,

  UPLOAD_PROGRESS_MAX: process.env.GATSBY_UPLOAD_PROGRESS_MAX
    ? parseInt(process.env.GATSBY_UPLOAD_PROGRESS_MAX, 10)
    : 50, // Keep these synced between worker, frontend and backend
  SECONDS_PER_CHART_POINT: 5,
  DEMO_WEBINAR_SETID: process.env.DEMO_WEBINAR_SETID || null,
};

export default config;
