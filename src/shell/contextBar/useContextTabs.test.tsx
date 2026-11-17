import { IconBell, IconInfoCircle } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { fireEvent, render, screen } from '@/testing/render';
import { TestRouter } from '@/testing/TestRouter';
import { ShellProvider } from '../ShellProvider';
import type { ContextTab, PageTab } from '../ContextTab';
import { ContextBarPanel } from './ContextBarPanel';
import { isPageTab, useContextTabs } from './useContextTabs';

const tab = (id: string, icon = IconInfoCircle): ContextTab => ({
  id,
  label: id,
  icon,
  component: () => null,
});
const details = tab('details');
const inbox = tab('notifications', IconBell);
const pageTab = (id: string, icon = IconInfoCircle): PageTab => ({ id, label: id, icon });

function TabIds() {
  return (
    <output>
      {useContextTabs()
        .map((t) => (isPageTab(t) ? `page:${t.id}` : t.id))
        .join(',')}
    </output>
  );
}

function PageTabs({ tabs }: { tabs: PageTab[] }) {
  return tabs.map((t) => (
    <ContextBarPanel key={t.id} {...t}>
      x
    </ContextBarPanel>
  ));
}

function HidablePage({ tabs }: { tabs: PageTab[] }) {
  const [isShown, setShown] = useState(true);
  return (
    <>
      <button onClick={() => setShown(false)}>Hide</button>
      {isShown ? <PageTabs tabs={tabs} /> : null}
    </>
  );
}

function renderTabs(
  routeTabs: ContextTab[],
  globalTabs?: ContextTab[],
  pageTabs: PageTab[] = [],
  page: ReactNode = <PageTabs tabs={pageTabs} />,
) {
  render(
    <TestRouter
      contextTabs={routeTabs}
      page={page}
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

  it('puts page tabs between route and global tabs', async () => {
    renderTabs([tab('a')], [tab('g')], [pageTab('p')]);
    expect(await screen.findByText('a,page:p,g')).toBeInTheDocument();
  });

  it('a route tab wins over a page tab with the same id', async () => {
    renderTabs([tab('a')], undefined, [pageTab('a', IconBell)]);
    expect(await screen.findByText('a')).toBeInTheDocument();
    expect(screen.queryByText('page:a')).not.toBeInTheDocument();
  });

  it('removes a page tab when its page unmounts', async () => {
    renderTabs([tab('a')], undefined, [], <HidablePage tabs={[pageTab('p')]} />);
    expect(await screen.findByText('a,page:p')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(await screen.findByText('a')).toBeInTheDocument();
  });
});
