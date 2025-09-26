'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, HStack, IconButton, Input, Kbd, Spinner, Stack, Tag, TagLabel, Text, useToast
} from '@chakra-ui/react';
import { ArrowRight, RotateCcw } from 'lucide-react';

type IntakeState = Record<string, any>;

type Props = {
  companyName: string;
  /** You can still override, but we default to Cloud Run */
  apiBase?: string; // e.g. https://interview-129138384907.us-central1.run.app/api
  onDone: (payload: { assessment: any }) => void;
};

export default function IntakeInterview({
  companyName,
  onDone,
  apiBase = process.env.NEXT_PUBLIC_INTAKE_API_BASE
    || 'https://interview-129138384907.us-central1.run.app/api',
}: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer]     = useState<string>('');
  const [stateObj, setStateObj] = useState<IntakeState>({});
  const [history, setHistory]   = useState<{q:string; a?:string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function safeFetch(url: string, init?: RequestInit) {
    try {
      const r = await fetch(url, {
        ...init,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && (data.error || data.exception))) {
        const msg = data?.error || data?.exception || `HTTP ${r.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (e: any) {
      // Typical CORS / DNS / network error
      const hint = e?.message?.includes('Failed to fetch')
        ? 'Network/CORS error: check Cloud Run URL & CORS on the API.'
        : e?.message;
      throw new Error(hint || 'Request failed');
    }
  }

  // Start interview
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await safeFetch(`${apiBase}/intake/start`, {
          method: 'POST',
          body: JSON.stringify({ companyName }),
        });
        setQuestion(data.question ?? '');
        setHistory([{ q: data.question ?? '' }]);
      } catch (e:any) {
        setError(e.message || 'Failed to start intake.');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, companyName]);

  async function submitAnswer() {
    if (!answer.trim()) {
      toast({ title: 'Please type an answer', status: 'info', duration: 2000 });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await safeFetch(`${apiBase}/intake/next`, {
        method: 'POST',
        body: JSON.stringify({
          state: stateObj,
          lastUserReply: answer.trim(),
        }),
      });

      setHistory(h => {
        const copy = [...h];
        if (copy.length) copy[copy.length - 1].a = answer.trim();
        return data.done ? copy : [...copy, { q: data.question ?? '' }];
      });
      setAnswer('');

      if (data.done) {
        onDone({ assessment: data.assessment });
        return;
      }
      if (data.state) setStateObj(data.state);
      setQuestion(data.question ?? '');
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e:any) {
      setError(e.message || 'Intake step failed.');
    } finally {
      setLoading(false);
    }
  }

  async function resetInterview() {
    setStateObj({});
    setHistory([]);
    setQuestion('');
    setAnswer('');
    try {
      setLoading(true);
      setError(null);
      const data = await safeFetch(`${apiBase}/intake/start`, {
        method: 'POST',
        body: JSON.stringify({ companyName }),
      });
      setQuestion(data.question ?? '');
      setHistory([{ q: data.question ?? '' }]);
    } catch (e:any) {
      setError(e.message || 'Failed to restart intake.');
    } finally {
      setLoading(false);
    }
  }

  const lastQ = useMemo(() => question, [question]);

  return (
    <Stack spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">
          Configuration intelligente — {companyName}
        </Text>
        <IconButton aria-label="Restart" size="sm" onClick={resetInterview}
          icon={<RotateCcw size={16} />} variant="ghost" />
      </HStack>

      {loading && (<HStack><Spinner /><Text>Chargement…</Text></HStack>)}

      {error && (
        <Box bg="red.50" _dark={{ bg: 'red.900' }} border="1px solid"
             borderColor="red.200" rounded="md" p={3}>
          <Text color="red.600" _dark={{ color: 'red.200' }}>{error}</Text>
          <Text fontSize="sm" mt={1}>
            API base: <code>{apiBase}</code>
          </Text>
        </Box>
      )}

      <Stack spacing={2} maxH="220px" overflowY="auto"
             border="1px solid" borderColor="gray.200"
             _dark={{ borderColor: 'gray.700' }} rounded="md" p={3}>
        {history.map((h, i) => (
          <Box key={i}>
            <Text fontWeight="semibold">Q:</Text>
            <Text mb={1}>{h.q}</Text>
            {h.a && (<><Text fontWeight="semibold">A:</Text><Text>{h.a}</Text></>)}
          </Box>
        ))}
      </Stack>

      {!loading && !error && lastQ && (
        <Box>
          <Text mb={2} fontWeight="semibold">{lastQ}</Text>
          <HStack>
            <Input
              ref={inputRef}
              placeholder="Votre réponse…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' ? submitAnswer() : undefined}
            />
            <Button onClick={submitAnswer} rightIcon={<ArrowRight size={16} />}>
              Envoyer <Kbd ml={2}>Enter</Kbd>
            </Button>
          </HStack>
        </Box>
      )}

      {Object.keys(stateObj).length > 0 && (
        <Stack spacing={1}>
          <Text fontSize="sm" color="gray.500">État (résumé):</Text>
          <HStack wrap="wrap" spacing={2}>
            {Object.entries(stateObj).slice(0, 20).map(([k, v]) => (
              <Tag key={k} size="sm" variant="subtle">
                <TagLabel>{k}:{typeof v === 'object' ? JSON.stringify(v) : String(v)}</TagLabel>
              </Tag>
            ))}
          </HStack>
        </Stack>
      )}
    </Stack>
  );
}
