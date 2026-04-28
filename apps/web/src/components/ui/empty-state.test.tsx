/**
 * EmptyState component tests — verify variants render correctly.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title only (minimal)', () => {
    render(<EmptyState title="Belum ada data" />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });

  it('renders title + body + icon', () => {
    render(
      <EmptyState
        icon="📋"
        title="Project kosong"
        body="Bikin task baru untuk mulai."
      />,
    );
    expect(screen.getByText('Project kosong')).toBeInTheDocument();
    expect(screen.getByText('Bikin task baru untuk mulai.')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders CTA button + fires onClick', () => {
    const handler = vi.fn();
    render(
      <EmptyState
        title="Filter tidak nemu"
        ctaLabel="Reset"
        ctaOnClick={handler}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('compact variant uses smaller spacing classes', () => {
    const { container } = render(
      <EmptyState compact icon="🤖" title="Compact mode" />,
    );
    expect(container.querySelector('.py-8')).toBeTruthy();
    expect(container.querySelector('.py-14')).toBeFalsy();
  });
});
