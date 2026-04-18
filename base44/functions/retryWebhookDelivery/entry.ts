import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { delivery_id } = await req.json();
    if (!delivery_id) return Response.json({ error: 'delivery_id required' }, { status: 400 });

    // Fetch the original delivery record
    const deliveries = await base44.asServiceRole.entities.WebhookDelivery.filter({ id: delivery_id });
    const delivery = deliveries[0];
    if (!delivery) return Response.json({ error: 'Delivery not found' }, { status: 404 });

    // Mark as retry_pending
    await base44.asServiceRole.entities.WebhookDelivery.update(delivery_id, {
      delivery_status: 'retry_pending',
      retry_count: (delivery.retry_count || 0) + 1,
    });

    // Re-invoke the webhook trigger with the original payload
    let inboundPayload = {};
    try { inboundPayload = JSON.parse(delivery.inbound_payload || '{}'); } catch { /* pass */ }

    // Fetch the trigger to get secret
    const triggers = await base44.asServiceRole.entities.TriggerIntegration.filter({ id: delivery.trigger_id });
    const trigger = triggers[0];

    const result = await base44.asServiceRole.functions.invoke('webhookTrigger', {
      slug: delivery.webhook_slug,
      secret: trigger?.secret_token || '',
      payload: inboundPayload,
    });

    const responseBody = JSON.stringify(result?.data || result);

    // Update delivery record with retry result
    await base44.asServiceRole.entities.WebhookDelivery.update(delivery_id, {
      delivery_status: 'retried',
      response_body: responseBody,
      response_status: 200,
      error_message: null,
    });

    return Response.json({ success: true, response: result?.data || result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});