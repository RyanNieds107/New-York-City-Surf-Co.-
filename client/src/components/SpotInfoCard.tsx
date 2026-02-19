export function SpotInfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-none shadow-sm border-2 border-black relative overflow-hidden transition-all duration-200" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
    }}>
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b-2 border-black">
        <h3 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>{title.toUpperCase()}</h3>
      </div>
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        <div className="text-sm sm:text-base text-black leading-relaxed space-y-3 sm:space-y-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{children}</div>
      </div>
    </div>
  );
}
