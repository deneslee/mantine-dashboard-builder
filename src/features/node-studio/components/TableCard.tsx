import { use } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconHash, IconKey, IconTable } from '@tabler/icons-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FieldSelectionContext } from '../fieldSelection';
import type { TableNode } from '../schema';
import classes from './NodeStudio.module.css';

export function TableCard({ id, data, selected }: NodeProps<TableNode>) {
  const editor = use(FieldSelectionContext);
  return (
    <div className={classes.card} data-selected={selected || undefined}>
      <div className={classes.cardHeader}>
        <IconTable size="1rem" />
        {data.name}
      </div>
      {data.fields.map((field) => {
        const isSelected = editor?.selection?.tableId === id && editor.selection.fieldId === field.id;
        const Icon = field.isPrimary ? IconKey : IconHash;
        return (
          <div className={classes.row} key={field.id}>
            <Handle
              className={classes.handle}
              type="target"
              position={Position.Left}
              id={`in:${field.id}`}
              title={`Connect to ${data.name}.${field.name}`}
            />
            <UnstyledButton
              className={`${classes.field} nodrag`}
              aria-label={`Inspect ${data.name}.${field.name}`}
              aria-pressed={isSelected}
              onClick={() => editor?.select({ tableId: id, fieldId: field.id })}
            >
              <Icon size="0.9rem" aria-label={field.isPrimary ? 'Primary key' : undefined} />
              <span className={classes.name}>{field.name}</span>
              <small>{field.type}</small>
            </UnstyledButton>
            <Handle
              className={classes.handle}
              type="source"
              position={Position.Right}
              id={`out:${field.id}`}
              title={`Connect from ${data.name}.${field.name}`}
            />
          </div>
        );
      })}
    </div>
  );
}
