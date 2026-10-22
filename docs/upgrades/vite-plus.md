Pro
One version to bump. vite-plus replaces separate vite, vitest, oxlint and oxlint-tsgolint pins, and vp migrate keeps them aligned.
vp check runs format, lint and type checks in one pass. You already have typeAware: true, so the move is easy.
Git hooks without Husky. vp staged and the built-in hooks would add pre-commit checks, which the repo doesn’t have yet. Your Conventional Commits and “lint before done” rules are currently not enforced at commit time.
It fits your plans later:
vp run (Vite Task) caches workspace tasks, so it could stand in for Turborepo when you split into packages.
vp pack (tsdown) would help if you publish an embeddable widget/plugin SDK for the SaaS.
Project-local only is a supported setup. You lose vp env, vp upgrade and vp implode. That’s fine, because you already handle Node with .nvmrc and setup-node. Commands run as pnpm exec vp … or through your scripts, so CI barely changes. Your engines (Node ≥24.15) already meet the Node ^24.11 requirement.
It’s MIT, stable since 1.0 (Sep 28), and widely used. Around 2M weekly downloads, and Hono and Tiptap are among the adopters.
Contra
Storybook + Vitest browser mode is the riskiest part. The Vite+ docs don’t mention Storybook at all, and vite gets aliased to @voidzero-dev/vite-plus-core through pnpm overrides. The known issues include vitest/internal/browser resolution errors under pnpm and duplicate core copies. Your storybook Vitest project, with Chromium, Playwright and the a11y checks, runs right through that path.
Your lint setup would need rework.
Vite+ advises against oxlint.config.ts and wants a lint block in vite.config.ts. Your layer rules and the ./lint/plugin.js JS plugin would have to move there.
Migration removes the standalone oxlint dependency. But lint/rules.test.ts calls node_modules/oxlint/bin/oxlint directly, so the tests proving your rules fire would break until rewritten.
Prettier vs. Oxfmt. You chose Prettier on purpose (oxc.enable.oxfmt: false), and it formats your many Markdown and YAML docs. If you keep it, you’d set check: { fmt: false } and lose one of the main gains. If you switch, expect a whole-repo reformat diff and a check of how the docs come out.
It doesn’t replace everything. Stylelint isn’t covered. The docs don’t say typeCheck replaces tsc -b with project references, so you’d keep that. Storybook stays separate. You still end up with several tools.
Built-in commands take over your script names. vp build is just a Vite build. Your tsc -b && vite build would need vp run build.
Migration edits files you’ve curated. For a project not yet on Vite+, vp migrate always does the full setup: hooks, editor config, and agent files. That means changes to your hand-written AGENTS.md and .vscode, so review the diff carefully.
Release lag and churn. You only get new Vite, Vitest or oxlint versions when Vite+ releases them. It went from 1.0 to 1.3 in about 3.5 weeks. VoidZero now belongs to Cloudflare. That’s low risk under MIT, but worth knowing.
Timing. Your tasks.md still lists “First CI run” as open. A toolchain swap before CI has ever gone green makes it harder to tell what broke what.

When I’d revisit it: at the monorepo split, comparing vp run with Turborepo, or when you package the embed SDK, where vp pack helps. Keep in mind that neither tool understands your Python backend or ML service beyond running their scripts. Vite+’s remote caching also hasn’t shipped yet. If you want to test it cheaply before then, use a throwaway branch: the deciding check is whether pnpm test passes, including the storybook project.
