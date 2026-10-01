/**
 * Placeholders shown the instant a guest opens a room or the checkout, while
 * the real page (prices, availability) is fetched. Shapes follow the pages'
 * layouts so nothing jumps when the content arrives.
 */

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-soft)] bg-line/70 ${className}`} />;
}

/** Bars on the dark green panels. */
function DarkBone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-soft)] bg-white/15 ${className}`} />;
}

export function RoomPageSkeleton() {
  return (
    <div className="wrap pt-8" aria-busy="true">
      <Bone className="h-4 w-28" />
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="grid grid-cols-3 gap-3 lg:col-span-7">
          <Bone className="col-span-2 row-span-2 aspect-[4/5]" />
          <Bone className="h-full" />
          <Bone className="h-full" />
        </div>
        <div className="lg:col-span-5">
          <Bone className="h-12 w-3/4" />
          <Bone className="mt-6 h-5 w-full" />
          <Bone className="mt-3 h-4 w-11/12" />
          <Bone className="mt-2 h-4 w-4/5" />
          <div className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Bone className="h-3 w-12" />
                <Bone className="mt-2 h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Bone key={i} className="h-4 w-4/5" />
            ))}
          </div>
        </div>
      </div>
      <Bone className="mt-16 h-10 w-80 max-w-full" />
      <div className="crest mt-6 rounded-[var(--radius-soft)] p-4 sm:p-6">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <DarkBone key={i} className="h-14 sm:h-[4.25rem] !rounded-[4px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="wrap pt-10" aria-busy="true">
      <Bone className="h-4 w-28" />
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <div className="crest rounded-[var(--radius-soft)] p-6 sm:p-7">
            <DarkBone className="h-4 w-24" />
            <div className="mt-4 flex gap-4">
              <DarkBone className="size-20 shrink-0 !rounded-[4px]" />
              <div className="flex-1">
                <DarkBone className="h-7 w-3/4" />
                <DarkBone className="mt-2 h-4 w-1/2" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <DarkBone key={i} className="h-10" />
              ))}
            </div>
            <DarkBone className="mt-6 h-8 w-1/2 ml-auto" />
          </div>
        </aside>
        <section className="lg:col-span-7 lg:row-start-1">
          <Bone className="h-12 w-2/3" />
          <Bone className="mt-3 mb-8 h-4 w-1/2" />
          <div className="grid gap-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid gap-5 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Bone className="h-4 w-24" />
                    <Bone className="mt-2 h-12" />
                  </div>
                ))}
              </div>
            ))}
            <Bone className="h-24" />
            <Bone className="h-12 w-48" />
          </div>
        </section>
      </div>
    </div>
  );
}
