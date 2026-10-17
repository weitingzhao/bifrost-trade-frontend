/**
 * The phone's tab bar (DESIGN_CONTRACTS §18.4): Home · Trade · Portfolio ·
 * Research · More, 49 high above the home indicator, float glass with an ink
 * 8% top edge. The current tab is the view's one accent. On a tab's own root,
 * a second tap scrolls the page back to the top.
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { PHONE_TABS, phoneTabOf, type PhoneTab } from './phoneTabs'
import css from './phone.module.css'

function TabGlyph({ tab }: { tab: PhoneTab }) {
  if (!tab.d) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="5.5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="18.5" cy="12" r="1.8" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={tab.d} />
    </svg>
  )
}

export function PhoneTabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = moreOpen ? 'more' : phoneTabOf(pathname)
  return (
    <nav className={css.tabs} aria-label="Sections" data-glass-surface="surface" data-no-tip="">
      {PHONE_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={css.tab}
          aria-label={t.label}
          aria-current={t.id === current ? 'page' : undefined}
          onClick={() => {
            if (t.to == null) {
              onMore()
              return
            }
            if (pathname === t.to) {
              document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
              return
            }
            navigate(t.to)
          }}
        >
          <TabGlyph tab={t} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
