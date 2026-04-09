'use client';

import { MangaDetailSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0c0a] pt-24 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <MangaDetailSkeleton />
      </div>
    </div>
  );
}
