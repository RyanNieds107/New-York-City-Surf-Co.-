import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";

export default function AdminAlerts() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: alerts, isLoading: alertsLoading, refetch } = trpc.admin.alerts.getAll.useQuery(
    undefined,
    {
      enabled: !!user && user.role === "admin",
    }
  );

  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("NYC Surf Co. Alert");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);

  const sendBulkAlertMutation = trpc.admin.alerts.sendBulkAlert.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Sent ${result.emailSent} emails${result.smsSent > 0 ? `, ${result.smsSent} SMS` : ""}`
      );
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alerts");
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if user is admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You must be an admin to access this page.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Count unique users with phone and smsOptIn (deduplicate by userEmail)
  const waitlistCount = alerts
    ? new Set(
        alerts
          .filter((alert) => alert.userPhone && alert.userSmsOptIn === 1 && alert.userEmail)
          .map((alert) => alert.userEmail!)
      ).size
    : 0;
  const isLive = waitlistCount >= 15;

  const formatPhone = (phone: string | null): string => {
    if (!phone) return "Not provided";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const formatCriteria = (alert: NonNullable<typeof alerts>[0]): string => {
    const criteria = [];
    if (alert.minWaveHeightFt) criteria.push(`${alert.minWaveHeightFt}ft+`);
    if (alert.minQualityScore) criteria.push(`Quality ${alert.minQualityScore}+`);
    if (alert.minPeriodSec) criteria.push(`${alert.minPeriodSec}s+ period`);
    if (alert.idealWindOnly === 1) criteria.push("Ideal wind only");
    return criteria.length > 0 ? criteria.join(", ") : "Default";
  };

  const handleSendBulkAlert = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    sendBulkAlertMutation.mutate({
      message: message.trim(),
      subject: subject.trim(),
      sendEmail,
      sendSMS: sendSMS && isLive,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Alerts Dashboard</h1>
          <p className="text-gray-600">Manage swell alerts and send notifications</p>
        </div>

        {/* Waitlist Counter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold mb-2">
                  {waitlistCount} / 15 Surfers on Waitlist
                </div>
                <p className="text-gray-600">
                  {waitlistCount >= 15
                    ? "SMS alerts are live!"
                    : `${15 - waitlistCount} more needed for SMS alerts`}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Label htmlFor="live-toggle" className="text-sm font-medium">
                  Live
                </Label>
                <Switch
                  id="live-toggle"
                  checked={isLive}
                  disabled={!isLive}
                  className="cursor-not-allowed"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Alert Sender */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Send Bulk Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Alert subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your alert message here..."
                rows={5}
              />
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                />
                <Label htmlFor="send-email">Send Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-sms"
                  checked={sendSMS && isLive}
                  onCheckedChange={(checked) => setSendSMS(checked)}
                  disabled={!isLive}
                />
                <Label htmlFor="send-sms" className={!isLive ? "text-gray-400" : ""}>
                  Send SMS {!isLive && "(Requires 15 users)"}
                </Label>
              </div>
            </div>
            <Button
              onClick={handleSendBulkAlert}
              disabled={sendBulkAlertMutation.isPending || !message.trim()}
              className="w-full"
            >
              {sendBulkAlertMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to All
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No alerts found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>SMS Opt-In</TableHead>
                    <TableHead>Preferred Spot</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.userEmail || "N/A"}</TableCell>
                      <TableCell>{formatPhone(alert.userPhone)}</TableCell>
                      <TableCell>
                        {alert.userSmsOptIn === 1 ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{alert.spotName || "All Spots"}</TableCell>
                      <TableCell className="text-sm">{formatCriteria(alert)}</TableCell>
                      <TableCell>
                        {new Date(alert.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
