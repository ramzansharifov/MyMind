import { useEffect, useState } from 'react'
import { BoardPage } from './pages/BoardPage'
import { NotesPage } from './pages/NotesPage'
import './App.css'

type AppPage = 'board' | 'notes'

function getPageFromHash(): AppPage {
  const hash = window.location.hash.replace('#/', '')

  if (hash === 'notes') return 'notes'

  return 'board'
}

function setPageHash(page: AppPage) {
  window.location.hash = `/${page}`
}

function App() {
  const [page, setPage] = useState<AppPage>(getPageFromHash)

  useEffect(() => {
    function handleHashChange() {
      setPage(getPageFromHash())
    }

    if (!window.location.hash) {
      setPageHash('board')
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-950 px-5">
        <div>
          <h1 className="text-sm font-semibold tracking-wide">
            Multifunctional Board
          </h1>
          <p className="text-xs text-slate-400">
            Board page + Notes page
          </p>
        </div>

        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageHash('board')}
            className={
              page === 'board'
                ? 'rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700'
                : 'rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10'
            }
          >
            Board
          </button>

          <button
            type="button"
            onClick={() => setPageHash('notes')}
            className={
              page === 'notes'
                ? 'rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700'
                : 'rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10'
            }
          >
            Notes
          </button>
        </nav>
      </header>

      {page === 'board' ? <BoardPage /> : <NotesPage />}
    </main>
  )
}

export default App
