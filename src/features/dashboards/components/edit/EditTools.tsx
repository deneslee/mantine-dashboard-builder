import {
  Button,
  Drawer,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { tokens } from '@/design-system/tokens/tokens';
import type { Query } from '@/types/datasource';
import { useDashboardActions, useDashboardState, useWidget } from '../../hooks/useDashboard';
import { toLayouts } from '../../model/layouts';
import type { RawRange } from '../../model/timeRange';
import type { Widget } from '../../model/types';
import { useDashboardRegistry, type DashboardRegistry } from '../../registry';
import { WidgetTile } from '../grid/WidgetTile';
import classes from '../DashboardView.module.css';

const queriesSchema = z.array(z.object({ datasource: z.string(), spec: z.unknown() }));

function parseQueries(value: string, registry: DashboardRegistry): Query[] {
  const queries = queriesSchema.parse(JSON.parse(value));
  for (const query of queries) {
    const datasource = registry.datasources[query.datasource];
    if (!datasource) throw new Error(`Unknown datasource "${query.datasource}".`);
    if (datasource.querySchema) query.spec = datasource.querySchema.parse(query.spec);
  }
  return queries;
}
const message = (error: unknown) => (error instanceof Error ? error.message : 'Invalid JSON.');
const focusMenu = (id?: string) =>
  requestAnimationFrame(() => document.getElementById(id ? `widget-menu-${id}` : 'add-widget')?.focus());

export function EditTools({ range }: { range: RawRange }) {
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const tool = useDashboardState((s) => s.tool);
  const actions = useDashboardActions();
  const widget = useWidget(search.widget ?? '');
  const closeWidget = () => {
    void navigate({
      search: (prev) => ({ ...prev, widget: undefined, editor: undefined }),
      resetScroll: false,
    });
    focusMenu(search.widget);
  };
  if (widget && search.editor === 'queries')
    return <QueryEditor key={widget.id} widget={widget} range={range} close={closeWidget} />;
  return (
    <>
      <div className={classes.tools}>
        <Drawer.Root
          opened={tool?.kind === 'palette' || !!widget}
          onClose={() => {
            actions.openTool(null);
            closeWidget();
          }}
          position="right"
          size={tokens.shell.contextBar.default}
          withinPortal={false}
          trapFocus={false}
          lockScroll={false}
          onEnterTransitionEnd={() =>
            document.querySelector<HTMLInputElement>('[data-dashboard-tool] [data-autofocus]')?.focus()
          }
          classNames={{ inner: classes.drawerInner, content: classes.drawerContent }}
        >
          <Drawer.Content
            data-dashboard-tool
            ref={(node) => {
              // Mantine 9 hardcodes aria-modal on Drawer.Content, including when trapFocus is off.
              node?.setAttribute('aria-modal', 'false');
            }}
          >
            <Drawer.Header>
              <Drawer.Title>{tool?.kind === 'palette' ? 'Add widget' : 'Edit widget'}</Drawer.Title>
              <Drawer.CloseButton aria-label="Close drawer" />
            </Drawer.Header>
            <Drawer.Body>
              {tool?.kind === 'palette' ? (
                <Palette />
              ) : widget ? (
                <WidgetEditor key={widget.id} widget={widget} />
              ) : null}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Root>
      </div>
      {tool && tool.kind !== 'palette' && (
        <Placement key={tool.id + tool.kind} id={tool.id} kind={tool.kind} />
      )}
    </>
  );
}

function WidgetEditor({ widget }: { widget: Widget }) {
  const actions = useDashboardActions();
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const definition = useDashboardRegistry().widgets[widget.type];
  const [title, setTitle] = useState(widget.title);
  const [description, setDescription] = useState(widget.description ?? '');
  const [options, setOptions] = useState(JSON.stringify(widget.options, null, 2));
  const [error, setError] = useState<string>();
  const [previous, setPrevious] = useState(widget);
  if (previous !== widget) {
    setPrevious(widget);
    setTitle(widget.title);
    setDescription(widget.description ?? '');
    setOptions(JSON.stringify(widget.options, null, 2));
    setError(undefined);
  }
  return (
    <Stack>
      <TextInput
        data-autofocus
        label="Title"
        required
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        error={!title.trim() ? 'A title is required.' : undefined}
        onBlur={() => {
          if (title.trim()) actions.editWidget(widget.id, { title: title.trim() });
        }}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        onBlur={() => actions.editWidget(widget.id, { description: description || undefined })}
      />
      <JsonInput
        label="Display options"
        description="Validated against this widget type. Changes commit when you leave the field."
        autosize
        minRows={6}
        value={options}
        onChange={setOptions}
        error={error}
        onBlur={() => {
          try {
            const parsed = definition?.optionsSchema.parse(JSON.parse(options));
            if (parsed) actions.editWidget(widget.id, { options: parsed as Record<string, unknown> });
            setError(undefined);
          } catch (err) {
            setError(message(err));
          }
        }}
      />
      <Button
        variant="default"
        onClick={() =>
          void navigate({ search: (prev) => ({ ...prev, editor: 'queries' }), resetScroll: false })
        }
      >
        Edit queries
      </Button>
    </Stack>
  );
}

function Palette() {
  const registry = useDashboardRegistry();
  const actions = useDashboardActions();
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const [type, setType] = useState(Object.keys(registry.widgets)[0] ?? '');
  const definition = registry.widgets[type];
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  return (
    <Stack>
      <Select
        data-autofocus
        label="Widget type"
        value={type}
        onChange={(value) => setType(value ?? '')}
        data={Object.values(registry.widgets).map((widget) => ({ value: widget.type, label: widget.name }))}
        allowDeselect={false}
      />
      <TextInput
        label="Title"
        placeholder={definition?.name}
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        error={error}
      />
      <Text size="sm" c="dimmed">
        The widget is added at the bottom. Configure its datasource queries in the editor.
      </Text>
      <Button
        disabled={!definition}
        onClick={() => {
          if (!definition) return;
          try {
            const options = definition.optionsSchema.parse({});
            const id = crypto.randomUUID();
            actions.addWidget(
              {
                id,
                type,
                title: title.trim() || definition.name,
                options: options as Record<string, unknown>,
                queries: [],
              },
              definition.defaultSize,
            );
            actions.openTool(null);
            void navigate({ search: (prev) => ({ ...prev, mode: 'edit', widget: id }), resetScroll: false });
          } catch (err) {
            setError(message(err));
          }
        }}
      >
        Add
      </Button>
    </Stack>
  );
}

function Placement({ id, kind }: { id: string; kind: 'move' | 'resize' }) {
  const actions = useDashboardActions();
  const widget = useWidget(id);
  const breakpoint = useDashboardState((s) => s.breakpoint);
  const item = useDashboardState((s) =>
    toLayouts(s.doc.layouts)[s.breakpoint].find((entry) => entry.i === id),
  );
  const definition = useDashboardRegistry().widgets[widget?.type ?? ''];
  const cols = tokens.grid.cols[breakpoint];
  const [first, setFirst] = useState(kind === 'move' ? (item?.x ?? 0) + 1 : (item?.w ?? 2));
  const [second, setSecond] = useState(kind === 'move' ? (item?.y ?? 0) + 1 : (item?.h ?? 2));
  const close = () => {
    actions.openTool(null);
    focusMenu(id);
  };
  const valid =
    Number.isInteger(first) &&
    Number.isInteger(second) &&
    (kind === 'move'
      ? first >= 1 && first <= cols - (item?.w ?? 1) + 1 && second >= 1
      : first >= Math.min(definition?.minSize?.w ?? 1, cols) &&
        first <= cols &&
        second >= (definition?.minSize?.h ?? 1));
  return (
    <Modal
      opened
      onClose={close}
      title={`${kind === 'move' ? 'Move' : 'Resize'} ${widget?.title ?? 'widget'}`}
      centered
    >
      <Stack>
        <NumberInput
          data-autofocus
          label={kind === 'move' ? 'Column' : 'Width (columns)'}
          value={first}
          onChange={(value) => setFirst(Number(value))}
          min={1}
          max={cols}
          allowDecimal={false}
        />
        <NumberInput
          label={kind === 'move' ? 'Row' : 'Height (rows)'}
          value={second}
          onChange={(value) => setSecond(Number(value))}
          min={1}
          allowDecimal={false}
        />
        <Text size="sm" c="dimmed">
          Positions start at 1. Tiles compact upward into available space.
        </Text>
        <Button
          disabled={!valid}
          onClick={() => {
            actions.placeWidget(
              id,
              kind === 'move'
                ? { x: first - 1, y: second - 1 }
                : { w: first, h: second, x: Math.min(item?.x ?? 0, cols - first) },
            );
            close();
          }}
        >
          Apply
        </Button>
      </Stack>
    </Modal>
  );
}

function QueryEditor({ widget, range, close }: { widget: Widget; range: RawRange; close: () => void }) {
  const registry = useDashboardRegistry();
  const actions = useDashboardActions();
  const [value, setValue] = useState(JSON.stringify(widget.queries, null, 2));
  const [preview, setPreview] = useState(widget.queries);
  const [error, setError] = useState<string>();
  const changed = value !== JSON.stringify(widget.queries, null, 2);
  return (
    <Stack>
      <Group justify="space-between">
        <Text fw="bold">{widget.title}: queries</Text>
        <Button
          variant="default"
          onClick={() => {
            if (!changed || window.confirm('Discard unapplied query changes?')) close();
          }}
        >
          Back to dashboard
        </Button>
      </Group>
      <div className={classes.preview}>
        <WidgetTile id={widget.id} range={range} previewQueries={preview} />
      </div>
      <JsonInput
        label="Queries"
        description={`Each query has datasource and spec. Available datasources: ${Object.keys(registry.datasources).join(', ')}.`}
        autosize
        minRows={10}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          try {
            setPreview(parseQueries(next, registry));
            setError(undefined);
          } catch (err) {
            setError(message(err));
          }
        }}
      />
      <Group>
        <Button
          disabled={!!error || !changed}
          onClick={() => {
            try {
              const queries = parseQueries(value, registry);
              actions.editWidget(widget.id, { queries });
              setValue(JSON.stringify(queries, null, 2));
              setError(undefined);
            } catch (err) {
              setError(message(err));
            }
          }}
        >
          Apply queries
        </Button>
      </Group>
    </Stack>
  );
}
