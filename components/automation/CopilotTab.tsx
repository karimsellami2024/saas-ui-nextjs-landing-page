"use client";

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  Box, Button, Flex, HStack, Text, Textarea, VStack,
} from "@chakra-ui/react";
import type { CategoryProgress } from "./PipelineProgress";

// ─── Brand palette (mirrors EmissionsDashboard) ───────────────────────────────
const P = {
  brand:  "#344E41",
  accent: "#588157",
  light:  "#A3B18A",
  soft:   "#DDE5E0",
  bg:     "#F5F6F4",
  muted:  "#6B7A72",
  white:  "#FFFFFF",
  dark:   "#1B2E25",
};

const SRC_COLOR: Record<string, string> = {
  electricity: "#4299E1",
  fuel:        "#ED8936",
  natural_gas: "#E53E3E",
  refrigerant: "#9B2C2C",
  fleet:       "#48BB78",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id:         string;
  role:       "user" | "agent" | "system";
  text:       string;
  ts:         Date;
  answerType?: string;
  results?:   any;
  error?:     boolean;
}

export interface CopilotTabProps {
  categories:   CategoryProgress[];
  grandTotal:   number;
  userId?:      string | null;
  companyId?:   string | null;
  companyName?: string | null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function fmt4(v: number): string {
  return v.toLocaleString("fr-CA", {
    minimumFractionDigits: 4, maximumFractionDigits: 4,
  });
}

function pct(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "0%";
}

// Build a compact context prefix injected into the first user message of the session
function buildContextPrefix(cats: CategoryProgress[], total: number): string {
  const active = cats.filter(c => c.ges_total > 0);
  const parts  = active.map(
    c => `${c.label} ${fmt4(c.ges_total)} tCO₂e (${pct(c.ges_total, total)})`
  );
  return (
    `[Contexte bilan annuel — Total: ${fmt4(total)} tCO₂e` +
    (parts.length ? ` | ${parts.join(" | ")}` : "") +
    `]\n\n`
  );
}

// ─── Markdown-like text renderer ──────────────────────────────────────────────
// Handles: **bold**, *italic*, ### headings, - bullets, numbered lists, blank lines
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!listBuf.length) return;
    const items = listBuf.map((l, i) => (
      <Box
        key={i} as="li" fontSize="sm" color={P.dark} lineHeight={1.7}
        pl={1} style={{ listStyleType: listType === "ul" ? "disc" : "decimal" }}
      >
        <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(l) }} />
      </Box>
    ));
    nodes.push(
      <Box
        key={`list-${nodes.length}`}
        as={listType === "ul" ? "ul" : "ol"}
        pl={5} mb={2}
      >
        {items}
      </Box>
    );
    listBuf = [];
    listType = null;
  }

  function inlineMarkdown(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,    "<em>$1</em>")
      .replace(/`(.+?)`/g,      "<code style=\"background:#EDF2F7;padding:1px 4px;border-radius:3px;font-size:12px\">$1</code>");
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Heading
    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      const content = trimmed.replace(/^#{1,3}\s+/, "");
      nodes.push(
        <Text
          key={`h-${i}`} fontSize="sm" fontWeight="bold"
          color={P.brand} mt={3} mb={1}
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }}
        />
      );
      continue;
    }

    // Bullet list (- or • or *)
    const ulMatch = trimmed.match(/^[-•*]\s+(.*)/);
    if (ulMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      listBuf.push(ulMatch[1]);
      continue;
    }

    // Numbered list
    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
    if (olMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      listBuf.push(olMatch[1]);
      continue;
    }

    // Empty line → flush list + paragraph break
    if (!trimmed) {
      flushList();
      nodes.push(<Box key={`br-${i}`} h={2} />);
      continue;
    }

    // Normal paragraph
    flushList();
    nodes.push(
      <Text
        key={`p-${i}`} fontSize="sm" color={P.dark} lineHeight={1.7}
        dangerouslySetInnerHTML={{ __html: inlineMarkdown(trimmed) }}
      />
    );
  }
  flushList();
  return <Box>{nodes}</Box>;
}

// ─── Structured results cards (rendered below agent text when data is present) ──
function ResultsCard({ results }: { results: any }) {
  if (!results || typeof results !== "object") return null;

  const answerType = results.answer_type ?? "";

  // ── Comparison result ──
  if (
    answerType === "comparison" &&
    results.results &&
    Array.isArray(results.results.records)
  ) {
    const rows: any[] = results.results.records;
    return (
      <Box
        mt={3} bg={P.bg} borderRadius="xl"
        borderWidth="1px" borderColor={P.soft} overflow="hidden"
      >
        <Box px={4} py={2} bg={P.soft}>
          <Text fontSize="xs" fontWeight="bold" color={P.brand}>
            📊 Comparaison détaillée
          </Text>
        </Box>
        <Box overflowX="auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: P.bg }}>
                {["Source", "tCO₂e", "Δ vs précédent", "Tendance"].map(h => (
                  <th key={h}
                    style={{ padding: "6px 10px", textAlign: "left",
                      borderBottom: `1px solid ${P.soft}`, color: P.muted, fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${P.soft}` }}>
                  <td style={{ padding: "6px 10px", color: P.dark, fontWeight: 500 }}>
                    {r.bill_type ?? r.source ?? "—"}
                  </td>
                  <td style={{ padding: "6px 10px", color: P.accent, fontWeight: 600 }}>
                    {r.total_ges_tco2e != null
                      ? r.total_ges_tco2e.toFixed(4)
                      : "—"}
                  </td>
                  <td style={{ padding: "6px 10px",
                    color: r.pct_change > 0 ? "#C53030" : r.pct_change < 0 ? "#276749" : P.muted }}>
                    {r.pct_change != null
                      ? `${r.pct_change > 0 ? "+" : ""}${r.pct_change.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    {r.direction === "up"   ? "🔺 Hausse"
                     : r.direction === "down" ? "🔻 Baisse"
                     : "➡️ Stable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    );
  }

  // ── Anomaly result ──
  if (answerType === "anomaly" && results.results) {
    const r = results.results;
    const status: string = r.status ?? "normal";
    const CFG: Record<string, { bg: string; border: string; color: string; label: string }> = {
      anomaly: { bg: "#FFF5F5", border: "#FC8181", color: "#C53030", label: "🚨 Anomalie détectée" },
      warning: { bg: "#FFFBEB", border: "#F6AD55", color: "#C05621", label: "⚠️ Avertissement"    },
      normal:  { bg: "#F0FFF4", border: "#68D391", color: "#276749", label: "✅ Valeur normale"    },
    };
    const cfg = CFG[status] ?? CFG.normal;
    return (
      <Box
        mt={3} bg={cfg.bg} borderRadius="xl"
        borderWidth="1px" borderColor={cfg.border} px={4} py={3}
      >
        <HStack mb={2} justify="space-between">
          <Text fontSize="xs" fontWeight="bold" color={cfg.color}>{cfg.label}</Text>
          {r.z_score != null && (
            <Text fontSize="xs" color={P.muted}>
              Score Z : <strong>{r.z_score.toFixed(2)}</strong>
            </Text>
          )}
        </HStack>
        <Flex gap={4} flexWrap="wrap">
          {[
            { label: "Valeur actuelle", val: r.current_value != null ? `${r.current_value.toFixed(4)} tCO₂e` : "—" },
            { label: "Moyenne",         val: r.mean          != null ? `${r.mean.toFixed(4)} tCO₂e`          : "—" },
            { label: "Écart type",      val: r.std           != null ? `${r.std.toFixed(4)} tCO₂e`           : "—" },
          ].map(item => (
            <Box key={item.label} textAlign="center" minW="90px">
              <Text fontSize="10px" color={P.muted}>{item.label}</Text>
              <Text fontSize="xs" fontWeight="bold" color={cfg.color}>{item.val}</Text>
            </Box>
          ))}
        </Flex>
        {r.interpretation && (
          <Text fontSize="xs" color={P.muted} mt={2} lineHeight={1.6}>
            {r.interpretation}
          </Text>
        )}
      </Box>
    );
  }

  // ── Benchmark result ──
  if (answerType === "benchmark" && results.results) {
    const r = results.results;
    const vals: { label: string; val: number; highlight: boolean }[] = [];
    if (r.sector_avg    != null) vals.push({ label: "Moy. sectorielle", val: r.sector_avg,    highlight: false });
    if (r.province_avg  != null) vals.push({ label: "Moy. province",    val: r.province_avg,  highlight: false });
    if (r.your_value    != null) vals.push({ label: "Votre bilan",       val: r.your_value,    highlight: true  });
    if (!vals.length) return null;
    const maxVal = Math.max(...vals.map(v => v.val), 1);
    return (
      <Box
        mt={3} bg={P.bg} borderRadius="xl"
        borderWidth="1px" borderColor={P.soft} px={4} py={3}
      >
        <Text fontSize="xs" fontWeight="bold" color={P.brand} mb={3}>
          📊 Benchmark sectoriel
        </Text>
        <VStack align="stretch" spacing={3}>
          {vals.map((row, i) => (
            <HStack key={i} spacing={3}>
              <Text
                fontSize="xs" w="150px" flexShrink={0}
                color={row.highlight ? P.brand : P.muted}
                fontWeight={row.highlight ? "bold" : "normal"}
              >
                {row.label}
              </Text>
              <Box
                flex={1} bg={P.soft} borderRadius="full"
                h={row.highlight ? "10px" : "6px"} overflow="hidden"
              >
                <Box
                  h="100%" borderRadius="full"
                  bg={row.highlight ? P.accent : P.light}
                  w={`${Math.min((row.val / maxVal) * 100, 100)}%`}
                  style={{ transition: "width 1s ease" }}
                />
              </Box>
              <Text
                fontSize="xs" w="80px" textAlign="right"
                fontWeight={row.highlight ? "bold" : "normal"}
                color={row.highlight ? P.accent : P.muted}
              >
                {row.val.toFixed(4)} t
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>
    );
  }

  // ── Assumptions / missing fields ──
  const assumptions: string[] = Array.isArray(results.assumptions) ? results.assumptions : [];
  const missing: string[]     = Array.isArray(results.missing_fields) ? results.missing_fields : [];
  if (!assumptions.length && !missing.length) return null;

  return (
    <Box
      mt={3} bg="#FFFFF0" borderRadius="xl"
      borderWidth="1px" borderColor="#ECC94B" px={4} py={3}
    >
      {assumptions.length > 0 && (
        <>
          <Text fontSize="xs" fontWeight="bold" color="#744210" mb={1}>
            💡 Hypothèses utilisées
          </Text>
          {assumptions.map((a, i) => (
            <Text key={i} fontSize="xs" color="#744210" lineHeight={1.6}>• {a}</Text>
          ))}
        </>
      )}
      {missing.length > 0 && (
        <>
          <Text fontSize="xs" fontWeight="bold" color="#744210" mt={2} mb={1}>
            ⚠️ Données manquantes
          </Text>
          {missing.map((m, i) => (
            <Text key={i} fontSize="xs" color="#744210" lineHeight={1.6}>• {m}</Text>
          ))}
        </>
      )}
    </Box>
  );
}

// ─── Typing indicator (3 bouncing dots) ───────────────────────────────────────
function TypingIndicator() {
  return (
    <Flex align="flex-end" gap={3} px={4} py={2}>
      {/* Avatar */}
      <Flex
        w={8} h={8} flexShrink={0} borderRadius="full"
        bg={P.brand} align="center" justify="center"
      >
        <Text fontSize="xs" color="white">🤖</Text>
      </Flex>
      <Box
        bg={P.white} borderRadius="2xl" borderBottomLeftRadius="sm"
        borderWidth="1px" borderColor={P.soft} px={4} py={3}
      >
        <style>{`
          @keyframes copilot-bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30%            { transform: translateY(-6px); }
          }
        `}</style>
        <HStack spacing={1} h={4} align="center">
          {[0, 1, 2].map(i => (
            <Box
              key={i} w="7px" h="7px" borderRadius="full" bg={P.accent}
              style={{
                animation: `copilot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </HStack>
      </Box>
    </Flex>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const timeStr = msg.ts.toLocaleTimeString("fr-CA", {
    hour: "2-digit", minute: "2-digit",
  });

  // ── System / welcome ──
  if (msg.role === "system") {
    return (
      <Box px={4} py={3}>
        <Box
          bg="linear-gradient(135deg, #344E41 0%, #588157 100%)"
          borderRadius="2xl" px={5} py={4}
        >
          <HStack mb={2} spacing={2}>
            <Text fontSize="lg">🤖</Text>
            <Text fontSize="sm" fontWeight="bold" color="white">
              Copilote GES
            </Text>
            <Box
              bg="rgba(255,255,255,0.2)" px={2} py="1px"
              borderRadius="full" fontSize="10px" color="white"
            >
              IA
            </Box>
          </HStack>
          <Text fontSize="sm" color="rgba(255,255,255,0.9)" lineHeight={1.6}>
            {msg.text}
          </Text>
        </Box>
      </Box>
    );
  }

  // ── User message ──
  if (msg.role === "user") {
    return (
      <Flex justify="flex-end" px={4} py={1.5}>
        <Box maxW="80%">
          <Box
            bg={P.brand} color="white" px={4} py={3}
            borderRadius="2xl" borderBottomRightRadius="sm"
          >
            <Text fontSize="sm" lineHeight={1.6}>{msg.text}</Text>
          </Box>
          <Text fontSize="10px" color={P.muted} textAlign="right" mt={1} pr={1}>
            {timeStr}
          </Text>
        </Box>
      </Flex>
    );
  }

  // ── Agent message ──
  return (
    <Flex align="flex-start" gap={3} px={4} py={1.5}>
      <Flex
        w={8} h={8} flexShrink={0} borderRadius="full"
        bg={msg.error ? "#C53030" : P.brand}
        align="center" justify="center" mt={1}
      >
        <Text fontSize="xs" color="white">{msg.error ? "⚠️" : "🤖"}</Text>
      </Flex>
      <Box flex={1} maxW="calc(100% - 52px)">
        <Box
          bg={msg.error ? "#FFF5F5" : P.white}
          borderRadius="2xl" borderBottomLeftRadius="sm"
          borderWidth="1px"
          borderColor={msg.error ? "#FC8181" : P.soft}
          px={4} py={3}
        >
          <RichText text={msg.text} />
          {msg.results && <ResultsCard results={msg.results} />}
        </Box>
        <HStack spacing={2} mt={1} pl={1}>
          <Text fontSize="10px" color={P.muted}>{timeStr}</Text>
          {msg.answerType && msg.answerType !== "analysis" && (
            <Box
              bg={P.soft} px={2} py="1px"
              borderRadius="full" fontSize="10px" color={P.muted}
            >
              {msg.answerType}
            </Box>
          )}
        </HStack>
      </Box>
    </Flex>
  );
}

// ─── Quick-action suggestions ─────────────────────────────────────────────────
function Suggestions({
  cats, onSelect,
}: { cats: CategoryProgress[]; onSelect: (s: string) => void }) {
  const items = useMemo(() => {
    const list: string[] = [];
    list.push("Résume mon bilan annuel en quelques points clés");
    list.push("Quelle est ma principale source d'émissions et pourquoi ?");

    const hasFuel = cats.some(c => c.key === "fuel"        && c.ges_total > 0);
    const hasGas  = cats.some(c => c.key === "natural_gas" && c.ges_total > 0);
    const hasRef  = cats.some(c => c.key === "refrigerant" && c.ges_total > 0);
    const hasElec = cats.some(c => c.key === "electricity" && c.ges_total > 0);

    if (hasFuel && hasGas)  list.push("Compare mes émissions carburant vs gaz naturel");
    if (hasElec)            list.push("Analyse mon électricité — est-ce normal pour le Québec ?");
    if (hasRef)             list.push("Y a-t-il des anomalies dans mes frigorigènes ?");
    list.push("Quelles sont mes 3 meilleures opportunités de réduction ?");
    list.push("Comment atteindre -30% d'émissions d'ici 2030 ?");
    list.push("Compare mes émissions aux benchmarks du secteur tertiaire");
    return list.slice(0, 6);
  }, [cats]);

  return (
    <Box px={4} py={3} borderTopWidth="1px" borderColor={P.soft} bg={P.bg}>
      <Text fontSize="10px" color={P.muted} textTransform="uppercase"
        letterSpacing="wide" mb={2} fontWeight="semibold">
        Suggestions
      </Text>
      <Flex flexWrap="wrap" gap={2}>
        {items.map(item => (
          <Button
            key={item} size="xs" borderRadius="xl"
            bg={P.white} borderWidth="1px" borderColor={P.soft}
            color={P.dark} fontSize="11px"
            _hover={{ bg: P.soft, borderColor: P.light }}
            onClick={() => onSelect(item)}
            whiteSpace="normal" textAlign="left" h="auto" py={2} px={3}
          >
            {item}
          </Button>
        ))}
      </Flex>
    </Box>
  );
}

// ─── Context summary bar (top of copilot) ────────────────────────────────────
function ContextBar({
  cats, grandTotal,
}: { cats: CategoryProgress[]; grandTotal: number }) {
  const active = cats.filter(c => c.ges_total > 0);
  return (
    <Box px={4} py={3} borderBottomWidth="1px" borderColor={P.soft} bg={P.white}>
      <Text fontSize="10px" color={P.muted} textTransform="uppercase"
        letterSpacing="wide" mb={2} fontWeight="semibold">
        Contexte du bilan actuel
      </Text>
      <Flex gap={2} flexWrap="wrap">
        <Box
          bg={P.brand} color="white" px={3} py={1}
          borderRadius="full" fontSize="xs" fontWeight="bold"
        >
          Total {fmt4(grandTotal)} tCO₂e
        </Box>
        {active.map(cat => (
          <Box
            key={cat.key}
            px={3} py={1} borderRadius="full" fontSize="xs"
            bg={`${SRC_COLOR[cat.key] ?? P.accent}20`}
            color={SRC_COLOR[cat.key] ?? P.accent}
            fontWeight="semibold" borderWidth="1px"
            borderColor={`${SRC_COLOR[cat.key] ?? P.accent}40`}
          >
            {cat.icon} {cat.label.split(" ")[0]} {fmt4(cat.ges_total)} t
            <Box as="span" fontWeight="normal" ml={1} opacity={0.7}>
              {pct(cat.ges_total, grandTotal)}
            </Box>
          </Box>
        ))}
        {active.length === 0 && (
          <Text fontSize="xs" color={P.muted}>Aucune donnée disponible</Text>
        )}
      </Flex>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — CopilotTab
// ══════════════════════════════════════════════════════════════════════════════
export default function CopilotTab({ categories, grandTotal, userId, companyId, companyName }: CopilotTabProps) {
  // Stable session_id for this analysis session (regenerates only on mount)
  // No prefix needed — /api/automation/analysis calls Webhook 2 directly.
  const analysisSessionId = useRef(`copilot_${uid()}`);
  const contextInjected   = useRef(false);
  const bottomRef         = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id:   "welcome",
      role: "system",
      text: "Bonjour ! Je suis votre Copilote GES. "
        + "Je connais votre bilan actuel et peux répondre à vos questions : "
        + "comparaisons, anomalies, tendances, benchmarks sectoriels, recommandations de réduction. "
        + "Posez votre question ou choisissez une suggestion ci-dessous.",
      ts: new Date(),
    },
  ]);
  const [input,     setInput]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggs, setShowSuggs] = useState(true);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Send a message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoading) return;

    // Prepend context prefix on the very first user message
    let payload = text;
    if (!contextInjected.current && grandTotal > 0) {
      payload = buildContextPrefix(categories, grandTotal) + text;
      contextInjected.current = true;
    }

    // Add user bubble (show original text, not the full payload with prefix)
    const userMsg: ChatMessage = {
      id: uid(), role: "user", text, ts: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setShowSuggs(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/automation/analysis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id:   analysisSessionId.current,
          message:      payload,
          user_id:      userId      ?? null,
          company_id:   companyId   ?? null,
          company_name: companyName ?? null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
      }

      const data = await res.json();
      const agentText = data?.message || data?.output || "";

      if (!agentText) {
        throw new Error("Réponse vide reçue du serveur. Vérifiez que le workflow n8n est actif.");
      }

      setMessages(prev => [
        ...prev,
        {
          id:         uid(),
          role:       "agent",
          text:       agentText,
          ts:         new Date(),
          answerType: data?.answer_type ?? undefined,
          results:    data?.results     ?? undefined,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id:    uid(),
          role:  "agent",
          text:  `Impossible d'obtenir une réponse.\n\n**Détail :** ${err.message}`,
          ts:    new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [categories, grandTotal, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    analysisSessionId.current = `analysis_${uid()}`;
    contextInjected.current   = false;
    setMessages([{
      id:   "welcome",
      role: "system",
      text: "Conversation réinitialisée. Posez votre nouvelle question.",
      ts:   new Date(),
    }]);
    setShowSuggs(true);
    setInput("");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Flex
      direction="column"
      h="calc(100vh - 340px)"
      minH="520px"
      bg={P.white}
      borderRadius="2xl"
      borderWidth="1px"
      borderColor={P.soft}
      overflow="hidden"
    >
      {/* Context bar */}
      <ContextBar cats={categories} grandTotal={grandTotal} />

      {/* Messages scroll area */}
      <Box flex={1} overflowY="auto" py={3}
        css={{
          scrollbarWidth: "thin",
          scrollbarColor: `${P.soft} transparent`,
        }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} style={{ height: 1 }} />
      </Box>

      {/* Suggestion chips (shown until user sends first message) */}
      {showSuggs && !isLoading && (
        <Suggestions cats={categories} onSelect={sendMessage} />
      )}

      {/* Input area */}
      <Box
        px={4} py={3}
        borderTopWidth="1px" borderColor={P.soft}
        bg={P.white}
      >
        <HStack align="flex-end" spacing={2}>
          <Textarea
            ref={textareaRef as any}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur votre bilan GES… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
            rows={2}
            fontSize="sm"
            borderRadius="xl"
            borderColor={P.soft}
            bg={P.bg}
            resize="none"
            _focus={{ borderColor: P.accent, boxShadow: `0 0 0 1px ${P.accent}` }}
            _placeholder={{ color: P.muted }}
            isDisabled={isLoading}
          />

          <VStack spacing={1} flexShrink={0}>
            <Button
              size="md"
              bg={P.brand}
              color="white"
              borderRadius="xl"
              _hover={{ bg: P.accent }}
              onClick={() => sendMessage(input)}
              isLoading={isLoading}
              isDisabled={!input.trim()}
              loadingText=""
              minW="90px"
              h="44px"
            >
              Envoyer ↵
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color={P.muted}
              borderRadius="lg"
              fontSize="11px"
              onClick={handleClear}
              _hover={{ color: P.dark, bg: P.soft }}
              minW="90px"
            >
              🗑️ Effacer
            </Button>
          </VStack>
        </HStack>
        <Text fontSize="10px" color={P.muted} mt={1.5}>
          Propulsé par l'Agent Copilote GES — route dédiée <code>/api/automation/analysis</code>.
        </Text>
      </Box>
    </Flex>
  );
}
