/**
 * Projects data layer — fetch + types.
 *
 * RLS Sprint 1 handle filtering by role:
 * - admin/viewer: lihat semua
 * - manager: lihat project yang dia own + project di team-nya (transitive)
 * - member: lihat project di mana dia ada task assigned (transitive)
 *
 * Client tinggal call .from('projects').select(); RLS auto-apply.
 */
import { supabase } from '@/lib/supabase';
import type { ProjectStatus } from '@/components/project/ProjectStatusBadge';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ProjectWithOwner extends Project {
  owner: {
    id: string;
    full_name: string;
    team_id: string | null;
  } | null;
}

export interface ProjectsFilter {
  /** Filter by 1+ status. Empty array = all status. */
  statuses: ProjectStatus[];
  /** Filter by team_id (project owner's team). Empty string = all team. */
  teamId: string;
}

export const EMPTY_PROJECTS_FILTER: ProjectsFilter = {
  statuses: [],
  teamId: '',
};

/**
 * Fetch projects + owner team_id (untuk team filter di admin/viewer).
 * RLS apply otomatis di server.
 */
export async function fetchProjectsWithOwner(): Promise<ProjectWithOwner[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, name, description, owner_id, status, created_at, updated_at, completed_at, owner:users!projects_owner_id_fkey (id, full_name, team_id)',
    )
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProjectWithOwner[];
}

export interface UpdateProjectStatusArgs {
  id: string;
  status: ProjectStatus;
}

export async function updateProjectStatus({
  id,
  status,
}: UpdateProjectStatusArgs): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export interface CreateProjectArgs {
  name: string;
  description?: string;
  status?: ProjectStatus;
  /** Defaults ke auth.uid() di server kalau undefined (manager auto-self via RLS WITH CHECK). */
  ownerId?: string;
}

export async function createProject(
  args: CreateProjectArgs,
): Promise<ProjectWithOwner> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) throw new Error('Tidak ada session aktif');

  const payload = {
    name: args.name.trim(),
    description: args.description?.trim() || null,
    status: args.status ?? 'planning',
    owner_id: args.ownerId ?? uid,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select(
      'id, name, description, owner_id, status, created_at, updated_at, completed_at, owner:users!projects_owner_id_fkey (id, full_name, team_id)',
    )
    .single();

  if (error) throw error;
  return data as unknown as ProjectWithOwner;
}

/**
 * Apply filter di client side. RLS sudah filter visibility — ini lapis
 * UX filter (status + team).
 */
export function applyProjectsFilter(
  projects: ProjectWithOwner[],
  filter: ProjectsFilter,
): ProjectWithOwner[] {
  return projects.filter((p) => {
    if (filter.statuses.length > 0 && !filter.statuses.includes(p.status)) {
      return false;
    }
    if (filter.teamId && p.owner?.team_id !== filter.teamId) {
      return false;
    }
    return true;
  });
}
