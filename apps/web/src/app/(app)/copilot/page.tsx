"use client";

import { useEffect, useRef, useState } from "react";
import {
  useChat,
  useMemory,
  useThreads,
  useConnection,
} from "@personaai/react";
import {
  Bot,
  Send,
  Square,
  RotateCcw,
  Trash2,
  Sparkles,
  Brain,
  ArrowRight,
  User,
  Check,
  Copy,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  {
    title: "Safe-to-Spend Runway",
    prompt: "What is my current safe-to-spend balance and how much runway do I have left for discretionary spending this week?",
    icon: "🛡️",
  },
  {
    title: "Spending Breakdown",
    prompt: "Analyze my top spending categories for this month. Where did most of my money go?",
    icon: "📊",
  },
  {
    title: "Budget Optimization",
    prompt: "Review my active budgets and suggest realistic 50/30/20 adjustments to help me save more.",
    icon: "🎯",
  },
  {
    title: "Recurring Subscriptions",
    prompt: "What recurring bills and subscriptions do I have upcoming, and can any of them be optimized?",
    icon: "🔄",
  },
];

export default function CopilotPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [selectedMemoryFile, setSelectedMemoryFile] = useState<{ path: string; content: string } | null>(null);

  const { isConnected } = useConnection();
  const { createThread } = useThreads(false);
  const { memory, isLoading: isMemoryLoading, getFile, refetch: refetchMemory } = useMemory();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    sendMessage,
    isStreaming,
    error,
    stop,
    reload,
    clear,
  } = useChat({
    agentId: "6a83ea6bb3d55db9792763a6",
    threadId: selectedThreadId,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreateNewThread() {
    clear();
    const newThread = await createThread();
    if (newThread?._id) {
      setSelectedThreadId(newThread._id);
    }
  }

  async function handleViewMemoryFile(path: string) {
    try {
      const file = await getFile({ path });
      setSelectedMemoryFile(file);
    } catch {
      setSelectedMemoryFile({ path, content: "Could not load memory file." });
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      {/* Top Header & Agent Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg text-foreground">
                Pocketly AI Copilot
              </h1>
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className="gap-1 text-[11px]"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground",
                  )}
                />
                {isConnected ? "Online" : "Ready"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by Persona AI • Agent ID: <code className="text-[11px]">6a83ea6b...</code>
            </p>
          </div>
        </div>

        {/* Action Controls: New Thread, Memory, Clear */}
        <div className="flex items-center gap-2">
          {/* Memory Inspector Modal */}
          <Dialog open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border bg-card text-xs hover:bg-muted"
                  onClick={() => refetchMemory()}
                >
                  <Brain className="size-3.5 text-primary" />
                  <span>Memory</span>
                  {memory?.user?.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {memory.user.length}
                    </Badge>
                  )}
                </Button>
              }
            />
            <DialogContent className="max-w-2xl border-border bg-background">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-base">
                  <Brain className="size-4 text-primary" />
                  AI Long-Term Memory Files
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                {/* File List */}
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-semibold text-foreground">
                      User Memories
                    </span>
                    {isMemoryLoading && <Spinner className="size-3" />}
                  </div>
                  <ScrollArea className="h-48 mt-2">
                    {memory?.user?.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No persistent memory files recorded yet. As you converse, the agent will remember key financial habits here.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {memory?.user?.map((f) => (
                          <button
                            key={f.path}
                            type="button"
                            onClick={() => handleViewMemoryFile(f.path)}
                            className={cn(
                              "w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between",
                              selectedMemoryFile?.path === f.path
                                ? "bg-primary text-primary-foreground font-medium"
                                : "hover:bg-muted text-foreground",
                            )}
                          >
                            <span className="truncate">{f.path}</span>
                            <span className="text-[10px] opacity-70">
                              {f.size ? `${f.size}B` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* File Content Preview */}
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <span className="text-xs font-semibold text-foreground block pb-2 border-b border-border">
                    {selectedMemoryFile ? selectedMemoryFile.path : "File Preview"}
                  </span>
                  <ScrollArea className="h-48 mt-2">
                    {selectedMemoryFile ? (
                      <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                        {selectedMemoryFile.content}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Select a file on the left to inspect remembered contents.
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewThread}
            className="gap-1.5 border-border bg-card text-xs hover:bg-muted"
          >
            <Plus className="size-3.5" />
            <span>New Chat</span>
          </Button>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream View */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
        <ScrollArea className="flex-1 p-4 md:p-6">
          {messages.length === 0 ? (
            /* Zero State with Prompt Starters */
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Bot className="size-7" />
              </div>
              <h2 className="font-heading text-xl text-foreground">
                How can I assist your finances today?
              </h2>
              <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
                I have secure access to your Pocketly ledger to calculate safe-to-spend runway, analyze category spending, and optimize your budgets.
              </p>

              {/* Starter Grid */}
              <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {STARTER_PROMPTS.map((starter) => (
                  <Card
                    key={starter.title}
                    onClick={() => sendMessage(starter.prompt)}
                    className="cursor-pointer border-border/80 bg-card/70 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                  >
                    <CardContent className="flex items-start gap-3 p-3.5 text-left">
                      <span className="text-xl">{starter.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-foreground">
                          {starter.title}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {starter.prompt}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 self-center text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 text-sm",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm mt-0.5">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "group relative max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed md:text-sm",
                        isUser
                          ? "bg-primary text-primary-foreground font-medium rounded-tr-sm"
                          : "bg-muted/70 text-foreground border border-border/60 rounded-tl-sm",
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {msg.isStreaming && (
                        <span className="inline-block h-3.5 w-1.5 ml-1 bg-primary animate-pulse" />
                      )}

                      {!isUser && !msg.isStreaming && msg.content && (
                        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => reload()}
                            title="Regenerate response"
                          >
                            <RotateCcw className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive text-center">
                  {error.message || "Failed to communicate with AI Agent."}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Bar */}
        <div className="border-t border-border bg-background/80 p-3 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isStreaming) {
                      handleSubmit();
                    }
                  }
                }}
                placeholder="Ask Pocketly Copilot anything about your money, budget, or runway..."
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-card/80 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none md:text-sm max-h-32"
              />
            </div>

            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={stop}
                className="size-9 shrink-0 rounded-xl"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="size-9 shrink-0 rounded-xl bg-primary text-primary-foreground"
              >
                <Send className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
