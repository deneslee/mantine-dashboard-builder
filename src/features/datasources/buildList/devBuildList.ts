import { AppError } from '@/core/errors/AppError';

/**
 * Asks the dev server to write `plugins.json` (plugins.config.ts serves `POST /__plugins`). The
 * server then reloads the page with the new build list; commit the file to deploy it.
 */
export async function writeDevBuildList(plugins: string[]): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/__plugins', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plugins }),
    });
  } catch (error) {
    throw new AppError('network', "The dev server didn't answer. Is `vp run dev` running?", { cause: error });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new AppError('unknown', body?.error ?? `The dev server answered ${res.status}.`);
  }
}
