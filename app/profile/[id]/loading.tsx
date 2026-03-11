/* Profile page loading skeleton */
export default function ProfileLoading() {
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
      <div className="flex-1 overflow-hidden">
        {/* Profile hero */}
        <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
        <div className="px-4 pb-4 -mt-12 space-y-4">
          <div className="flex items-end justify-between">
            <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-900" />
            <div className="flex gap-2 pb-2">
              <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-72 max-w-full" />
          </div>
          {/* Stats row */}
          <div className="flex gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
