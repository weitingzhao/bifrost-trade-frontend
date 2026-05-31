import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Displayed by React Router when a route throws during rendering or navigation.
 * Registered as the `errorElement` on the root layout route.
 */
export default function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let title = 'Something went wrong'
  let detail = 'An unexpected error occurred while loading this page.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    detail =
      error.status === 404
        ? 'Page not found.'
        : String((error.data as { message?: string } | undefined)?.message ?? detail)
  } else if (error instanceof Error) {
    detail = error.message
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-5 p-8 text-center bg-card text-card-foreground">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground font-mono max-w-md break-all">{detail}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <RotateCcw className="size-4 mr-2" />
          Go back
        </Button>
        <Button onClick={() => navigate('/', { replace: true })}>
          <Home className="size-4 mr-2" />
          Home
        </Button>
      </div>
    </div>
  )
}
