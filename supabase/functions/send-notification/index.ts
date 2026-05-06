// Supabase Edge Function: send-notification
// Sends WhatsApp messages via BotConversa API
//
// Payload:
// {
//   "type": "reminder_24h" | "reminder_2h" | "review_request" | "followup_6m" | "appointment_confirmed" | "quote_ready",
//   "appointment_id": "uuid" (optional),
//   "customer_id": "uuid",
//   "custom_data": {} (optional, extra template variables)
// }

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

    const body = await req.json()
    const { type, appointment_id, customer_id, custom_data = {} } = body

    if (!type || !customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'type e customer_id obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .single()

    if (!template) {
      return new Response(
        JSON.stringify({ success: false, error: `Template "${type}" não encontrado ou inativo` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single()

    if (!customer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load appointment data if available
    let appointment: any = null
    let service: any = null
    if (appointment_id) {
      const { data: appt } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .eq('id', appointment_id)
        .single()
      appointment = appt
      service = appt?.services
    }

    // Build template variables
    const appUrl = Deno.env.get('APP_URL') || 'https://petardo.vercel.app'
    const variables: Record<string, string> = {
      nome: customer.name,
      servico: service?.name || custom_data.servico || '',
      data: appointment ? new Date(appointment.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      hora: appointment ? appointment.scheduled_time_start?.slice(0, 5) : '',
      endereco: customer.address || '',
      link: custom_data.link || '',
      valor: custom_data.valor || '',
      ...custom_data,
    }

    // Generate review link if needed
    if (type === 'review_request' && appointment_id) {
      variables.link = `${appUrl}/avaliar/${appointment_id}`
    }

    // Replace template variables
    let message = template.template_text
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    // Load BotConversa config
    const { data: config } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'botconversa_config')
      .single()

    const botConfig = config?.value as any
    let sendStatus = 'pending'
    let errorMessage = null

    // Send via BotConversa API if configured
    if (botConfig?.api_key && botConfig?.is_active) {
      try {
        const bcResponse = await fetch(botConfig.webhook_url || 'https://backend.botconversa.com.br/api/v1/webhooks/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-KEY': botConfig.api_key,
          },
          body: JSON.stringify({
            phone: customer.phone,
            message: message,
          }),
        })

        if (bcResponse.ok) {
          sendStatus = 'sent'
        } else {
          sendStatus = 'failed'
          errorMessage = `BotConversa API error: ${bcResponse.status}`
        }
      } catch (err) {
        sendStatus = 'failed'
        errorMessage = err.message
      }
    } else {
      // BotConversa not configured - log as pending
      sendStatus = 'pending'
      errorMessage = 'BotConversa não configurado'
    }

    // Log notification
    await supabase.from('notification_log').insert({
      customer_id,
      appointment_id: appointment_id || null,
      template_type: type,
      phone: customer.phone,
      message_sent: message,
      status: sendStatus,
      error_message: errorMessage,
      sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    })

    // Update appointment flags if applicable
    if (appointment_id) {
      const updates: Record<string, boolean> = {}
      if (type === 'reminder_24h') updates.reminder_24h_sent = true
      if (type === 'reminder_2h') updates.reminder_2h_sent = true
      if (type === 'review_request') updates.review_sent = true
      if (type === 'followup_6m') updates.followup_sent = true

      if (Object.keys(updates).length > 0) {
        await supabase.from('appointments').update(updates).eq('id', appointment_id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: sendStatus,
        message_preview: message.substring(0, 100) + '...',
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
