/* Explore page loading skeleton */
export default function ExploreLoading() {
  return (
    <div className="flex h-dvh w-full bg-white dark:bg-gray-900 animate-pulse">
      {/* Sidebar skeleton */}
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
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          {/* Category pills */}
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" style={{ width: `${60 + i * 10}px` }} />
            ))}
          </div>
        </div>
        {/* Product grid */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
