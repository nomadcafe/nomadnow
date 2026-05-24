/**
 * Environment variable validation
 * 
 * Note: In development, we use lazy validation to allow the app to start
 * even if environment variables are missing (they'll fail when actually used)
 */

import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  // Optional — when both are set, API rate limiting uses Upstash Redis.
  // When unset, rate limiting silently no-ops (fine for local dev / preview deploys).
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Stripe billing — optional so the app still boots locally without Stripe set.
  // The /api/billing/* routes will return 503 when these are missing.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_BASIC: z.string().min(1).optional(),
  STRIPE_PRICE_PRO: z.string().min(1).optional(),
})

type Env = z.infer<typeof envSchema>

/**
 * Validated environment variables
 * Throws an error if required variables are missing or invalid
 */
export function getEnv(): Env {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_BASE_URL: baseUrl,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRICE_BASIC: process.env.STRIPE_PRICE_BASIC,
      STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join('.')).join(', ')
      throw new Error(`Missing or invalid environment variables: ${missing}`)
    }
    throw error
  }
}

// Lazy validation - only validate when actually used
let cachedEnv: Env | null = null

export function getEnvSafe(): Env {
  if (cachedEnv) {
    return cachedEnv
  }
  
  // During build or if env vars are missing, use placeholder values
  // This allows the build to succeed even without env vars set
  const isBuild = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'
  
  if (isBuild || process.env.NODE_ENV === 'development') {
    try {
      cachedEnv = getEnv()
      return cachedEnv
    } catch (error) {
      // Return placeholder values for build/dev
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Environment variables not set. Using placeholder values.')
        console.warn('Create a .env.local file with your Supabase credentials.')
      }
      cachedEnv = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-key',
        SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-key',
        NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      } as Env
      return cachedEnv
    }
  }
  
  // In production runtime, strict validation
  cachedEnv = getEnv()
  return cachedEnv
}

