'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { HStack, IconButton, Select } from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { supabase } from '../../lib/supabaseClient';

/**
 * Shared dropdown for the "Référence" field.
 * Loads company_references once per user (module-level cache) and renders a Select.
 * Falls back gracefully when no references are configured.
 *
 * size="sm"  → Cat4/Cat5 style  (size="sm", borderRadius="15px")
 * size="md"  → Cat1/Cat3 style  (h="42px",  rounded="lg")      [default]
 */

const FIGMA = {
  green: '#344E41',
  border: '#E4E4E4',
  text: '#404040',
  muted: '#8F8F8F',
  inputShadow: '0px 1px 6px 2px rgba(0,0,0,0.05)',
};

// Module-level cache: keyed by userId
const _cache: Record<string, string[]> = {};
// In-flight promise per userId to avoid duplicate fetches
const _inflight: Record<string, Promise<string[]>> = {};

async function fetchReferences(userId: string, force = false): Promise<string[]> {
  if (!force && _cache[userId]?.length) return _cache[userId];
  if (_inflight[userId]) return _inflight[userId];

  _inflight[userId] = (async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      if (!profile?.company_id) return [];

      const { data: company } = await supabase
        .from('companies')
        .select('company_references')
        .eq('id', profile.company_id)
        .single();

      const raw = (company as any)?.company_references;
      const refs = Array.isArray(raw)
        ? raw.map((r: any) => String(r)).filter(Boolean)
        : [];

      const unique = Array.from(new Set(refs));
      // Only cache non-empty results so stale empty cache never blocks fresh data
      if (unique.length > 0) {
        _cache[userId] = unique;
      }
      return unique;
    } catch (e) {
      console.error('ReferenceSelect fetch error:', e);
      return [];
    } finally {
      delete _inflight[userId];
    }
  })();

  return _inflight[userId];
}

interface ReferenceSelectProps {
  userId: string;
  value: string;
  onChange: (v: string) => void;
  /** "sm" = Cat4/Cat5 compact style; "md" = Cat1/Cat3 tall style (default) */
  size?: 'sm' | 'md';
}

export function ReferenceSelect({ userId, value, onChange, size = 'md' }: ReferenceSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback((force = false) => {
    if (!userId) return;
    // Use cache only when it has actual data
    if (!force && _cache[userId]?.length) {
      setOptions(_cache[userId]);
      return;
    }
    setLoading(true);
    fetchReferences(userId, force).then((refs) => {
      setOptions(refs);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const smStyle = {
    size: 'sm' as const,
    borderRadius: '15px',
  };

  const mdStyle = {
    h: '42px',
    rounded: 'lg',
  };

  return (
    <HStack spacing={1} w="full">
      <Select
        flex="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={loading ? 'Chargement…' : options.length ? 'Sélectionner…' : 'Aucune référence'}
        isDisabled={loading}
        bg="white"
        borderColor={FIGMA.border}
        boxShadow={FIGMA.inputShadow}
        fontSize={size === 'sm' ? '13px' : '14px'}
        color={FIGMA.text}
        _focus={{ borderColor: FIGMA.green, boxShadow: `0 0 0 1px ${FIGMA.green}` }}
        transition="all 0.2s"
        {...(size === 'sm' ? smStyle : mdStyle)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
      <IconButton
        aria-label="Rafraîchir les références"
        icon={<RepeatIcon />}
        size={size === 'sm' ? 'xs' : 'sm'}
        variant="ghost"
        color={FIGMA.muted}
        isLoading={loading}
        _hover={{ color: FIGMA.green, bg: '#DDE5E0' }}
        onClick={() => {
          delete _cache[userId];
          load(true);
        }}
      />
    </HStack>
  );
}

export default ReferenceSelect;
