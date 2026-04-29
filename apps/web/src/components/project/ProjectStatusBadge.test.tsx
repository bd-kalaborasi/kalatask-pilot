import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ProjectStatusBadge,
  PROJECT_STATUS_VALUES,
  projectStatusLabel,
  type ProjectStatus,
} from './ProjectStatusBadge';

describe('projectStatusLabel', () => {
  it('returns refined Indonesian label per status enum (Sprint 6)', () => {
    expect(projectStatusLabel('planning')).toBe('Perencanaan');
    expect(projectStatusLabel('active')).toBe('Aktif');
    expect(projectStatusLabel('on_hold')).toBe('Ditahan');
    expect(projectStatusLabel('completed')).toBe('Selesai');
    expect(projectStatusLabel('archived')).toBe('Diarsipkan');
  });
});

describe('PROJECT_STATUS_VALUES', () => {
  it('contains exactly 5 enum values matching DB schema', () => {
    expect(PROJECT_STATUS_VALUES).toHaveLength(5);
    expect(PROJECT_STATUS_VALUES).toEqual([
      'planning',
      'active',
      'on_hold',
      'completed',
      'archived',
    ]);
  });
});

describe('<ProjectStatusBadge />', () => {
  it.each<ProjectStatus>(['planning', 'active', 'on_hold', 'completed', 'archived'])(
    'renders label untuk status "%s"',
    (status) => {
      render(<ProjectStatusBadge status={status} />);
      expect(screen.getByText(projectStatusLabel(status))).toBeInTheDocument();
    },
  );

  it('accepts custom className', () => {
    const { container } = render(
      <ProjectStatusBadge status="active" className="custom-test-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-test-class');
  });
});
