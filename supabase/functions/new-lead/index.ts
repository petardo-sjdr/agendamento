// Supabase Edge Function: new-lead
// Endpoint: POST /functions/v1/new-lead
// Called by BotConversa when a customer starts a quote flow
//
// Payload from BotConversa:
// {
//   "phone": "5531999999999",
//   "name": "João Silva",
//   "customer_type": "residential" | "commercial",
//   "service_slug": "dedetizacao",
//   "email": "joao@email.com" (optional)
// }
//
// Returns:
// {
//   "success": true,
//   "quote_url": "https://petardo.com.br/orcamento/TOKEN",
//   "customer_id": "uuid",
//   "quote_id": "uuid"
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { phone, name, customer_type, service_slug, email } = body

    // Validate required fields
    if (!phone || !name || !customer_type || !service_slug) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios: phone, name, customer_type, service_slug' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find service by slug
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, name, is_active')
      .eq('slug', service_slug)
      .single()

    if (svcErr || !service) {
      return new Response(
        JSON.stringify({ success: false, error: `Serviço "${service_slug}" não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!service.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço temporariamente indisponível' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize phone (ensure +55 prefix)
    let normalizedPhone = phone.replace(/\D/g, '')
    if (normalizedPhone.length === 11) {
      normalizedPhone = '55' + normalizedPhone
    } else if (normalizedPhone.length === 10) {
      normalizedPhone = '55' + normalizedPhone
    }

    // Check if customer exists by phone
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      // Update name if needed
      await supabase
        .from('customers')
        .update({ name, email: email || undefined, customer_type })
        .eq('id', customerId)
    } else {
      // Create new customer
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name,
          phone: normalizedPhone,
          email: email || null,
          customer_type,
          source: 'whatsapp',
        })
        .select('id')
        .single()

      if (custErr || !newCustomer) {
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar cliente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      customerId = newCustomer.id
    }

    // Create quote
    const { data: quote, error: quoteErr } = await supabase
      .from('quotes')
      .insert({
        customer_id: customerId,
        service_id: service.id,
        customer_type,
        status: 'pending',
      })
      .select('id, token')
      .single()

    if (quoteErr || !quote) {
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar orçamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get app URL from admin settings or env
    const appUrl = Deno.env.get('APP_URL') || 'https://petardo.vercel.app'
    const quoteUrl = `${appUrl}/orcamento/${quote.token}`

    return new Response(
      JSON.stringify({
        success: true,
        quote_url: quoteUrl,
        customer_id: customerId,
        quote_id: quote.id,
        service_name: service.name,
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
