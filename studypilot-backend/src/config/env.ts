import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
};

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  GROQ_API_KEY: required('GROQ_API_KEY'),
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  GROQ_MAX_TOKENS: parseInt(process.env.GROQ_MAX_TOKENS || '4096', 10),
  GROQ_TEMPERATURE: parseFloat(process.env.GROQ_TEMPERATURE || '0.3'),
  GROQ_RPM_LIMIT: parseInt(process.env.GROQ_RPM_LIMIT || '25', 10),
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  WEB_SEARCH_MAX_RESULTS: parseInt(process.env.WEB_SEARCH_MAX_RESULTS || '5', 10),
  VECTOR_STORE_PATH: process.env.VECTOR_STORE_PATH || './data/faiss_index',
  PDF_TEMP_DIR: process.env.PDF_TEMP_DIR || './tmp/exports',
  READINESS_PASS_THRESHOLD: parseInt(process.env.READINESS_PASS_THRESHOLD || '70', 10),
};
