import { describe, expect, it } from 'vitest';
import { applyProjectsFilter, type ProjectWithOwner } from './projects';

const sampleProjects: ProjectWithOwner[] = [
  {
    id: 'p1',
    name: 'Alpha',
    description: null,
    owner_id: 'u1',
    status: 'planning',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    completed_at: null,
    owner: { id: 'u1', full_name: 'Sari', team_id: 'team-a' },
  },
  {
    id: 'p2',
    name: 'Beta',
    description: null,
    owner_id: 'u2',
    status: 'active',
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
    completed_at: null,
    owner: { id: 'u2', full_name: 'Rangga', team_id: 'team-b' },
  },
  {
    id: 'p3',
    name: 'Gamma',
    description: null,
    owner_id: 'u1',
    status: 'completed',
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
    completed_at: '2026-04-15T00:00:00Z',
    owner: { id: 'u1', full_name: 'Sari', team_id: 'team-a' },
  },
];

describe('applyProjectsFilter', () => {
  it('return semua project saat filter kosong', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: [],
      teamId: '',
    });
    expect(result).toHaveLength(3);
  });

  it('filter by single status', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: ['active'],
      teamId: '',
    });
    expect(result.map((p) => p.id)).toEqual(['p2']);
  });

  it('filter by multi status', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: ['planning', 'completed'],
      teamId: '',
    });
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('filter by team_id', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: [],
      teamId: 'team-a',
    });
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('filter by status + team simultaneously', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: ['planning'],
      teamId: 'team-a',
    });
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('return empty kalau combination tidak match', () => {
    const result = applyProjectsFilter(sampleProjects, {
      statuses: ['archived'],
      teamId: '',
    });
    expect(result).toEqual([]);
  });
});
