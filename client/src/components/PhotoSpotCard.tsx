export type PhotoSpotCardProps = {
  name: string;
  region: string;
  imageSrc: string;
  onClick?: () => void;
};

export function PhotoSpotCard({
  name,
  region,
  imageSrc,
  onClick,
}: PhotoSpotCardProps) {
  return (
    <div
      className="relative h-64 rounded-sm shadow-lg overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02]"
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
      <div className="relative h-full flex flex-col justify-end p-6">
        <h3 
          className="text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight"
          style={{ 
            fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
            fontWeight: 900,
            letterSpacing: '-0.02em'
          }}
        >
          {name}
        </h3>
        <p className="text-base md:text-lg text-white/90" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
          {region}
        </p>
      </div>
    </div>
  );
}

