/**
 * Comments client lib — Sprint 4.5 Step 5.
 *
 * RPC-first: post_comment, update_comment, delete_comment, search_users_for_mention
 * (semua di Sprint 4.5 Step 3 migration). PostgREST select untuk fetch.
 *
 * @mention token format: @[Full Name](user_uuid) — Markdown link syntax.
 * react-markdown custom renderer akan resolve token jadi mention badge.
 */
import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author?: { id: string; full_name: string; email: string } | null;
}

export interface MentionUser {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  email: string;
}

export const COMMENT_BODY_MAX = 2000;

export async function fetchComments(
  taskId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      `
      id, task_id, author_id, body, is_system, created_at, updated_at,
      author:users!comments_author_id_fkey ( id, full_name, email )
      `,
    )
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[comments] fetchComments failed:', error);
    return [];
  }
  return (data ?? []) as unknown as CommentWithAuthor[];
}

export async function postComment(
  taskId: string,
  body: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('post_comment', {
    p_task_id: taskId,
    p_body: body,
  });
  if (error) {
    console.error('[comments] postComment failed:', error);
    throw error;
  }
  return (data as string | null) ?? null;
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_comment', {
    p_comment_id: commentId,
    p_body: body,
  });
  if (error) {
    console.error('[comments] updateComment failed:', error);
    throw error;
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_comment', {
    p_comment_id: commentId,
  });
  if (error) {
    console.error('[comments] deleteComment failed:', error);
    throw error;
  }
}

export async function searchUsersForMention(
  query: string,
): Promise<MentionUser[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc('search_users_for_mention', {
    p_query: query,
  });
  if (error) {
    console.error('[comments] searchUsersForMention failed:', error);
    return [];
  }
  return (data as MentionUser[] | null) ?? [];
}

/** Build @mention token untuk inject ke comment body */
export function buildMentionToken(user: { id: string; full_name: string }): string {
  return `@[${user.full_name}](${user.id})`;
}

/** Parse mention UUIDs from body — mirror server regex (client preview only). */
export function parseMentionUuids(body: string): string[] {
  const regex =
    /@\[[^\]]+\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g;
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    set.add(match[1]);
  }
  return Array.from(set);
}
