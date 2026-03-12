"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDeals, useNegotiations } from "@/hooks/use-data";
import {
  MessageSquare,
  Send,
  Sparkles,
  BarChart3,
  Users,
  FileText,
  Lightbulb,
  TrendingUp,
  Bot,
  User,
  Copy,
  ThumbsUp,
  RotateCcw,
  Loader2,
  Zap,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  {
    icon: <BarChart3 className="h-4 w-4" />,
    title: "Benchmark my deal",
    prompt: "How does my latest ADC deal compare to recent precedent transactions in oncology?",
    color: "#3B82F6",
  },
  {
    icon: <Users className="h-4 w-4" />,
    title: "Find partners",
    prompt: "Which pharma companies are most active in licensing ADC assets for oncology indications?",
    color: "#10B981",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    title: "Analyze terms",
    prompt: "What are typical royalty rates for Phase 2 oncology assets in recent out-licensing deals?",
    color: "#F97316",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Market trends",
    prompt: "What are the major trends in biotech licensing deals over the past 12 months?",
    color: "#8B5CF6",
  },
];

// Simulated AI responses for demo
function getAIResponse(prompt: string, dealCount: number): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("benchmark") || lower.includes("compare")) {
    return `Based on ${dealCount} precedent transactions in our database, here's how your deal compares:\n\n**Upfront Payment**: Your proposed $150M upfront is at the 65th percentile. The median for similar-stage ADC assets is $120M.\n\n**Royalty Range**: 8-12% is within market range. Median is 7-14% for Phase 2 oncology ADCs.\n\n**Total Deal Value**: At $2.1B total, this is above the 75th percentile ($1.8B median).\n\n**Recommendation**: The upfront is competitive. Consider negotiating development milestones higher — recent deals show 35-40% of total value in dev milestones vs. your current 28%.`;
  }
  if (lower.includes("partner") || lower.includes("pharma")) {
    return `Based on recent deal activity and therapeutic focus alignment, here are the top partner matches:\n\n1. **Roche/Genentech** — 95% fit score. 12 ADC deals in 3 years, strong oncology pipeline. Currently seeking Phase 2 assets.\n\n2. **AstraZeneca** — 91% fit score. Acquired Daiichi Sankyo ADC partnership. Active BD team for oncology.\n\n3. **Pfizer** — 88% fit score. Seagen acquisition shows ADC commitment. Large upfront capacity.\n\n4. **Gilead Sciences** — 82% fit score. Expanding oncology through BD. Recent ADC interest.\n\nWould you like me to draft an outreach strategy for any of these partners?`;
  }
  if (lower.includes("royalt") || lower.includes("terms") || lower.includes("rate")) {
    return `Here's the royalty landscape for Phase 2 oncology assets:\n\n**Typical Ranges by Modality:**\n- ADCs: 8-15% (escalating tiers common)\n- mAbs: 6-12%\n- Small Molecules: 5-10%\n- Gene Therapy: 10-20%\n\n**Key Factors Affecting Rates:**\n- Stage advancement commands +2-3% premium\n- Exclusive territories justify higher base\n- Co-development rights typically reduce royalty by 1-3%\n\n**Recent Benchmarks (2024-2025):**\n- Median low: 7.5%\n- Median high: 13.0%\n- 75th percentile high: 16.0%`;
  }
  if (lower.includes("trend") || lower.includes("market")) {
    return `**Key Biotech Licensing Trends (Last 12 Months):**\n\n1. **ADC deals surging** — 40% YoY increase. Average upfronts reached $200M+ for late-stage assets.\n\n2. **Oncology dominance** — 65% of all licensing deals. Immunology growing as #2.\n\n3. **Larger upfronts** — Median upfront increased 25% YoY as competition for assets intensified.\n\n4. **Asia-Pacific expansion** — China/Japan licensing deals up 60%. Territory splits becoming more nuanced.\n\n5. **Option deals growing** — 30% of recent deals include opt-in structures vs. traditional upfront licenses.\n\n6. **Royalty compression** — Increasing competition pushing royalty floors lower, but ceiling rates remain strong for differentiated assets.`;
  }
  return `I've analyzed your question against our database of ${dealCount} deals and market intelligence.\n\nThis is a complex topic that touches on several areas of deal structuring. Let me break it down:\n\n**Key Insights:**\n- Market conditions are favorable for licensors in your therapeutic area\n- Recent comparable deals suggest strong negotiating position\n- Partner interest level appears high based on current BD activity\n\nWould you like me to dive deeper into any specific aspect? I can provide detailed benchmarking data, partner analysis, or term sheet recommendations.`;
}

export default function AICompanionPage() {
  const { deals } = useDeals();
  const { negotiations } = useNegotiations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: getAIResponse(text, deals.length),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg shadow-[#F97316]/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1A1A2E]">AI Deal Companion</h1>
            <p className="text-xs text-muted-foreground">
              Powered by Deal Twin Engine &middot; {deals.length} deals &middot; {negotiations.length} negotiations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-6 gap-1 font-normal">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Online
          </Badge>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border/40 bg-white shadow-sm">
        {isEmpty ? (
          /* Empty state with suggestions */
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316]/10 to-[#F59E0B]/10 mb-6">
              <MessageSquare className="h-8 w-8 text-[#F97316]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A2E]">How can I help with your deal?</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              Ask me anything about deal benchmarking, partner matching, term analysis, or market trends.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 mt-8 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <button
                  key={suggestion.title}
                  onClick={() => sendMessage(suggestion.prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-border/40 bg-[#FAFAFA] p-4 text-left transition-all hover:border-[#F97316]/30 hover:bg-[#FFF7ED] hover:shadow-sm"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                    style={{ backgroundColor: `${suggestion.color}10`, color: suggestion.color }}
                  >
                    {suggestion.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1A2E] group-hover:text-[#F97316] transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {suggestion.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-8 text-[11px] text-muted-foreground/50">
              <Lightbulb className="h-3 w-3" />
              <span>Tip: Ask about specific therapeutic areas, modalities, or deal types for more targeted insights</span>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[#F97316] text-white"
                      : "bg-[#F8F9FA] text-[#1A1A2E]"
                  }`}
                >
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {msg.content.split("\n").map((line, i) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={i} className="font-semibold mt-2 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
                      }
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        return <p key={i} className="ml-3">&bull; {line.slice(2)}</p>;
                      }
                      if (line.match(/^\d+\.\s/)) {
                        return <p key={i} className="ml-1">{line}</p>;
                      }
                      // Handle inline bold
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={i} className={line === "" ? "h-2" : ""}>
                          {parts.map((part, j) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <strong key={j}>{part.replace(/\*\*/g, "")}</strong>
                            ) : (
                              <span key={j}>{part}</span>
                            )
                          )}
                        </p>
                      );
                    })}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/20">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="h-3 w-3 mr-1" /> Helpful
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E] shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-[#F8F9FA] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
                    <span>Analyzing deal data...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mt-3 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border/40 bg-white p-2 shadow-sm focus-within:border-[#F97316]/40 focus-within:ring-1 focus-within:ring-[#F97316]/20 transition-all">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about deals, benchmarks, partners, or market trends..."
            className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-9 w-9 p-0 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
          AI Companion uses your deal database and market intelligence to provide insights. Not financial advice.
        </p>
      </div>
    </div>
  );
}
