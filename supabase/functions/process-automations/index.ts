// Supabase Edge Function: process-automations
// Should be called by pg_cron or external cron (every 30 minutes)
//
// Processes:
// 1. Reminder 24h before appointment
// 2. Reminder 2h before appointment
// 3. Review request 24h after completed appointment
// 4. Follow-up 6 months after completed appointment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const functionUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1/send-notification'
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const now = new Date()
    const results: string[] = []

    // ---- 1. REMINDER 24h ----
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const { data: remind24h } = await supabase
      .from('appointments')
      .select('id, customer_id')
      .eq('scheduled_date', tomorrowDate)
      .eq('reminder_24h_sent', false)
      .in('status', ['scheduled', 'confirmed'])

    for (const appt of (remind24h || [])) {
      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'reminder_24h',
          appointment_id: appt.id,
          customer_id: appt.customer_id,
        }),
      })
    }
    results.push(`Lembrete 24h: ${(remind24h || []).length} enviado(s)`)

    // ---- 2. REMINDER 2h ----
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const todayDate = now.toISOString().split('T')[0]
    const twoHourTime = twoHoursLater.toTimeString().slice(0, 5)

    const { data: remind2h } = await supabase
      .from('appointments')
      .select('id, customer_id, scheduled_time_start')
      .eq('scheduled_date', todayDate)
      .eq('reminder_2h_sent', false)
      .in('status', ['scheduled', 'confirmed'])
      .lte('scheduled_time_start', twoHourTime + ':00')
      .gte('scheduled_time_start', now.toTimeString().slice(0, 5) + ':00')

    for (const appt of (remind2h || [])) {
      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'reminder_2h',
          appointment_id: appt.id,
          customer_id: appt.customer_id,
        }),
      })
    }
    results.push(`Lembrete 2h: ${(remind2h || []).length} enviado(s)`)

    // ---- 3. REVIEW REQUEST (24h after completed) ----
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    const { data: reviewPending } = await supabase
      .from('appointments')
      .select('id, customer_id')
      .eq('scheduled_date', yesterdayDate)
      .eq('status', 'completed')
      .eq('review_sent', false)

    for (const appt of (reviewPending || [])) {
      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'review_request',
          appointment_id: appt.id,
          customer_id: appt.customer_id,
        }),
      })
    }
    results.push(`Avaliação: ${(reviewPending || []).length} enviado(s)`)

    // ---- 4. FOLLOW-UP 6 MONTHS ----
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsDate = sixMonthsAgo.toISOString().split('T')[0]

    const { data: followupPending } = await supabase
      .from('appointments')
      .select('id, customer_id')
      .eq('scheduled_date', sixMonthsDate)
      .eq('status', 'completed')
      .eq('followup_sent', false)

    for (const appt of (followupPending || [])) {
      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'followup_6m',
          appointment_id: appt.id,
          customer_id: appt.customer_id,
        }),
      })
    }
    results.push(`Recontato 6m: ${(followupPending || []).length} enviado(s)`)

    return new Response(
      JSON.stringify({
        success: true,
        processed_at: now.toISOString(),
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
