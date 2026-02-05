import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import SpotDetail from "./pages/SpotDetail";
import SurfAnalysis from "./pages/SurfAnalysis";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import SignIn from "./pages/SignIn";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import SubmitReport from "./pages/SubmitReport";
import Mission from "./pages/Mission";
import Members from "./pages/Members";
import AdminAlerts from "./pages/AdminAlerts";
import AdminForecastComparison from "./pages/AdminForecastComparison";
import VerifyMagicLink from "./pages/VerifyMagicLink";
import CheckEmail from "./pages/CheckEmail";

function Router() {
  return (
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
