export default function Loading() {
  return (
    <div className="flex h-screen w-full bg-slate-950 animate-in fade-in duration-200">
      
      <aside className="hidden lg:flex w-80 flex-col border-r border-slate-800 bg-black p-4">
        <div className="mb-5">
          <div className="h-5 w-36 rounded bg-slate-800/70 animate-pulse" />
          <div className="h-3 w-52 rounded bg-slate-800/40 animate-pulse mt-2" />
        </div>
        <div className="h-9 rounded-full bg-slate-900/70 border border-slate-800/70 animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
              <div className="h-10 w-10 rounded-full bg-slate-800/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-slate-800/60 animate-pulse" />
                <div className="h-3 w-40 rounded bg-slate-800/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </aside>

   
      <div className="flex-1 flex flex-col items-center justify-center bg-black">
        <div className="h-16 w-16 rounded-full bg-slate-900/50 border border-slate-800/70 animate-pulse" />
        <div className="h-4 w-40 rounded bg-slate-800/50 animate-pulse mt-4" />
        <div className="h-3 w-56 rounded bg-slate-800/30 animate-pulse mt-2" />
      </div>
    </div>
  );
}
