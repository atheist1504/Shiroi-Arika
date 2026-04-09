import React from 'react';

/**
 * SHIROI ARIKA SKELETON SYSTEM (TypeScript)
 * Premium "shimmer" effect for loading states.
 */

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

// Specific Skeletons for faster UI building
export const MangaCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
    <div className="space-y-2 px-1">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  </div>
);

export const HomeSkeleton = () => (
  <div className="space-y-12">
    {/* Featured Skeleton */}
    <div className="relative h-[60vh] rounded-3xl overflow-hidden">
       <Skeleton className="w-full h-full rounded-3xl" />
    </div>
    
    {/* Grid Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
       {[...Array(12)].map((_, i) => (
         <MangaCardSkeleton key={i} />
       ))}
    </div>
  </div>
);

export const MangaDetailSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
    {/* Left: Cover */}
    <div className="md:col-span-4 space-y-6">
       <Skeleton className="aspect-[2/3] w-full rounded-3xl shadow-2xl shadow-green-500/10" />
       <div className="flex gap-4">
          <Skeleton className="h-14 flex-1 rounded-2xl" />
          <Skeleton className="h-14 w-14 rounded-2xl" />
       </div>
    </div>

    {/* Right: Info */}
    <div className="md:col-span-8 space-y-8">
       <div className="space-y-4">
          <Skeleton className="h-12 w-3/4 rounded-xl" />
          <div className="flex gap-2">
             <Skeleton className="h-6 w-20 rounded-full" />
             <Skeleton className="h-6 w-20 rounded-full" />
          </div>
       </div>
       
       <div className="space-y-4 pt-10">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
       </div>

       <div className="pt-10 space-y-4">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <div className="space-y-3">
             <Skeleton className="h-16 w-full rounded-2xl" />
             <Skeleton className="h-16 w-full rounded-2xl" />
             <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
       </div>
    </div>
  </div>
);
