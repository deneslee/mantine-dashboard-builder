// Contracts and lower layers: a feature may import all of these (lint/rules.test.ts expects none flagged).
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { storageKey } from '@/lib/storage';
import { useNav } from '@/shell/useShell';
import { Page } from '@/ui/components/Page';
import { AppError } from '@/core/errors/AppError';
import { wait } from '@/utils/wait';
