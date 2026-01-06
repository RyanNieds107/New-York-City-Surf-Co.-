import { Car, Train } from "lucide-react";

export type PhotoSpotCardProps = {
  name: string;
  region: string;
  imageSrc: string;
  onClick?: () => void;
  distance?: {
    distanceMiles: number;
    durationMinutes: number;
    durationText: string;
  } | null;
  isLoadingDistance?: boolean;
  travelMode?: "driving" | "transit";
};

export function PhotoSpotCard({
  name,
  region,
  imageSrc,
  onClick,
  distance,
  isLoadingDistance,
  travelMode = "driving",
}: PhotoSpotCardProps) {
  const TravelIcon = travelMode === "transit" ? Train : Car;

  return (
    <div
      className="relative h-48 sm:h-56 md:h-64 rounded-sm shadow-lg overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02]"
      style={{ borderRadius: '2px' }}
      onClick={onClick}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${encodeURI(imageSrc)})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-4 sm:p-5 md:p-6">
        <h3
          className="text-2xl sm:text-3xl md:text-4xl text-white mb-1 sm:mb-2 uppercase tracking-tight"
          style={{
            fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
            fontWeight: 900,
            letterSpacing: '-0.02em'
          }}
        >
          {name}
        </h3>
        <p className="text-sm sm:text-base md:text-lg text-white/90" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
          {region}
        </p>

        {/* Distance/ETA line */}
        {isLoadingDistance ? (
          <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/70" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            <TravelIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>...</span>
          </div>
        ) : distance ? (
          <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/70" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            <TravelIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>
              {distance.distanceMiles} mi • {travelMode === "transit" ? distance.durationText : `${distance.durationMinutes} min`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

