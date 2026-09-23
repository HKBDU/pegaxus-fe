export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-20" role="status">
      <div className="size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="animate-pulse text-gray-500">Đang tải dữ liệu...</p>
    </div>
  )
}

export function ErrorState({
  message = 'Đã có lỗi xảy ra',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-10 text-center text-red-600" role="alert">
      <p className="font-bold">Oops!</p>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="mt-4 underline" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ message = 'Không có dữ liệu nào' }: { message?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
      <p>{message}</p>
    </div>
  )
}
