/* Notifications page loading skeleton */
export default function NotificationsLoading() {
  return (
    <div className="flex h-dvh w-full bg-white dark:bg-gray-900 animate-pulse">
      <div className="hidden md:flex flex-col w-[420px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        </div>
        {/* Notification cards */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
