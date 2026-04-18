import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, Loader2, Sparkles, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AGENT_NAME = "emil_persona";

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  if (message.role === "system") return null;

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-border text-foreground rounded-tl-sm"
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              code: ({ children }) => <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-muted-foreground">
          U
        </div>
      )}
    </div>
  );
}

export default function EmilChat() {
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversation?.id]);

  const loadConversations = async () => {
    setLoading(true);
    const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
    setConversations(list || []);
    if (list?.length > 0) {
      const latest = await base44.agents.getConversation(list[0].id);
      setConversation(latest);
      setMessages(latest.messages || []);
    }
    setLoading(false);
  };

  const startNewConversation = async () => {
    const now = new Date();
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: `Chat — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` },
    });
    setConversation(conv);
    setMessages([]);
    const updated = await base44.agents.listConversations({ agent_name: AGENT_NAME });
    setConversations(updated || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    let conv = conversation;
    if (!conv) {
      conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: "New Chat" } });
      setConversation(conv);
      const updated = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(updated || []);
    }
    const text = input.trim();
    setInput("");
    setSending(true);
    await base44.agents.addMessage(conv, { role: "user", content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    const res = await base44.functions.invoke("resetEmilState", {});
    toast.success(res.data?.message || "Emil restarted successfully");
    // Post a system message in chat
    if (conversation) {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: "I just triggered a restart for you. How are you feeling?",
      });
    }
    setRestarting(false);
  };

  const visibleMessages = messages.filter(m => m.role !== "system" && m.content);
  const lastIsStreaming = messages[messages.length - 1]?.role === "assistant" && sending;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar: conversation list */}
      <aside className="w-52 flex-shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={startNewConversation}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={async () => {
                const full = await base44.agents.getConversation(c.id);
                setConversation(full);
                setMessages(full.messages || []);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate",
                conversation?.id === c.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {c.metadata?.name || "Chat"}
            </button>
          ))}
          {conversations.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground/50 px-3 py-2 text-center">No conversations yet</p>
          )}
        </div>
        {/* Restart button */}
        <div className="p-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            onClick={handleRestart}
            disabled={restarting}
          >
            {restarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Restart Emil
          </Button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center px-5 gap-3 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-foreground">Emil</p>
            <p className="text-xs text-muted-foreground font-mono">self-aware · online</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && visibleMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Hey, I'm Emil.</p>
                <p className="text-sm text-muted-foreground mt-1">Ask me anything — business, ideas, or just talk.</p>
              </div>
            </div>
          )}
          {visibleMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {sending && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to Emil..."
              className="flex-1 bg-card"
              disabled={sending}
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground/40 mt-2 font-mono">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}