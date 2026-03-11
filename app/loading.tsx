/* Generic app-level loading skeleton shown by Next.js App Router while any
   page component is being loaded. This prevents the blank white flash between
   navigations and gives users immediate visual feedback. */
export default function Loading() {
  return (
    <div className="flex h-dvh w-full bg-white dark:bg-gray-900 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-[420px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
        {/* Search bar */}
        <div className="px-4 py-3">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        {/* Chat rows */}
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
      {/* Content area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-600">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-green-500 animate-spin" />
        </div>
      </div>
    </div>
  );
}
