import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePosteVisibility(userId: string | undefined) {
  const [hiddenPostes, setHiddenPostes] = useState<{ [posteId: string]: boolean }>({});
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('poste_visibility')
      .select('poste_id, is_hidden')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) return; // optionally handle error
        const map: { [posteId: string]: boolean } = {};
        (data || []).forEach(row => {
          map[row.poste_id] = !!row.is_hidden;
        });
        setHiddenPostes(map);
      });
  }, [userId]);
  return hiddenPostes;
}
