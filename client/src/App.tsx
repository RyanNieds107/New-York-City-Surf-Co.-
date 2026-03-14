import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// Critical-path pages — loaded immediately
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import SpotDetail from "./pages/SpotDetail";
import Login from "./pages/Login";
import SignIn from "./pages/SignIn";
import VerifyMagicLink from "./pages/VerifyMagicLink";
import CheckEmail from "./pages/CheckEmail";
// Non-critical pages — loaded on demand
const SurfAnalysis           = lazy(() => import("./pages/SurfAnalysis"));
const Terms                  = lazy(() => import("./pages/Terms"));
const Privacy                = lazy(() => import("./pages/Privacy"));
const Welcome                = lazy(() => import("./pages/Welcome"));
const SubmitReport           = lazy(() => import("./pages/SubmitReport"));
const Mission                = lazy(() => import("./pages/Mission"));
const Members                = lazy(() => import("./pages/Members"));
const AdminAlerts            = lazy(() => import("./pages/AdminAlerts"));
const AdminForecastComparison = lazy(() => import("./pages/AdminForecastComparison"));

function Router() {
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/login" component={Login} />
        <Route path="/auth/verify" component={VerifyMagicLink} />
        <Route path="/check-email" component={CheckEmail} />
        <Route path="/welcome" component={Welcome} />
        <Route path="/members" component={Members} />
        <Route path="/report/submit" component={SubmitReport} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminAlerts} />
        <Route path="/admin/alerts" component={AdminAlerts} />
        <Route path="/admin/forecasts" component={AdminForecastComparison} />
        <Route path="/spot/:id" component={SpotDetail} />
        <Route path="/surf-analysis" component={SurfAnalysis} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/Our Mission" component={Mission} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
