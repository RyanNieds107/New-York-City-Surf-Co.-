import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Star, Camera, Loader2, ArrowLeft } from "lucide-react";
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

// Wave height categories: label + value in tenths of feet for API (null = not selected)
const WAVE_HEIGHT_CATEGORIES: { label: string; valueTenths: number | null }[] = [
  { label: "FLAT", valueTenths: 0 },
  { label: "1–2 ft", valueTenths: 15 },
  { label: "2–3 ft", valueTenths: 25 },
  { label: "3–4 ft", valueTenths: 35 },
  { label: "4–5 ft", valueTenths: 45 },
  { label: "5–6 ft", valueTenths: 55 },
  { label: "6–8 ft", valueTenths: 70 },
  { label: "6–10 ft", valueTenths: 80 },
  { label: "8–12 ft", valueTenths: 100 },
];

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
  const [waveHeightCategory, setWaveHeightCategory] = useState<number>(0); // required; default FLAT
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

    submitMutation.mutate({
      spotId,
      sessionDate,
      starRating,
      crowdLevel: skipCrowd ? undefined : crowdLevel,
      photoBase64: photoBase64 || undefined,
      quickNote: selectedNote || undefined,
      forecastViewId: viewId,
      waveHeightActual: waveHeightCategory,
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-gray-700"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Members
          </Link>
          <Logo logoSize="h-8" showLink={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white border-2 border-black">
          {/* Title - compact */}
          <div className="border-b-2 border-black px-4 py-3 flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-black uppercase text-black truncate" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              How was {spot?.name}?
            </h1>
            <span className="text-xs text-gray-600 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Star Rating - one row */}
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
              <span className="text-sm font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Rating
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setStarRating(rating)}
                    className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        rating <= starRating
                          ? "fill-yellow-400 stroke-yellow-500"
                          : "stroke-gray-400 fill-transparent"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Crowd - label + skip + slider inline */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
<span className="text-sm font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Crowd
              </span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={skipCrowd}
                    onChange={(e) => setSkipCrowd(e.target.checked)}
                    className="rounded"
                  />
                  Skip
                </label>
              </div>
              {!skipCrowd && (
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={crowdLevel}
                    onChange={(e) => setCrowdLevel(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black max-w-[200px]"
                  />
                  <span className="text-xs font-semibold text-gray-800 w-16" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {CROWD_LABELS[crowdLevel - 1]}
                  </span>
                </div>
              )}
            </div>

            {/* Wave height - required, scrollable dropdown */}
            <div className="px-4 py-3 border-b border-gray-200">
              <label className="text-sm font-black uppercase text-black block mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Wave height
              </label>
              <Select
                value={String(waveHeightCategory)}
                onValueChange={(v) => setWaveHeightCategory(parseInt(v, 10))}
              >
                <SelectTrigger
                  className="w-full max-w-xs h-10 border-2 border-gray-300 rounded-md font-medium text-gray-900 hover:border-gray-400 focus:border-black focus:ring-2 focus:ring-black/20"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <SelectValue placeholder="Select wave height" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto border-2 border-black rounded-md bg-white text-gray-900">
                  {WAVE_HEIGHT_CATEGORIES.map(({ label, valueTenths }) => (
                    <SelectItem
                      key={label}
                      value={String(valueTenths)}
                      className="font-medium text-gray-900 focus:bg-black focus:text-white"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photo - compact button */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Photo <span className="font-normal normal-case text-gray-500">(optional)</span>
                </span>
                {photoPreview ? (
                  <div className="flex items-center gap-2">
                    <img src={photoPreview} alt="Preview" className="h-12 w-12 object-cover border border-black rounded" />
                    <button
                      type="button"
                      onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                      className="text-xs font-semibold text-gray-600 hover:text-black underline"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-300 rounded cursor-pointer hover:border-black hover:bg-gray-50 text-xs font-medium text-gray-700">
                    {isCompressing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    {isCompressing ? "Compressing…" : "Upload photo"}
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
            </div>

            {/* Quick Notes - tight chips */}
            <div className="px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-black uppercase text-black block mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Quick note <span className="font-normal normal-case text-gray-500">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setSelectedNote(selectedNote === note ? null : note)}
                    className={`px-2.5 py-1 text-[11px] font-medium border transition-all rounded ${
                      selectedNote === note
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:border-black"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="p-4 bg-black">
              <Button
                type="submit"
                disabled={submitMutation.isPending || isCompressing}
                className="w-full bg-white text-black hover:bg-gray-100 font-black text-base py-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {submitMutation.isPending || isCompressing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
