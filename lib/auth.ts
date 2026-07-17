import { NextRequest } from 'next/server'
import { createServerClient } from './supabase/server'
import { User } from '@supabase/supabase-js'

/**
 * Authenticates a request using the Authorization header (Bearer token)
 * and returns the authenticated user object.
 * 
 * Throws an error or returns null if authentication fails.
 */
export async function getAuthUser(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) return null

  try {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Supabase Auth error:', error)
      return null
    }

    return user
  } catch (err) {
    console.error('Auth check failed:', err)
    return null
  }
}
