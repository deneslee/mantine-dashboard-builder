import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@/testing/render';
import { Page } from './Page';

function FullPage() {
  return (
    <Page.Root>
      <Page.Header>
        <Page.Breadcrumbs>
          <a href="/dashboards">Dashboards</a>
        </Page.Breadcrumbs>
        <Page.Title>Sales overview</Page.Title>
        <Page.Description>Revenue by region</Page.Description>
        <Page.Actions>
          <button type="button">Share</button>
        </Page.Actions>
        <Page.ControlBar aria-label="Dashboard controls">
          <button type="button">Last 24 hours</button>
        </Page.ControlBar>
      </Page.Header>
      <Page.Body>Body</Page.Body>
    </Page.Root>
  );
}

describe('Page', () => {
  it('has one h1 and a breadcrumb landmark', () => {
    render(<FullPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sales overview');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Dashboard controls' })).toBeInTheDocument();
  });

  it('reaches crumbs, actions and controls by keyboard in reading order', async () => {
    const user = userEvent.setup();
    render(<FullPage />);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Dashboards' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Last 24 hours' })).toHaveFocus();
  });

  it('renders only the parts it is given', () => {
    render(
      <Page.Root>
        <Page.Header>
          <Page.Title>Settings</Page.Title>
        </Page.Header>
      </Page.Root>,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
  });
});
