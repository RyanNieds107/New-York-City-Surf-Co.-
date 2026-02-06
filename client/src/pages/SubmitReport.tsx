import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Star, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// Quick note options (predefined chips)
const QUICK_NOTES = [
  "Better than predicted",
  "Forecast was spot on",
  "Wind was worse than expected",
  "Smaller than forecast",
  "Bigger than forecast",
  "Crowd was insane",
  "Had it to myself",
];

// Crowd level labels
const CROWD_LABELS = ["Empty", "Light", "Moderate", "Crowded", "Packed"];

// Compress image on client before sending
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;  // Reasonable for surf photos
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compress to 80% quality JPEG
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function SubmitReport() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  // Parse URL params
  const params = new URLSearchParams(search);
  const spotId = parseInt(params.get("spotId") || "0");
  const sessionDate = params.get("sessionDate") || "";
  const viewId = params.get("viewId") ? parseInt(params.get("viewId")) : undefined;

  // Form state
  const [starRating, setStarRating] = useState<number>(3);
  const [crowdLevel, setCrowdLevel] = useState<number>(3);
  const [skipCrowd, setSkipCrowd] = useState(false);
  const [waveHeightActual, setWaveHeightActual] = useState<string>("");
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Queries
  const { data: spot } = trpc.spots.getById.useQuery({ id: spotId }, { enabled: spotId > 0 });

  // Mutation
  const submitMutation = trpc.reports.submit.useMutation({
    onSuccess: () => {
      toast.success("Report submitted! Thank you for helping the community.");
      setLocation("/members");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit report");
    },
  });

  // Handle photo upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPhotoBase64(compressed);
      setPhotoPreview(compressed);
      toast.success("Photo compressed and ready");
    } catch (error) {
      console.error('Compression error:', error);
      toast.error("Failed to compress photo");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const waveHeightTenths = waveHeightActual && parseFloat(waveHeightActual) > 0
      ? Math.round(parseFloat(waveHeightActual) * 10)
      : undefined;

    submitMutation.mutate({
      spotId,
      sessionDate,
      starRating,
      crowdLevel: skipCrowd ? undefined : crowdLevel,
      photoBase64: photoBase64 || undefined,
      quickNote: selectedNote || undefined,
      forecastViewId: viewId,
      waveHeightActual: waveHeightTenths,
    });
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  if (!spotId || !sessionDate) {
    return <div className="min-h-screen flex items-center justify-center">
      <p>Invalid report link</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-black">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Logo logoSize="h-8" showLink={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-black">
          {/* Title */}
          <div className="border-b-2 border-black p-6">
            <h1 className="text-4xl font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              How was {spot?.name}?
            </h1>
            <p className="text-sm text-gray-700 mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div className="p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-black uppercase mb-4 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Overall Rating
              </h3>
              <div className="flex gap-2 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setStarRating(rating)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-10 w-10 sm:h-11 sm:w-11 ${
                        rating <= starRating
                          ? "fill-yellow-400 stroke-yellow-500"
                          : "stroke-gray-400 fill-transparent"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Crowd - how was the crowd during your session */}
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  How was the crowd?
                </h3>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipCrowd}
                    onChange={(e) => setSkipCrowd(e.target.checked)}
                    className="rounded"
                  />
                  Skip
                </label>
              </div>
              <p className="text-sm text-gray-700 mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Report how crowded it was during your session.
              </p>

              {!skipCrowd && (
                <div className="space-y-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={crowdLevel}
                    onChange={(e) => setCrowdLevel(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <p className="text-center font-bold text-gray-800" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {CROWD_LABELS[crowdLevel - 1]}
                  </p>
                </div>
              )}
            </div>

            {/* Wave Height */}
            <div className="p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-black uppercase mb-2 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Wave Height (Optional)
              </h3>
              <p className="text-sm text-gray-700 mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                What were the actual wave heights? This helps validate conditions data.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={waveHeightActual}
                  onChange={(e) => setWaveHeightActual(e.target.value)}
                  placeholder="e.g., 3.5"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
                <span className="text-sm text-gray-600 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>feet</span>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-black uppercase mb-4 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Add Photo (Optional)
              </h3>

              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover border-2 border-black" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoBase64(null);
                    }}
                    className="absolute top-2 right-2 bg-black text-white px-3 py-1 text-sm font-semibold uppercase hover:bg-gray-800 transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-400 rounded-lg p-10 flex flex-col items-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-12 w-12 text-gray-500 mb-3 animate-spin" />
                      <span className="text-sm text-gray-700 font-medium">Compressing photo...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-12 w-12 text-gray-500 mb-3" />
                      <span className="text-sm text-gray-700 font-medium mb-1">Click to upload photo</span>
                      <span className="text-xs text-gray-600">Max 5MB · Will be compressed for fast upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={isCompressing}
                  />
                </label>
              )}
            </div>

            {/* Quick Notes */}
            <div className="p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-black uppercase mb-4 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Quick Note (Optional)
              </h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setSelectedNote(selectedNote === note ? null : note)}
                    className={`px-4 py-2 text-xs font-semibold border-2 transition-all rounded-sm ${
                      selectedNote === note
                        ? "bg-black text-white border-black shadow-md"
                        : "bg-white text-gray-800 border-gray-400 hover:border-black hover:shadow-sm"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="p-6 bg-black">
              <Button
                type="submit"
                disabled={submitMutation.isPending || isCompressing}
                className="w-full bg-white text-black hover:bg-gray-100 font-black text-lg py-6"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {submitMutation.isPending || isCompressing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
