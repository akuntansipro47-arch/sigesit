import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('CONFIG_ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Edge Function settings.')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    )

    // 1. Get the JWT from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('AUTH_ERROR: No authorization header')

    // 2. Verify the user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error(`SESSION_ERROR: ${userError?.message || 'Invalid session'}. Please Logout and Login again.`)
    }

    // Check role in user_profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error(`PROFILE_ERROR: Could not verify your admin role. ${profileError?.message || 'Profile not found'}`)
    }

    if (!profile.is_active) {
      throw new Error('ACCOUNT_ERROR: Your admin account is deactivated.')
    }

    const roleString = String(profile.role || '').toLowerCase();
    const hasAdminPower = roleString.includes('admin') || roleString.includes('super');
    
    if (!hasAdminPower) {
      throw new Error(`PERMISSION_ERROR: Your role is '${roleString}'. You need 'admin' or 'super_admin' role to change passwords.`)
    }

    // 3. Get the payload
    let body;
    try {
      body = await req.json()
    } catch (e) {
      throw new Error('Invalid JSON body in request')
    }

    const { userId, password, action = 'update' } = body

    if (action === 'update') {
      if (!userId || !password) {
        throw new Error('Missing userId or password for update action')
      }

      // 4. Update the user password in Auth
      const { data, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { password: password }
      )

      if (updateError) {
        throw new Error(`Auth Admin Update Error: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          message: 'Password updated successfully',
          userId: userId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else if (action === 'delete') {
      if (!userId) {
        throw new Error('Missing userId for delete action')
      }

      // 4. Delete the user from Auth
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

      if (deleteError) {
        throw new Error(`Auth Admin Delete Error: ${deleteError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          message: 'User deleted successfully from Auth',
          userId: userId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
