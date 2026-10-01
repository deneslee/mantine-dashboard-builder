import { Button, JsonInput, Stack, Textarea, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import { usePlugins } from '@/plugins/usePlugins';
import { useDashboardActions } from '../state/useDashboard';

/** A widget's title, description and options. Each field commits one undo step when it loses focus. */
export function WidgetForm({ id, widget }: { id: string; widget: Widget }) {
  const actions = useDashboardActions();
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const definition = usePlugins().widgets[widget.type];
  const [title, setTitle] = useState(widget.title);
  const [description, setDescription] = useState(widget.description ?? '');
  const [options, setOptions] = useState(JSON.stringify(widget.options, null, 2));
  const [error, setError] = useState<string>();
  // Undo, redo or an import replaces the widget: show its new values.
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
          if (title.trim()) actions.editWidget(id, { title: title.trim() });
        }}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        onBlur={() => actions.editWidget(id, { description: description || undefined })}
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
          if (!definition) return;
          // No ?. or conditionals inside try: the React Compiler would skip this component.
          try {
            const parsed = definition.optionsSchema.parse(JSON.parse(options));
            actions.editWidget(id, { options: parsed as Record<string, unknown> });
            setError(undefined);
          } catch (err) {
            setError(toAppError(err).message);
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
