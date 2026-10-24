// relay/ may import these (lint/rules.test.ts expects none flagged).
import { RELAY_ROUTES } from '../../src/core/relay/relayContract';
import { Hono } from 'hono';
import sql from 'mssql';
