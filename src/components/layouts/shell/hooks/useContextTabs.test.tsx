import { IconBell, IconInfoCircle } from '@tabler/icons-react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@/testing/render';
import { StoryRouter } from '@/testing/storyRouter';
import { ShellProvider } from '../ShellProvider';
import type { ContextTab } from '../model/contextTabs';
import { useContextTabs } from './useContextTabs';

const tab = (id: string, icon = IconInfoCircle): ContextTab => ({
  id,
  label: id,
  icon,
  component: () => null,
});
const details = tab('details');
const inbox = tab('notifications', IconBell);

function TabIds() {
  return (
    <output>
      {useContextTabs()
        .map((t) => t.id)
        .join(',')}
    </output>
  );
}

function renderTabs(routeTabs: ContextTab[], globalTabs?: ContextTab[]) {
  render(
    <StoryRouter
      contextTabs={routeTabs}
      wrap={(outlet) => (
        <ShellProvider globalTabs={globalTabs}>
          <TabIds />
          {outlet}
        </ShellProvider>
      )}
    />,
  );
}

describe('useContextTabs', () => {
  it("lists the route's tabs, then the global ones", async () => {
    renderTabs([details], [inbox]);
    expect(await screen.findByRole('status')).toHaveTextContent('details,notifications');
  });

  it('keeps the first tab when a route and the app use the same id', async () => {
    renderTabs([inbox, details], [tab('notifications')]);
    expect(await screen.findByRole('status')).toHaveTextContent('notifications,details');
  });

  it('has no global tabs unless the app passes them', async () => {
    renderTabs([details]);
    expect(await screen.findByRole('status')).toHaveTextContent('details');
  });
});
