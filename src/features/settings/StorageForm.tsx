import { Button, FileButton, Group, Radio, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import type { CollectionExport } from '@/core/records/RecordProvider';
import {
  loadActiveRecordProvider,
  setActiveRecordProviderId,
  useActiveRecordProviderId,
} from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { usePlugins } from '@/plugins/usePlugins';
import { Section, SectionRow } from '@/ui/components/Section';

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Reads the file as a collection export; anything else is refused with a message. */
async function readExport(file: File): Promise<CollectionExport> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('The file is not JSON.');
  }
  const data = parsed as Partial<CollectionExport> | null;
  if (!data || typeof data.collection !== 'string' || !Array.isArray(data.records))
    throw new Error('The file is not a collection export.');
  return data as CollectionExport;
}

/** General tab: where records are saved, and moving a collection between places by export and import. */
export function StorageForm() {
  const { recordProviders } = usePlugins();
  const activeId = useActiveRecordProviderId();
  const selected = Object.hasOwn(recordProviders, activeId) ? activeId : 'browser';
  const [collection, setCollection] = useState('dashboards');
  const [isBusy, setIsBusy] = useState(false);

  const handleExport = async () => {
    setIsBusy(true);
    try {
      const provider = await loadActiveRecordProvider();
      const result = await provider.exportCollection(collection.trim());
      if (!result.ok) throw new Error('This storage cannot export.');
      download(`${result.value.collection}.json`, JSON.stringify(result.value, null, 2));
      notify.success({ title: `Exported ${result.value.records.length} records` });
    } catch (error) {
      notify.error({ title: 'Export failed', message: toAppError(error).message });
    }
    setIsBusy(false);
  };

  const runImport = async (data: CollectionExport) => {
    setIsBusy(true);
    try {
      const provider = await loadActiveRecordProvider();
      const result = await provider.importCollection(data);
      if (!result.ok) throw new Error('This storage cannot import.');
      notify.success({ title: `Imported ${result.value.count} records` });
    } catch (error) {
      notify.error({ title: 'Import failed', message: toAppError(error).message });
    }
    setIsBusy(false);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    let data: CollectionExport;
    try {
      data = await readExport(file);
    } catch (error) {
      notify.error({ title: 'Import failed', message: toAppError(error).message });
      return;
    }
    modals.openConfirmModal({
      title: `Replace "${data.collection}"?`,
      children: (
        <Text size="sm">
          This replaces everything in the collection "{data.collection}" with the {data.records.length}{' '}
          records in the file. It cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Replace', cancel: 'Cancel' },
      confirmProps: { color: 'danger' },
      onConfirm: () => void runImport(data),
    });
  };

  return (
    <Section
      title="Storage"
      description="Where your records are saved. Switching does not move your data. Export from one place and import into the other."
    >
      <SectionRow label="Save records in" labelId="settings-storage">
        <Radio.Group aria-labelledby="settings-storage" value={selected} onChange={setActiveRecordProviderId}>
          <Stack gap="xs">
            {Object.values(recordProviders).map((provider) => (
              <Radio
                key={provider.id}
                value={provider.id}
                label={provider.name}
                description={provider.description}
              />
            ))}
          </Stack>
        </Radio.Group>
      </SectionRow>
      <SectionRow
        label="Move a collection"
        description="Export downloads the collection from the place chosen above. Import replaces a collection there with the file's records."
      >
        <Stack gap="sm">
          <TextInput
            label="Collection"
            value={collection}
            onChange={(event) => setCollection(event.currentTarget.value)}
          />
          <Group gap="xs">
            <Button
              variant="default"
              disabled={isBusy || collection.trim() === ''}
              onClick={() => void handleExport()}
            >
              Export
            </Button>
            <FileButton accept="application/json" onChange={(file) => void handleFile(file)}>
              {(props) => (
                <Button variant="default" disabled={isBusy} {...props}>
                  Import
                </Button>
              )}
            </FileButton>
          </Group>
        </Stack>
      </SectionRow>
    </Section>
  );
}
