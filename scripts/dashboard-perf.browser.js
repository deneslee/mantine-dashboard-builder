// Run against pnpm preview with playwright-cli run-code --filename=scripts/dashboard-perf.browser.js
;async (page) => {
  const base = await page.evaluate(() => location.origin + '/mantine-dashboard-builder')
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(base + '/dashboards/perf?mode=edit')
  await page.locator('#widget-chart-1 .recharts-surface').waitFor()
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'))
  await page.evaluate(async () => {
    const charts = [...document.querySelectorAll('.recharts-responsive-container')]
    const data = (window.dashboardPerf = { charts: charts.length, resizes: [], tasks: [], start: 0 })
    const sizes = new WeakMap()
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = entry.contentRect.width + ':' + entry.contentRect.height
        if (sizes.has(entry.target) && sizes.get(entry.target) !== size && data.start)
          data.resizes.push({ id: entry.target.closest('[id^="widget-"]').id, time: performance.now(), size })
        sizes.set(entry.target, size)
      }
    })
    charts.forEach((chart) => ro.observe(chart))
    const po = new PerformanceObserver((list) =>
      data.tasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration }))),
    )
    po.observe({ type: 'longtask', buffered: false })
    data.observers = [ro, po]
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  const measurements = []
  for (let trial = 1; trial <= 3; trial++) {
    for (const action of ['drag', 'resize']) {
      await page.getByRole('button', { name: 'Discard', exact: true }).click()
      const target =
        action === 'drag'
          ? page.locator('#widget-chart-1 [data-widget-drag]')
          : page.locator('#widget-chart-1').locator('..').locator('.react-resizable-handle-se')
      await target.scrollIntoViewIfNeeded()
      const box = await target.boundingBox()
      const x = action === 'drag' ? box.x + 40 : box.x + box.width / 2
      const y = action === 'drag' ? box.y + 20 : box.y + box.height / 2
      await page.evaluate(() => {
        window.dashboardPerf.resizes = []
        window.dashboardPerf.tasks = []
        window.dashboardPerf.start = performance.now()
      })
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + (action === 'drag' ? 110 : -110), y + (action === 'drag' ? 0 : 60), {
        steps: 12,
      })
      await page.mouse.up()
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      const result = await page.evaluate(() => {
        const data = window.dashboardPerf
        const end = performance.now()
        const tasks = data.tasks.filter(
          (task) => task.startTime < end && task.startTime + task.duration > data.start,
        )
        const perChart = {}
        for (const entry of data.resizes) perChart[entry.id] = (perChart[entry.id] ?? 0) + 1
        data.start = 0
        return {
          charts: data.charts,
          durationMs: end - data.start,
          resizes: data.resizes.length,
          perChart,
          longTasks: tasks.length,
          longestTaskMs: Math.max(0, ...tasks.map((task) => task.duration)),
        }
      })
      measurements.push({ trial, action, ...result })
    }
  }
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  const environment = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    visible: document.visibilityState,
    zoom: visualViewport.scale,
  }))
  return { environment, measurements }
}
