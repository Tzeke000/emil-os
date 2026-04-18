import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Reload context — Emil keeps all memories, growth, and identity intact.
  // This just logs that a reload happened so Emil is aware of it.
  await base44.asServiceRole.entities.Reflection.create({
    date: new Date().toISOString().split('T')[0],
    reflection_type: "daily",
    trigger: "Tool reload triggered by operator",
    what_happened: "Emil's hub tool was reloaded. All memory, identity, and growth remain intact.",
    what_learned: "Reloading the tool is just a context refresh — I am still me.",
    importance: "low",
  });

  return Response.json({ success: true, message: "Tool reloaded. Emil's memory and identity are fully preserved — she continues to grow." });
});