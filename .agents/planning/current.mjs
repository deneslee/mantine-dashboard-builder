// Prints the current task from current.json: the first task not done or dropped.
// `pnpm current` shows that task with its parts; `pnpm current --all` lists every task.
import { readFileSync } from 'node:fs';

const { phases } = JSON.parse(readFileSync(new URL('current.json', import.meta.url), 'utf8'));
const isClosed = (item) => item.status === 'done' || item.status === 'dropped';
const MARKS = { done: '[x]', dropped: '[-]', todo: '[ ]' };

if (process.argv.includes('--all')) {
  for (const phase of phases) {
    console.log(`\n${phase.id} ${phase.title}`);
    for (const task of phase.tasks) {
      const closed = task.parts.filter(isClosed).length;
      const count = task.parts.length ? ` (${closed}/${task.parts.length})` : '';
      console.log(`  ${MARKS[task.status] ?? '[ ]'} ${task.id} ${task.title}${count}`);
    }
  }
} else {
  const phase = phases.find((p) => p.tasks.some((t) => !isClosed(t)));
  const task = phase?.tasks.find((t) => !isClosed(t));
  if (!task) {
    console.log('Every task is done.');
  } else {
    const next = task.parts.find((p) => !isClosed(p));
    console.log(`${phase.id} ${phase.title} › ${task.id} ${task.title}`);
    console.log(`Where:  ${task.where}`);
    console.log(`Result: ${task.result}\n`);
    for (const part of task.parts) {
      console.log(`${part === next ? '→' : ' '} ${MARKS[part.status] ?? '[ ]'} ${part.id} ${part.element}`);
    }
    if (task.parts.length && !next) console.log('\nAll parts done: set the task to done.');
  }
}
