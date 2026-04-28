/**
 * Teams data layer — minimal fetch untuk filter UI.
 *
 * RLS Sprint 1: admin/viewer lihat semua teams; manager+member lihat
 * own team only.
 */
import { supabase } from '@/lib/supabase';

export interface Team {
  id: string;
  name: string;
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
