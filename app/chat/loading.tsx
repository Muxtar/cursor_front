/* Chat page loading skeleton */
export default function ChatLoading() {
  return (
    <div className="flex h-dvh w-full bg-white dark:bg-gray-900 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-[420px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-10" />
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat window skeleton */}
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {[
            { mine: false, w: 'w-48' },
            { mine: true,  w: 'w-56' },
            { mine: false, w: 'w-40' },
            { mine: true,  w: 'w-64' },
            { mine: false, w: 'w-52' },
            { mine: true,  w: 'w-36' },
          ].map(({ mine, w }, i) => (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`${w} h-10 rounded-2xl bg-gray-200 dark:bg-gray-700 ${mine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} />
            </div>
          ))}
        </div>
        {/* Message input */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
