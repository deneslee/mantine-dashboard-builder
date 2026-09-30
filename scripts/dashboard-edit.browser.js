// Run against pnpm preview with:
// playwright-cli -s=dashboard-edit run-code --filename=scripts/dashboard-edit.browser.js
;async (page) => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const base = await page.evaluate(() => location.origin + '/mantine-dashboard-builder')
  // Suppress native unload dialogs in this CLI harness; the SPA leave guard is asserted below.
  await page.addInitScript(() =>
    window.addEventListener('beforeunload', (event) => event.stopImmediatePropagation(), { capture: true }),
  )
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto(base + '/dashboards/sales')
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('dashboard.')) localStorage.removeItem(key)
  })
  await page.reload()
  await page.getByRole('link', { name: 'Edit dashboard', exact: true }).click()
  const menu = async (title, action) => {
    await page.getByRole('button', { name: 'Actions for ' + title, exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('menuitem', { name: action, exact: true }).click()
  }
  let exportedPath
  const exportDocument = async () => {
    await page.evaluate(() => {
      const original = URL.createObjectURL
      URL.createObjectURL = (blob) => {
        window.dashboardExport = blob.text()
        URL.createObjectURL = original
        return original(blob)
      }
    })
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export JSON', exact: true }).click()
    exportedPath = await (await waiting).path()
    return JSON.parse(await page.evaluate(() => window.dashboardExport))
  }
  const initial = await exportDocument()
  await menu('Revenue', 'Edit')
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Edited revenue')
  await page.getByRole('textbox', { name: 'Description', exact: true }).focus()
  assert(await page.getByText('Unsaved changes', { exact: true }).isVisible(), 'blur did not commit')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  const undone = await exportDocument()
  assert(JSON.stringify(undone) === JSON.stringify(initial), 'edit + undo changed exported document')
  await page.locator('input[type="file"]').setInputFiles(exportedPath)
  assert(JSON.stringify(await exportDocument()) === JSON.stringify(undone), 'import was not identical')
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Saved revenue')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText('Saved locally', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert(await page.getByText('Unsaved changes', { exact: true }).isVisible(), 'Undo after Save was clean')
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  assert(await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled(), 'Discard kept history')
  assert(
    (await page.getByRole('textbox', { name: 'Title', exact: true }).inputValue()) === 'Saved revenue',
    'Discard did not restore saved baseline',
  )

  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Recovered draft')
  await page.getByRole('textbox', { name: 'Title', exact: true }).focus()
  await page.reload()
  await page.getByRole('textbox', { name: 'Description', exact: true }).waitFor()
  assert(
    (await page.getByRole('textbox', { name: 'Description', exact: true }).inputValue()) ===
      'Recovered draft',
    'reload lost draft',
  )
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await menu('Saved revenue', 'Duplicate')
  await page.getByRole('region', { name: 'Saved revenue copy', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert(
    (await page.getByRole('region', { name: 'Saved revenue copy', exact: true }).count()) === 0,
    'Duplicate undo failed',
  )
  await menu('Saved revenue', 'Resize…')
  await page.getByRole('textbox', { name: 'Width (columns)', exact: true }).fill('7')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  assert(
    await page
      .getByRole('button', { name: 'Actions for Saved revenue', exact: true })
      .evaluate((el) => el === document.activeElement),
    'resize did not return focus',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert(
    (await exportDocument()).layouts.lg.find((item) => item.i === 'revenue').w ===
      initial.layouts.lg.find((item) => item.i === 'revenue').w,
    'resize undo failed',
  )
  await menu('Saved revenue', 'Move to…')
  await page.getByRole('textbox', { name: 'Column', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  assert((await exportDocument()).layouts.lg.find((item) => item.i === 'revenue').x === 1, 'Move failed')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await menu('Saved revenue', 'Remove')
  assert(
    (await page.getByRole('region', { name: 'Saved revenue', exact: true }).count()) === 0,
    'Remove failed',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByRole('button', { name: 'Add widget', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('New widget')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const added = await exportDocument()
  const addedId = Object.entries(added.widgets).find(([, widget]) => widget.title === 'New widget')[0]
  assert(added.layouts.lg.at(-1).i === addedId, 'Add was not at bottom')
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()

  const beforeDrag = await exportDocument()
  const header = page.locator('#widget-revenue [data-widget-drag]')
  const box = await header.boundingBox()
  await page.mouse.move(box.x + 40, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 140, box.y + 20, { steps: 12 })
  await page.mouse.up()
  const dragged = await exportDocument()
  assert(
    JSON.stringify(dragged.layouts) !== JSON.stringify(beforeDrag.layouts),
    'pointer drag did not change layout',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert(
    JSON.stringify((await exportDocument()).layouts) === JSON.stringify(beforeDrag.layouts),
    'one Undo did not restore drag',
  )
  assert(
    await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled(),
    'drag added multiple undo steps',
  )
  const handle = await page
    .locator('#widget-revenue')
    .locator('..')
    .locator('.react-resizable-handle-se')
    .boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 - 110, handle.y + handle.height / 2 + 60, { steps: 12 })
  await page.mouse.up()
  assert(
    JSON.stringify((await exportDocument()).layouts) !== JSON.stringify(beforeDrag.layouts),
    'pointer resize did not change layout',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert(
    JSON.stringify((await exportDocument()).layouts) === JSON.stringify(beforeDrag.layouts),
    'one Undo did not restore resize',
  )
  assert(
    await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled(),
    'resize added multiple undo steps',
  )
  await menu('Saved revenue', 'Edit')
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved before leaving')
  await page.getByRole('textbox', { name: 'Description', exact: true }).focus()
  await page.getByRole('link', { name: 'Operations', exact: true }).click()
  await page.getByRole('dialog', { name: 'Leave with unsaved changes?', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert(page.url().includes('/dashboards/sales'), 'leave guard did not cancel')
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await page.getByRole('link', { name: 'Operations', exact: true }).click()
  await page.getByRole('heading', { name: 'Operations', exact: true }).waitFor()
  assert(
    (await page.getByRole('region', { name: 'Saved revenue', exact: true }).count()) === 0,
    'other dashboard leaked tiles',
  )
  return {
    passed: [
      'blur/undo',
      'export/import identical',
      'Save/Undo',
      'Discard',
      'draft reload',
      'duplicate/remove/add',
      'keyboard move/resize/focus',
      'pointer drag/resize one undo each',
      'leave guard',
      'dashboard isolation',
    ],
  }
}
