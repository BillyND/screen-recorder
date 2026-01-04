import React from 'react'

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Screen Recorder</h1>
        <p>Version: {window.api?.getVersion?.() || '1.0.0'}</p>
      </header>
      <main className="app-main">
        <p>Recording controls will be added in Phase 07</p>
      </main>
    </div>
  )
}

export default App
