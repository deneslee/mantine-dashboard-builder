import { Kbd, Modal, Table, Text } from '@mantine/core';

const SHORTCUTS = [
  ['v', 'View the widget full screen, or leave full screen'],
  ['i', "Inspect the widget's data and queries"],
  ['t', "Set the widget's time range"],
  ['e', 'Edit the widget, in edit mode'],
  ['Esc', 'Leave full screen, or close a drawer or dialog'],
  ['?', 'Show these shortcuts'],
] as const;

/** The dashboard's keyboard shortcuts, opened with `?`. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal opened onClose={onClose} title="Keyboard shortcuts" centered>
      <Text size="sm" c="dimmed">
        Letters act on the widget with focus, or else the one under the pointer, and never while you type in a
        field.
      </Text>
      <Table>
        <Table.Tbody>
          {SHORTCUTS.map(([key, action]) => (
            <Table.Tr key={key}>
              <Table.Td>
                <Kbd>{key}</Kbd>
              </Table.Td>
              <Table.Td>{action}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Modal>
  );
}
