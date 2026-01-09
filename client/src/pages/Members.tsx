import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, MessageSquare } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Members() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: spots } = trpc.spots.list.useQuery();
  const { data: alerts, refetch: refetchAlerts } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  // Real-time alerts state
  const [alertSpotId, setAlertSpotId] = useState<number | null>(null);
  const [daysAdvanceNotice, setDaysAdvanceNotice] = useState<number>(7);
  const [minQualityScore, setMinQualityScore] = useState<number>(60);
  const [notificationFrequency, setNotificationFrequency] = useState<"immediate" | "daily_digest" | "weekly_digest" | "per_swell">("immediate");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  
  // Crowd report state
  const [crowdSpotId, setCrowdSpotId] = useState<number | null>(null);
  const [crowdLevel, setCrowdLevel] = useState<number>(3);
  
  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created successfully!");
      refetchAlerts();
      // Reset form
      setAlertSpotId(null);
      setDaysAdvanceNotice(7);
      setMinQualityScore(60);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create alert");
    },
  });
  
  const deleteAlertMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted successfully!");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete alert");
    },
  });
  
  const submitCrowdMutation = trpc.crowd.submit.useMutation({
    onSuccess: () => {
      toast.success("Crowd report submitted!");
      setCrowdSpotId(null);
      setCrowdLevel(3);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit report");
    },
  });
  
  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    
    createAlertMutation.mutate({
      spotId: alertSpotId,
      minQualityScore,
      emailEnabled,
      hoursAdvanceNotice: daysAdvanceNotice * 24, // Convert days to hours
    });
  };
  
  const handleSubmitCrowdReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crowdSpotId) {
      toast.error("Please select a spot");
      return;
    }
    
    submitCrowdMutation.mutate({
      spotId: crowdSpotId,
      crowdLevel,
    });
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Logo
              logoSize="h-10 sm:h-12 md:h-14"
              textSize="text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              textColor="text-black hover:text-gray-600"
              showLink={true}
            />
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/dashboard")}
                className="text-black hover:text-gray-600 transition-colors text-sm uppercase tracking-wide"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View All Spots
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="mb-8 sm:mb-12">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black text-black uppercase tracking-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
          >
            Welcome, Member
          </h1>
          <p
            className="text-lg text-gray-600"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            Get real-time alerts, join the community, and help improve forecasts
          </p>
        </div>
        
        {/* Three Main Sections */}
        <div className="space-y-8 sm:space-y-12">
          {/* 1. Real-Time Alerts */}
          <Card className="border-2 border-black rounded-none">
            <CardHeader className="border-b-2 border-black">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6" />
                <CardTitle className="text-2xl sm:text-3xl font-bold uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Real-Time Swell Alerts
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleCreateAlert} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Spot
                  </label>
                  <select
                    value={alertSpotId || ""}
                    onChange={(e) => setAlertSpotId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border-2 border-black rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-black"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <option value="">All spots</option>
                    {spots?.map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Notify Me This Many Days Before
                  </label>
                  <select
                    value={daysAdvanceNotice}
                    onChange={(e) => setDaysAdvanceNotice(parseInt(e.target.value))}
                    className="w-full border-2 border-black rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-black"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="5">5 days</option>
                    <option value="7">7 days</option>
                    <option value="10">10 days</option>
                    <option value="14">14 days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Minimum Quality Score
                  </label>
                  <select
                    value={minQualityScore}
                    onChange={(e) => setMinQualityScore(parseInt(e.target.value))}
                    className="w-full border-2 border-black rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-black"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <option value="40">Worth a Look (40+)</option>
                    <option value="60">Go Surf (60+)</option>
                    <option value="70">Excellent (70+)</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black rounded-none"
                    />
                    <span className="text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Email notifications</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black rounded-none"
                    />
                    <span className="text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Text notifications</span>
                  </label>
                </div>
                
                <Button
                  type="submit"
                  disabled={createAlertMutation.isPending}
                  className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {createAlertMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Alert...
                    </span>
                  ) : (
                    "Create Alert"
                  )}
                </Button>
              </form>
              
              {/* List existing alerts */}
              {alerts && alerts.length > 0 && (
                <div className="mt-8 pt-8 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Your Active Alerts</h3>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {alert.spotId ? spots?.find(s => s.id === alert.spotId)?.name : "All spots"}
                            </p>
                            <p className="text-sm text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {Math.round((alert.hoursAdvanceNotice || 24) / 24)} days notice • Quality {alert.minQualityScore}+
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlertMutation.mutate({ alertId: alert.id })}
                            disabled={deleteAlertMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 2. Join the Community */}
          <Card className="border-2 border-black rounded-none">
            <CardHeader className="border-b-2 border-black">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6" />
                <CardTitle className="text-2xl sm:text-3xl font-bold uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Join the Community
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <p className="text-gray-700 mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Connect with fellow NYC surfers. Share conditions, tips, and stoke.
              </p>
              <Button
                className="w-full sm:w-auto bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 px-8"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
          
          {/* 3. Submit Crowd Reports */}
          <Card className="border-2 border-black rounded-none">
            <CardHeader className="border-b-2 border-black">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6" />
                <CardTitle className="text-2xl sm:text-3xl font-bold uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Submit Crowd Report
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <p className="text-gray-700 mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Help other surfers by reporting current crowd levels at your spot.
              </p>
              <form onSubmit={handleSubmitCrowdReport} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Spot
                  </label>
                  <select
                    value={crowdSpotId || ""}
                    onChange={(e) => setCrowdSpotId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border-2 border-black rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-black"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                    required
                  >
                    <option value="">Select a spot...</option>
                    {spots?.map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Crowd Level
                  </label>
                  <select
                    value={crowdLevel}
                    onChange={(e) => setCrowdLevel(parseInt(e.target.value))}
                    className="w-full border-2 border-black rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-black"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <option value="1">1 - Empty</option>
                    <option value="2">2 - Light</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Busy</option>
                    <option value="5">5 - Crowded</option>
                  </select>
                </div>
                
                <Button
                  type="submit"
                  disabled={submitCrowdMutation.isPending}
                  className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {submitCrowdMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

