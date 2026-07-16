// _shared/inbox.ts
// ================
// Camada canonica do inbox omnichannel (Master v7.4 §17).
// Toda mensagem — qualquer canal, qualquer direcao — passa por aqui:
//   1. resolve/cria a conversation (dedupe por agency+channel+phone)
//   2. cria/vincula lead no crm_contacts no primeiro inbound
//   3. insere a row em messages
//   4. atualiza preview/unread/last_message_at
//
// Usado por: whatsapp-webhook (inbound + auto-reply), whatsapp-send
// (outbound manual). Canais futuros (instagram, email) usam o MESMO helper.

// deno-lint-ignore-file no-explicit-any

export interface RecordMessageInput {
  supabase: any; // service-role client
  ownerUserId: string; // user da agencia (dono do canal)
  channel: "whatsapp" | "instagram" | "facebook" | "email" | "sms";
  direction: "inbound" | "outbound";
  contactPhone: string; // identificador do contato no canal
  contactName?: string | null;
  content: string;
  contentType?: string; // text | image | audio | ...
  externalId?: string | null; // wamid etc
  /** false pula a criacao de lead (ex: outbound pra numero novo). */
  createCrmLead?: boolean;
}

export interface RecordMessageResult {
  conversationId: string | null;
  /** ai_enabled da conversa — webhook usa pra decidir se o agente responde. */
  aiEnabled: boolean;
  crmContactId: string | null;
}

/** Resolve agency_profiles.id a partir do user (dono do canal). */
async function resolveAgencyId(supabase: any, ownerUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from("agency_profiles")
    .select("id")
    .eq("user_id", ownerUserId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Liga/desliga a IA de uma conversa (human takeover). Usado pela
 * coexistência do WhatsApp: quando o dono responde pelo celular, pausamos
 * o agente pra ele não responder por cima.
 */
export async function setConversationAi(
  supabase: any,
  ownerUserId: string,
  channel: string,
  contactPhone: string,
  enabled: boolean,
): Promise<void> {
  const agencyId = await resolveAgencyId(supabase, ownerUserId);
  if (!agencyId) return;
  await supabase
    .from("conversations")
    .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("agency_id", agencyId)
    .eq("channel", channel)
    .eq("contact_phone", contactPhone);
}

export async function recordInboxMessage(input: RecordMessageInput): Promise<RecordMessageResult> {
  const {
    supabase, ownerUserId, channel, direction,
    contactPhone, contactName, content, contentType = "text",
    externalId = null, createCrmLead = true,
  } = input;

  const fallback: RecordMessageResult = { conversationId: null, aiEnabled: true, crmContactId: null };
  try {
    const agencyId = await resolveAgencyId(supabase, ownerUserId);
    if (!agencyId) {
      console.warn(`[inbox] sem agency_profile pra user=${ownerUserId} — pulando conversations`);
      return fallback;
    }

    // ── 1) Conversa existente? (dedupe agency+channel+phone) ──
    const { data: existing } = await supabase
      .from("conversations")
      .select("id, ai_enabled, crm_contact_id, unread_count, contact_name")
      .eq("agency_id", agencyId)
      .eq("channel", channel)
      .eq("contact_phone", contactPhone)
      .maybeSingle();

    let conversationId: string | null = existing?.id ?? null;
    let aiEnabled: boolean = existing?.ai_enabled ?? true;
    let crmContactId: string | null = existing?.crm_contact_id ?? null;

    // ── 2) Lead no CRM (so no inbound, so se nao vinculado ainda) ──
    if (direction === "inbound" && !crmContactId && createCrmLead) {
      const { data: foundContact } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("phone", contactPhone)
        .maybeSingle();
      if (foundContact) {
        crmContactId = foundContact.id;
      } else {
        const { data: newContact, error: leadErr } = await supabase
          .from("crm_contacts")
          .insert({
            agency_id: agencyId,
            name: contactName || contactPhone,
            phone: contactPhone,
            stage_slug: "new",
            temperature: "warm",
            source: channel,
          })
          .select("id")
          .single();
        if (leadErr) console.error("[inbox] lead auto-create falhou:", leadErr);
        crmContactId = newContact?.id ?? null;
      }
    }

    const now = new Date().toISOString();
    const preview = content.slice(0, 140);

    // ── 3) Upsert da conversa ──
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          agency_id: agencyId,
          owner_user_id: ownerUserId,
          direction: "agency_inbound", // caixa da agencia (client_to_consumer vem na fase client-scoped)
          channel,
          contact_name: contactName || contactPhone,
          contact_phone: contactPhone,
          last_message_at: now,
          last_message_preview: preview,
          last_message_direction: direction,
          unread_count: direction === "inbound" ? 1 : 0,
          status: "open",
          crm_contact_id: crmContactId,
        })
        .select("id, ai_enabled")
        .single();
      if (convErr) {
        console.error("[inbox] conversation insert falhou:", convErr);
        return fallback;
      }
      conversationId = conv.id;
      aiEnabled = conv.ai_enabled ?? true;
    } else {
      const updates: Record<string, unknown> = {
        last_message_at: now,
        last_message_preview: preview,
        last_message_direction: direction,
        updated_at: now,
        status: "open",
      };
      if (direction === "inbound") {
        updates.unread_count = (existing?.unread_count ?? 0) + 1;
      }
      // Vincula lead se acabou de ser criado
      if (crmContactId && !existing?.crm_contact_id) {
        updates.crm_contact_id = crmContactId;
      }
      // Atualiza nome se antes era so o numero
      if (contactName && existing?.contact_name === contactPhone) {
        updates.contact_name = contactName;
      }
      await supabase.from("conversations").update(updates).eq("id", conversationId);
    }

    // ── 4) Mensagem ──
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      // role: consumer = quem mandou de fora; agent = resposta nossa (IA ou humano)
      role: direction === "inbound" ? "consumer" : "agent",
      content,
      content_type: contentType,
      external_id: externalId,
    });
    if (msgErr) console.error("[inbox] message insert falhou:", msgErr);

    return { conversationId, aiEnabled, crmContactId };
  } catch (e) {
    console.error("[inbox] recordInboxMessage error:", e);
    return fallback;
  }
}
