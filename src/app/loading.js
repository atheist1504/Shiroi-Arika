import { HomeSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0c0a] pt-32 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <HomeSkeleton />
      </div>
    </div>
  );
}
