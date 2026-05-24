import React from 'react'

// Skeleton matching the actual NomadCard structure so the layout doesn't shift
// when real data lands. Uses neutral grays — themed skeletons aren't worth the
// complexity since the real card paint happens within ~50ms anyway.
export function LoadingProfile() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 md:p-12 animate-pulse">
          {/* Avatar */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="w-24 h-24 sm:w-30 sm:h-30 rounded-full bg-gray-200" />
          </div>

          {/* Name + role */}
          <div className="text-center mb-3 sm:mb-4 space-y-2">
            <div className="h-7 sm:h-9 w-48 bg-gray-200 rounded-lg mx-auto" />
            <div className="h-4 w-32 bg-gray-200 rounded-lg mx-auto" />
          </div>

          {/* Location */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-4 w-40 bg-gray-200 rounded-lg" />
          </div>

          {/* Bio */}
          <div className="text-center mt-5 mb-6 max-w-lg mx-auto space-y-2 px-6">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded mx-auto" />
          </div>

          {/* Stat strip */}
          <div className="flex items-center justify-center gap-10 my-6 py-4 border-y border-gray-100">
            <div className="text-center space-y-2">
              <div className="h-7 w-10 bg-gray-200 rounded mx-auto" />
              <div className="h-2.5 w-16 bg-gray-200 rounded mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <div className="h-7 w-20 bg-gray-200 rounded mx-auto" />
              <div className="h-2.5 w-20 bg-gray-200 rounded mx-auto" />
            </div>
          </div>

          {/* Map placeholder */}
          <div className="my-6 h-32 sm:h-40 bg-gray-100 rounded-lg" />

          {/* Pills */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            <div className="h-6 w-32 bg-gray-200 rounded-full" />
          </div>

          {/* Link rows */}
          <div className="space-y-2 sm:space-y-3">
            <div className="h-12 sm:h-14 bg-gray-100 rounded-xl border border-gray-200" />
            <div className="h-12 sm:h-14 bg-gray-100 rounded-xl border border-gray-200" />
            <div className="h-12 sm:h-14 bg-gray-100 rounded-xl border border-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}
