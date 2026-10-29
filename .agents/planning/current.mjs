// Prints tasks from current.json. The current task is the first one not done or dropped.
//   pnpm current                 the current task with its parts
//   pnpm current --all           every task, with done counts and research/plan files
//   pnpm current --id P1.2       that task instead
//   pnpm current --next 3        the current task and the two open ones after it
//   pnpm current --json          the selected tasks as JSON (for the task-research skill)
//   pnpm current --number        the next free NN for a research or plan file
import { readdirSync, readFileSync } from 'node:fs';

const { phases } = JSON.parse(readFileSync(new URL('current.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const isClosed = (item) => item.status === 'done' || item.status === 'dropped';
const MARKS = { done: '[x]', dropped: '[-]', todo: '[ ]' };
const tasks = phases.flatMap((phase) => phase.tasks.map((task) => ({ ...task, phase: phase.id })));
const files = (task) =>
  [task.research && `research: ${task.research}`, task.plan && `plan: ${task.plan}`]
    .filter(Boolean)
    .join(' · ');

if (args.includes('--number')) {
  // Research and plan files share one sequence: research/04-x.md and plans/04-x.md belong together.
  const numbers = ['research', 'plans'].flatMap((dir) =>
    readdirSync(new URL(`${dir}/`, import.meta.url))
      .map((name) => /^(\d{2})-/.exec(name)?.[1])
      .filter(Boolean)
      .map(Number),
  );
  console.log(String(Math.max(0, ...numbers) + 1).padStart(2, '0'));
} else if (args.includes('--all')) {
  for (const phase of phases) {
    console.log(`\n${phase.id} ${phase.title}`);
    for (const task of phase.tasks) {
      const closed = task.parts.filter(isClosed).length;
      const count = task.parts.length ? ` (${closed}/${task.parts.length})` : '';
      const linked = files(task) ? `  ${files(task)}` : '';
      console.log(`  ${MARKS[task.status] ?? '[ ]'} ${task.id} ${task.title}${count}${linked}`);
    }
  }
} else {
  const id = option('--id');
  const start = id ? tasks.findIndex((t) => t.id === id) : tasks.findIndex((t) => !isClosed(t));
  if (id && start === -1) {
    console.error(`No task ${id} in current.json.`);
    process.exit(1);
  }
  const count = Number(option('--next') ?? 1);
  const selected =
    start === -1 ? [] : [tasks[start], ...tasks.slice(start + 1).filter((t) => !isClosed(t))].slice(0, count);

  if (args.includes('--json')) {
    console.log(JSON.stringify(selected, null, 2));
  } else if (selected.length === 0) {
    console.log('Every task is done.');
  } else {
    for (const task of selected) {
      const next = task.parts.find((p) => !isClosed(p));
      console.log(`${task.phase} › ${task.id} ${task.title}`);
      console.log(`Where:  ${task.where}`);
      console.log(`Result: ${task.result}`);
      if (files(task)) console.log(`Files:  ${files(task)}`);
      console.log('');
      for (const part of task.parts) {
        console.log(`${part === next ? '→' : ' '} ${MARKS[part.status] ?? '[ ]'} ${part.id} ${part.element}`);
      }
      if (task.parts.length && !next) console.log('\nAll parts done: set the task to done.');
      console.log('');
    }
  }
}
