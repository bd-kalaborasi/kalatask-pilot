import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ProjectStatusBadge,
  PROJECT_STATUS_VALUES,
  projectStatusLabel,
  type ProjectStatus,
} from './ProjectStatusBadge';

describe('projectStatusLabel', () => {
  it('returns human-readable label per status enum', () => {
    expect(projectStatusLabel('planning')).toBe('Planning');
    expect(projectStatusLabel('active')).toBe('Active');
    expect(projectStatusLabel('on_hold')).toBe('On Hold');
    expect(projectStatusLabel('completed')).toBe('Completed');
    expect(projectStatusLabel('archived')).toBe('Archived');
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
