// Versionnée depuis la prod le 2026-06-10 (déployée avec --no-verify-jwt :
// le JWT est vérifié manuellement ci-dessous).
// Dette connue : les erreurs des deletes ne sont pas vérifiées.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const uid   = user.id
    const admin = createClient(supabaseUrl, serviceRoleKey)

    await admin.from('transactions').delete().eq('user_id', uid)
    await admin.from('recurring_transactions').delete().eq('user_id', uid)
    await admin.from('budget_envelopes').delete().eq('user_id', uid)
    await admin.from('favorites').delete().eq('user_id', uid)
    await admin.from('savings_goals').delete().eq('user_id', uid)
    await admin.from('user_api_keys').delete().eq('user_id', uid)
    await admin.from('categories').delete().eq('user_id', uid)
    await admin.from('user_preferences').delete().eq('user_id', uid)

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
