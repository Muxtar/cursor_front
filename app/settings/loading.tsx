/* Settings page loading skeleton */
export default function SettingsLoading() {
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
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Settings menu skeleton */}
        <div className="md:w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 p-4 space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        {/* Settings content skeleton */}
        <div className="flex-1 p-6 space-y-4">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
