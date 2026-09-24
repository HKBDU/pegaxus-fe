import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p>404</p>
        <h1>Page not found</h1>
        <Link to="/">Return home</Link>
      </div>
    </main>
  )
}
