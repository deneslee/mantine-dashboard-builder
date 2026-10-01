import { Button, Select, Stack, Text, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import { usePlugins } from '@/plugins/usePlugins';
import { useDashboardActions } from '../state/useDashboard';

/** Picks a widget type and title, adds the widget at the bottom and opens it for editing. */
export function AddWidgetForm() {
  const plugins = usePlugins();
  const actions = useDashboardActions();
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const [type, setType] = useState(Object.keys(plugins.widgets)[0] ?? '');
  const definition = plugins.widgets[type];
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const handleAdd = () => {
    if (!definition) return;
    // Only the parse inside try: the React Compiler skips components with conditionals in a try block.
    let options: unknown;
    try {
      options = definition.optionsSchema.parse({});
    } catch (err) {
      setError(toAppError(err).message);
      return;
    }
    const id = crypto.randomUUID();
    actions.addWidget(
      id,
      {
        type,
        title: title.trim() || definition.name,
        options: options as Record<string, unknown>,
        queries: [],
      },
      definition.defaultSize,
    );
    actions.openTool(null);
    void navigate({ search: (prev) => ({ ...prev, mode: 'edit', widget: id }), resetScroll: false });
  };
  return (
    <Stack>
      <Select
        data-autofocus
        label="Widget type"
        value={type}
        onChange={(value) => setType(value ?? '')}
        data={Object.values(plugins.widgets).map((widget) => ({ value: widget.type, label: widget.name }))}
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
      <Button disabled={!definition} onClick={handleAdd}>
        Add
      </Button>
    </Stack>
  );
}
