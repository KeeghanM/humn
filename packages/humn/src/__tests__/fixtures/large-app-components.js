import { h } from '../../index.js'

function recordRender(counters, name) {
  counters[name] = (counters[name] || 0) + 1
}

export function createRenderCounters() {
  return {
    App: 0,
    Header: 0,
    Row: 0,
    RowList: 0,
    Sidebar: 0,
  }
}

export function createLargeAppComponents(
  cortex,
  counters = createRenderCounters(),
) {
  const Header = () => {
    recordRender(counters, 'Header')
    const { filter } = cortex.memory

    return h('header', { 'data-testid': 'large-header' }, [
      h('h1', {}, 'Operations Console'),
      h('input', {
        'data-testid': 'large-filter',
        oninput: (event) => cortex.synapses.setFilter(event.target.value),
        value: filter,
      }),
    ])
  }

  const Sidebar = () => {
    recordRender(counters, 'Sidebar')
    const { activeId, sidebarOpen, stats } = cortex.memory

    return h('aside', { 'data-testid': 'large-sidebar' }, [
      h('p', {}, `Sidebar: ${sidebarOpen ? 'open' : 'closed'}`),
      h('p', {}, `Active: ${activeId}`),
      h('p', {}, `Notifications: ${stats.notifications}`),
      h('p', {}, `Saves: ${stats.saves}`),
    ])
  }

  const Row = ({ row }) => {
    recordRender(counters, 'Row')
    const className = row.selected ? 'selected' : ''

    return h(
      'li',
      {
        class: className,
        'data-row-id': String(row.id),
        key: row.id,
      },
      [
        h(
          'button',
          { onclick: () => cortex.synapses.setActive(row.id) },
          row.id,
        ),
        h('span', {}, row.label),
        h('strong', {}, String(row.score)),
      ],
    )
  }

  const RowList = () => {
    recordRender(counters, 'RowList')
    const { filter, rows } = cortex.memory
    const normalizedFilter = filter.trim().toLowerCase()
    const visibleRows = normalizedFilter
      ? rows.filter((row) => row.label.toLowerCase().includes(normalizedFilter))
      : rows

    return h(
      'ul',
      { 'data-testid': 'large-list' },
      visibleRows.map((row) => h(Row, { key: row.id, row })),
    )
  }

  const App = () => {
    recordRender(counters, 'App')

    return h('main', { 'data-testid': 'large-app' }, [
      h(Header),
      h(Sidebar),
      h(RowList),
    ])
  }

  return { App, counters }
}
