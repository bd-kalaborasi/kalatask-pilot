import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectStatusSelect } from './ProjectStatusSelect';
import type { UserRole } from '@/lib/auth';

describe('<ProjectStatusSelect />', () => {
  it('renders semua 5 status options', () => {
    render(
      <ProjectStatusSelect
        value="planning"
        onChange={() => {}}
        userRole="admin"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it.each<UserRole>(['admin', 'manager'])(
    'enabled untuk role "%s"',
    (role) => {
      render(
        <ProjectStatusSelect
          value="planning"
          onChange={() => {}}
          userRole={role}
        />,
      );
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    },
  );

  it.each<UserRole>(['member', 'viewer'])(
    'disabled untuk role "%s" (RLS-aligned UI guard)',
    (role) => {
      render(
        <ProjectStatusSelect
          value="planning"
          onChange={() => {}}
          userRole={role}
        />,
      );
      expect(screen.getByRole('combobox')).toBeDisabled();
    },
  );

  it('disabled override saat mutation in-flight', () => {
    render(
      <ProjectStatusSelect
        value="active"
        onChange={() => {}}
        userRole="admin"
        disabled
      />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('panggil onChange dengan status baru saat user select', async () => {
    const onChange = vi.fn();
    render(
      <ProjectStatusSelect
        value="planning"
        onChange={onChange}
        userRole="admin"
      />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'active');
    expect(onChange).toHaveBeenCalledWith('active');
  });
});
