// Each import below breaks the core/ layer rule (lint/rules.test.ts counts them).
import { useState } from 'react';
import type { MantineTheme } from '@mantine/core';
import { create } from 'zustand';
import { notify } from '@/lib/notify/notify';
import { dimensions } from '@/ui/tokens/dimensions';
