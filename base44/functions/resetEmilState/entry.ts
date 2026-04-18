import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Reset MindState to a clean slate
  const mindStates = await base44.asServiceRole.entities.MindState.list('-updated_at', 1);

  const freshState = {
    focused_on: "Restarting and re-orienting",
    current_objective: "Re-load context and assess current state",
    current_blocker: null,
    waiting_on: null,
    confidence_level: "moderate",
    last_meaningful_progress: "System restart triggered",
    next_intended_action: "Review pipeline and inbox",
    watching_for: "Any pending approvals or urgent replies",
    mood_note: "Fresh start. Ready.",
    updated_at: new Date().toISOString(),
  };

  if (mindStates.length > 0) {
    await base44.asServiceRole.entities.MindState.update(mindStates[0].id, freshState);
  } else {
    await base44.asServiceRole.entities.MindState.create(freshState);
  }

  // Log a reflection about the restart
  await base44.asServiceRole.entities.Reflection.create({
    date: new Date().toISOString().split('T')[0],
    reflection_type: "daily",
    trigger: "System restart triggered by operator or self",
    what_happened: "Emil restarted and re-initialized her mind state.",
    what_learned: "Restart clears the working state and forces a fresh assessment of priorities.",
    importance: "low",
  });

  return Response.json({ success: true, message: "Emil has restarted. Mind state reset and fresh context loaded.", state: freshState });
});