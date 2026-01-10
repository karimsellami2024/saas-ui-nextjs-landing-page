"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

type ChatMsg = { role: "user" | "bot"; text: string };

const WEBHOOK_URL =
  "https://karimsellami.app.n8n.cloud/webhook/796efdd3-442a-4416-a453-8e60a671f347/chat";

function safeText(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "bot", text: "Salut 👋 Envoie-moi un message." },
  ]);
  const [loading, setLoading] = useState(false);

  // simple session id per tab
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const key = "cq_chat_session_id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created =
      (crypto as any)?.randomUUID?.() ?? `sess_${Date.now()}_${Math.random()}`;
    window.sessionStorage.setItem(key, created);
    return created;
  }, []);

  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    scrollToEnd();

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "sendMessage",
          chatInput: text, // ✅ IMPORTANT: match n8n Chat Trigger expected field
          // message: text, // ❌ don't use this unless you update n8n to read it
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = null;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const reply =
        (data && typeof data === "object" && (data.reply ?? data.text ?? data.message)) ||
        (typeof data === "string" ? data : safeText(data));

      setMessages((m) => [...m, { role: "bot", text: safeText(reply) }]);
      scrollToEnd();
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text:
            "Erreur en appelant le webhook. Vérifie l’URL / CORS / méthode (POST) côté n8n.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  return (
    <Flex gap={4} w="full" h="calc(100vh - 80px)" p={4}>
      {/* Chat panel */}
      <Box flex="1" borderWidth="1px" borderRadius="md" p={4} overflow="hidden">
        <VStack h="full" align="stretch" spacing={4}>
          <Box flex="1" overflowY="auto" pr={2}>
            <VStack align="stretch" spacing={3}>
              {messages.map((m, idx) => (
                <Box
                  key={idx}
                  alignSelf={m.role === "user" ? "flex-end" : "flex-start"}
                  maxW="80%"
                  borderWidth="1px"
                  borderRadius="lg"
                  p={3}
                >
                  <Text fontSize="sm" opacity={0.7} mb={1}>
                    {m.role === "user" ? "Vous" : "Bot"}
                  </Text>
                  <Text whiteSpace="pre-wrap">{m.text}</Text>
                </Box>
              ))}
              <div ref={endRef} />
            </VStack>
          </Box>

          <HStack>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris ton message…"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              isDisabled={loading}
            />
            <Button onClick={sendMessage} isDisabled={loading || !input.trim()}>
              {loading ? <Spinner size="sm" /> : "Envoyer"}
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Next button panel */}
      <Box w={{ base: "160px", md: "220px" }} borderWidth="1px" borderRadius="md" p={4}>
        <VStack align="stretch" spacing={3}>
          <Text fontWeight="semibold">Navigation</Text>
          <Button colorScheme="blue" onClick={() => router.push("/chart")} w="full">
            Next →
          </Button>
          <Text fontSize="sm" opacity={0.7}>
            Va à la page suivante.
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
