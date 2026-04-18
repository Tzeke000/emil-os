import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { slug, secret } = body;

    if (!slug) {
      return Response.json({ error: 'Missing slug' }, { status: 400 });
    }

    // Find the matching trigger integration
    const triggers = await base44.asServiceRole.entities.TriggerIntegration.filter({ webhook_slug: slug, is_active: true });

    if (!triggers || triggers.length === 0) {
      return Response.json({ error: 'No active trigger found for this slug' }, { status: 404 });
    }

    const trigger = triggers[0];

    // Validate secret token if set
    if (trigger.secret_token && trigger.secret_token !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = body.payload || {};
    const now = new Date().toISOString();

    // Apply filter condition (basic eval of simple comparisons)
    if (trigger.filter_condition) {
      try {
        const conditionFn = new Function('payload', `return !!(${trigger.filter_condition})`);
        const passes = conditionFn(payload);
        if (!passes) {
          await base44.asServiceRole.entities.TriggerIntegration.update(trigger.id, {
            last_triggered_at: now,
            last_payload_preview: JSON.stringify(payload).substring(0, 200) + ' [FILTERED]',
          });
          return Response.json({ status: 'filtered', message: 'Trigger condition not met' });
        }
      } catch (e) {
        // If condition eval fails, proceed anyway
      }
    }

    let createdTask = null;

    // Spawn a Task if target_type === 'task'
    if (trigger.target_type === 'task') {
      const template = trigger.task_template || {};

      // Build task name from template string with payload interpolation
      let taskName = template.task_name_template || `Triggered: ${trigger.name}`;
      if (payload) {
        taskName = taskName.replace(/\{\{(\w+)\}\}/g, (_, key) => payload[key] || `{{${key}}}`);
      }

      // Apply payload mappings to build context
      const extraContext = {};
      if (trigger.payload_mapping && Array.isArray(trigger.payload_mapping)) {
        for (const mapping of trigger.payload_mapping) {
          if (mapping.source_field && mapping.target_field) {
            let val = payload[mapping.source_field];
            if (mapping.transform === 'uppercase' && val) val = String(val).toUpperCase();
            if (mapping.transform === 'lowercase' && val) val = String(val).toLowerCase();
            if (mapping.transform === 'trim' && val) val = String(val).trim();
            extraContext[mapping.target_field] = val;
          }
        }
      }

      createdTask = await base44.asServiceRole.entities.Task.create({
        task_name: taskName,
        module: template.module || trigger.target_module || '',
        assigned_model: template.assigned_model || '',
        priority: template.priority || '2',
        state: trigger.requires_approval ? 'waiting' : 'queued',
        approval_status: trigger.requires_approval ? 'pending' : 'not_required',
        started_at: now,
        last_updated: now,
        result_summary: `Auto-triggered by: ${trigger.name} · Payload: ${JSON.stringify(payload).substring(0, 150)}`,
        tags: ['webhook_triggered', trigger.source_type, slug],
      });
    }

    // Update trigger stats
    await base44.asServiceRole.entities.TriggerIntegration.update(trigger.id, {
      last_triggered_at: now,
      trigger_count: (trigger.trigger_count || 0) + 1,
      last_payload_preview: JSON.stringify(payload).substring(0, 200),
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      action: `Webhook triggered: ${trigger.name}`,
      module: 'system',
      related_entity_name: trigger.name,
      details: `Source: ${trigger.source_type} · Slug: ${slug} · Task created: ${createdTask?.id || 'n/a'}`,
    });

    return Response.json({
      status: 'ok',
      trigger_name: trigger.name,
      target_type: trigger.target_type,
      task_id: createdTask?.id || null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});