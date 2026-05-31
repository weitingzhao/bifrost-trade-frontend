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

  let title = '发生错误'
  let detail = '页面加载时遇到意外问题。'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    detail = error.status === 404 ? '找不到该页面。' : (error.data?.message ?? detail)
  } else if (error instanceof Error) {
    detail = error.message
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-5 p-8 text-center bg-background">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground font-mono max-w-md break-all">{detail}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <RotateCcw className="size-4 mr-2" />
          返回
        </Button>
        <Button onClick={() => navigate('/', { replace: true })}>
          <Home className="size-4 mr-2" />
          首页
        </Button>
      </div>
    </div>
  )
}
