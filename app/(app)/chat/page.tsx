"use client";

import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const [messages, setMessages] = useState<{id: string, role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อ (HTTP " + response.status + ")");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      const aiMsgId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "" }]);

      let done = false;
      let finalContent = "";
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          finalContent += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.id === aiMsgId) {
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
            }
            return prev;
          });
        }
      }

      if (!finalContent) {
        throw new Error("AI เซิร์ฟเวอร์ไม่ตอบสนอง (อาจเป็นเพราะ API Key หมดโควต้า หรือเซิร์ฟเวอร์ทำงานหนักเกินไป)");
      }

    } catch (err) {
      console.error("Stream error:", err);
      setError(err instanceof Error ? err : new Error("An error occurred"));
      // Remove empty ai message if it failed
      setMessages(prev => prev.filter(m => m.content !== "" || m.role === "user"));
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          ผู้ช่วยการเงิน AI
        </h1>
        <p className="text-sm text-muted-foreground">
          ถาม-ตอบ ทุกเรื่องรายรับรายจ่ายของร้านคุณ
        </p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border-primary/20">
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground mt-10">
              <Bot className="h-12 w-12 text-primary/40" />
              <p>ลองถามคำถาม เช่น:<br/>"เดือนนี้ค่าใช้จ่ายอะไรเยอะสุด?"<br/>"สรุปยอดขายวันศุกร์ให้หน่อย"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[85%] text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-3 mb-2 rounded-lg p-3 bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
            เกิดข้อผิดพลาด: {error.message || "ไม่สามารถเชื่อมต่อกับ AI ได้"}
          </div>
        )}

        <div className="p-3 border-t bg-card">
          <form
            onSubmit={handleSubmit}
            className="flex w-full items-center space-x-2"
          >
            <Input
              type="text"
              placeholder="พิมพ์คำถามของคุณที่นี่..."
              value={input || ""}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input?.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">ส่ง</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
