import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Zap, Brain, Users, Inbox, ShieldCheck, GitBranch, Layers, Cpu, Router, ListTodo, RefreshCw, Archive, Fingerprint, Heart, SlidersHorizontal, BookMarked, GitCommit, Terminal, Wand2, TrendingDown, Scissors, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "intro",
    icon: Brain,
    title: "What is Emil OS?",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    content: `Emil OS is your AI-powered sales operations platform. Emil acts as a fully autonomous (or semi-autonomous) sales agent that can find prospects, score them, send outreach, handle replies, and learn from experience — all while minimizing cost and maximizing results.

Emil OS is built around a few core principles:
• **Autonomy with oversight** — Emil works independently but escalates when needed.
• **Memory-first** — Every insight, preference, and pattern is stored and recalled.
• **Token efficiency** — Every prompt is optimized to reduce cost and latency.
• **Continuous improvement** — Reflections and evolution logs keep Emil getting better over time.`,
  },
  {
    id: "navigation",
    icon: BookOpen,
    title: "Navigation Overview",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    content: `Emil OS is organized into 5 sections in the sidebar:

**Emil** — Emil's internal state and identity
**Work** — The outward-facing sales operations
**Memory** — Long-term knowledge and context storage
**Efficiency** — Tools to reduce cost and optimize prompts
**System** — Low-level infrastructure and automation wiring`,
  },
  {
    id: "emil",
    icon: Fingerprint,
    title: "Emil Section",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    subsections: [
      {
        title: "Today (Dashboard)",
        icon: Zap,
        text: "Your command center. Shows Emil's Next Best Action, mind state, pending items (replies, approvals, follow-ups), agent health charts, and a live evolution timeline. Start here every session.",
      },
      {
        title: "Mind State",
        icon: Brain,
        text: "Tracks what Emil is currently focused on, blockers, confidence level, and intended next action. Update this when Emil's priorities shift so context is always fresh.",
      },
      {
        title: "Reflections",
        icon: BookMarked,
        text: "Emil's learning journal. Log what happened, what worked, what failed, and what to change. These accumulate into Emil's wisdom over time. Use type=failure for critical lessons.",
      },
      {
        title: "Identity Core",
        icon: Fingerprint,
        text: "Defines who Emil is: mission, values, communication style, role boundaries. Edit these to tune Emil's personality and decision-making framework.",
      },
      {
        title: "Relationship",
        icon: Heart,
        text: "Stores your personal working relationship with Emil — tone preferences, autonomy level, escalation rules, and recurring priorities. Emil uses this to adapt how it communicates with you.",
      },
      {
        title: "Preferences",
        icon: SlidersHorizontal,
        text: "Granular behavioral rules (e.g. 'always use bullet points', 'never send on weekends'). Organized by category with strength ratings so Emil knows when rules are absolute vs flexible.",
      },
    ],
  },
  {
    id: "work",
    icon: Users,
    title: "Work Section",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    subsections: [
      {
        title: "Prospects",
        icon: Users,
        text: "The full prospect pipeline. Add businesses manually or via webhook. Each prospect moves through: found → scored → ready_for_outreach → contacted → follow_up_due → replied → interested → closed. Use the pipeline bar to filter by stage. Click a prospect to see full detail and outreach history.",
      },
      {
        title: "Inbox",
        icon: Inbox,
        text: "All inbound replies from prospects. Emil auto-classifies them (interested, objection, spam, etc.) and suggests a response. Review, edit, and mark as responded. Escalated replies block the queue until reviewed.",
      },
      {
        title: "Approvals",
        icon: ShieldCheck,
        text: "When Emil wants to take a risky action (send a high-value message, change pricing, etc.) it queues an approval. Review and approve/deny here. Pending approvals block related automation.",
      },
      {
        title: "Templates",
        icon: BookOpen,
        text: "Pre-built outreach scripts for cold email, SMS, follow-up, objection handling, and more. Each template has variables (e.g. {{business_name}}) and performance tracking. Approve templates before Emil can use them.",
      },
      {
        title: "Playbooks",
        icon: GitBranch,
        text: "Decision rules that tell Emil how to behave in specific situations — when to follow up, how to score, when to escalate, how to respond to objections. Each playbook has a trigger condition, steps, and priority.",
      },
    ],
  },
  {
    id: "memory",
    icon: Brain,
    title: "Memory Section",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    subsections: [
      {
        title: "Active Memory",
        icon: Zap,
        text: "The working memory Emil actively loads into context. Keep this lean — only the most critical, current truths. Old or redundant records should be archived or migrated.",
      },
      {
        title: "Memory Browser",
        icon: BookOpen,
        text: "Full archive browser. Search, filter by type/importance/category. Use this to audit what Emil knows and find outdated records that should be updated or removed.",
      },
      {
        title: "Memory Migration",
        icon: GitBranch,
        text: "When upgrading Emil or changing context structure, use this to review old memory records and decide where they belong: active memory, soul file, playbook, identity, or archive-only.",
      },
      {
        title: "Truth Sync",
        icon: RefreshCw,
        text: "Tracks master 'truth files' (soul, identity, current_state, playbook index). Shows sync status and lets you push/pull changes. Resolve conflicts before running Emil in production.",
      },
      {
        title: "Archive",
        icon: Archive,
        text: "Read-only historical memory. Useful for audit trails, understanding past decisions, and recovering deleted records.",
      },
    ],
  },
  {
    id: "efficiency",
    icon: Zap,
    title: "Efficiency Section",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    subsections: [
      {
        title: "Prompt Optimizer",
        icon: Wand2,
        text: "Paste any prompt and get an AI-rewritten version that achieves the same result with fewer tokens. Shows token reduction estimate and a before/after diff. Use on your most-used prompts first.",
      },
      {
        title: "Token Waste Log",
        icon: TrendingDown,
        text: "Scans RuntimeLogs for high-token entries and ranks them by waste. Click any entry to get an AI-suggested fix. Track resolved vs unresolved waste over time.",
      },
      {
        title: "Context Trim Advisor",
        icon: Scissors,
        text: "Analyzes your active memory records and scores each one for redundancy, staleness, and token weight. Provides compression recommendations. Use monthly to keep context lean.",
      },
      {
        title: "Playbook Expander",
        icon: GitBranch,
        text: "Turn vague instructions into structured, step-by-step execution rules. Paste a rough idea and get a fully-formed playbook with trigger conditions, steps, and edge cases.",
      },
      {
        title: "Task Batcher",
        icon: Layers,
        text: "Group similar tasks (score 10 prospects, classify 5 replies) into a single LLM call. Dramatically reduces per-task overhead. Select items, run batch, review results, apply with one click.",
      },
    ],
  },
  {
    id: "system",
    icon: Cpu,
    title: "System Section",
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-border",
    subsections: [
      {
        title: "Tasks",
        icon: ListTodo,
        text: "Emil's task queue. Each task has a state (queued, running, blocked, escalated, done). Tasks are created by triggers, playbooks, or manually. Monitor running tasks and unblock stuck ones here.",
      },
      {
        title: "Workbench",
        icon: Zap,
        text: "System improvement proposals. Emil (or you) can log a problem noticed, propose a fix, estimate token savings, and track implementation status. Approved proposals become real changes.",
      },
      {
        title: "Modules",
        icon: Cpu,
        text: "Emil's execution units. Each module has a name, assigned LLM model, token budget, allowed tools, and priority. Modules are the building blocks that tasks run through.",
      },
      {
        title: "Model Router",
        icon: Router,
        text: "Assigns which Ollama model handles which module. Set fallbacks and escalation rules. Enables token-saving mode for low-stakes tasks (e.g. use a smaller model for basic scoring).",
      },
      {
        title: "Evolution Log",
        icon: GitCommit,
        text: "An immutable audit trail of every structural change made to Emil OS — pages added, fields changed, rules updated. Use this to roll back mistakes or understand how the system evolved.",
      },
      {
        title: "Triggers",
        icon: Zap,
        text: "Incoming webhook integrations. Connect Zapier, Make, Typeform, email providers, etc. Each trigger has a slug, optional secret, payload mapping, and spawns a task or invokes a module. Use the Delivery Log tab to debug failed payloads.",
      },
      {
        title: "Logs",
        icon: Terminal,
        text: "Real-time runtime logs from all Emil subsystems. Filter by level (error/warning/info/debug) and source. Export logs for external analysis. Use the error spike detector on the Dashboard to find problems fast.",
      },
      {
        title: "Settings",
        icon: SlidersHorizontal,
        text: "Core configuration: agent name, default niche/offer, pricing, daily prospect/outreach targets, automation mode toggle, approval thresholds, and model routing notes.",
      },
    ],
  },
  {
    id: "bestpractices",
    icon: GitCommit,
    title: "Best Practices",
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/20",
    content: `**Daily Workflow:**
1. Open Dashboard → review Next Best Action
2. Check Inbox → process any new replies
3. Check Approvals → unblock the queue
4. Run Task Batcher → score new prospects in bulk
5. Check Mind State → update if priorities have shifted
6. Review Agent Health chart → investigate error spikes

**Weekly:**
• Run Context Trim Advisor to prune stale memory
• Add at least one Reflection (what worked / what failed this week)
• Review Evolution Log for unintended drift
• Run Prompt Optimizer on your 3 most-used prompts

**Before major changes:**
• Log an EvolutionLog entry first
• Use Workbench proposals for anything structural
• Test triggers in the Delivery Log before going live

**Token cost tips:**
• Use Task Batcher for any operation involving 3+ similar items
• Keep Active Memory under 15 records
• Assign small models (e.g. llama3.1:8b) for scoring tasks, reserve larger models for reply generation
• Use token-saving mode in Model Router for low-stakes modules`,
  },
  {
    id: "glossary",
    icon: BookOpen,
    title: "Glossary",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    content: `**Module** — A named execution unit with an assigned model, token budget, and tool access. Tasks run through modules.

**Playbook** — A set of conditional decision rules that Emil follows automatically when a trigger condition is met.

**Memory Record** — A persistent piece of knowledge Emil loads into context. Categorized, weighted by importance, and subject to expiry.

**Truth File** — A canonical master file (soul, identity, current_state, etc.) that defines Emil's core operating parameters.

**Trigger** — An inbound webhook that spawns a task or invokes a module when an external event occurs (e.g. form submission).

**Mind State** — Emil's current internal status: what it's focused on, what's blocking it, and what it intends to do next.

**Approval** — A paused action waiting for human confirmation before Emil proceeds.

**Evolution Log** — An immutable audit trail of structural changes to Emil OS.

**NBA (Next Best Action)** — The highest-priority action Emil recommends you take right now, shown at the top of the Dashboard.

**Token Budget** — The maximum tokens a module is allowed to use per invocation. Enforced to prevent runaway costs.

**Batch** — A group of similar tasks processed in a single LLM call via the Task Batcher to reduce per-call overhead.`,
  },
];

function CollapsibleSection({ section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className={cn("border rounded-xl overflow-hidden", section.bg || "bg-card border-border")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("w-5 h-5 flex-shrink-0", section.color)} />
          <span className="font-semibold text-foreground">{section.title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10">
          {section.content && (
            <div className="pt-4">
              <MarkdownText text={section.content} />
            </div>
          )}
          {section.subsections?.map(sub => {
            const SubIcon = sub.icon;
            return (
              <div key={sub.title} className="pt-3 border-t border-white/5 first:border-0 first:pt-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <SubIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{sub.title}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-5">{sub.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarkdownText({ text }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith("•")) {
          return (
            <div key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^• /, '') }} />
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      })}
    </div>
  );
}

export default function ReadMe() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Documentation</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Emil OS — README</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Everything Emil needs to know to operate effectively. Click any section to expand.
      </p>

      <div className="space-y-3">
        {SECTIONS.map(section => (
          <CollapsibleSection key={section.id} section={section} />
        ))}
      </div>

      <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
        <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1.5">Quick Reference</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground font-mono">
          <span>Dashboard → <strong className="text-foreground">Today's action</strong></span>
          <span>Inbox → <strong className="text-foreground">Process replies</strong></span>
          <span>Approvals → <strong className="text-foreground">Unblock queue</strong></span>
          <span>Task Batcher → <strong className="text-foreground">Bulk operations</strong></span>
          <span>Context Trim → <strong className="text-foreground">Monthly memory pruning</strong></span>
          <span>Prompt Optimizer → <strong className="text-foreground">Reduce token cost</strong></span>
          <span>Evolution Log → <strong className="text-foreground">Audit all changes</strong></span>
          <span>Triggers → <strong className="text-foreground">External integrations</strong></span>
        </div>
      </div>
    </div>
  );
}