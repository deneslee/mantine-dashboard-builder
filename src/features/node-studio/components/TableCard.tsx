import { use } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconHash, IconKey, IconTable } from '@tabler/icons-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { SelectFieldContext } from '../fieldSelection';
import { fieldHandleId, type TableNode } from '../graph/buildGraph';
import classes from './TableCard.module.css';

export function TableCard({ id, data, selected }: NodeProps<TableNode>) {
  const select = use(SelectFieldContext);
  const { table, selectedFieldId } = data;
  return (
    <div className={classes.card} data-selected={selected || undefined}>
      <div className={classes.cardHeader}>
        <IconTable size="1rem" aria-hidden />
        {table.name}
      </div>
      {table.fields.map((field) => {
        const isSelected = selectedFieldId === field.id;
        const Icon = field.isPrimary ? IconKey : IconHash;
        return (
          <div className={classes.row} key={field.id}>
            <Handle
              className={classes.handle}
              type="target"
              position={Position.Left}
              id={fieldHandleId('target', field.id)}
              title={`Connect to ${table.name}.${field.name}`}
            />
            <UnstyledButton
              className={`${classes.field} nodrag`}
              aria-label={`Inspect ${table.name}.${field.name}`}
              aria-pressed={isSelected}
              onClick={() => select?.({ tableId: id, fieldId: field.id })}
            >
              <Icon size="0.9rem" aria-hidden />
              <span className={classes.name}>{field.name}</span>
              {field.type && <small>{field.type}</small>}
            </UnstyledButton>
            <Handle
              className={classes.handle}
              type="source"
              position={Position.Right}
              id={fieldHandleId('source', field.id)}
              title={`Connect from ${table.name}.${field.name}`}
            />
          </div>
        );
      })}
    </div>
  );
}
