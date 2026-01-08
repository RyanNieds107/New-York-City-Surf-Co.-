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

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/spot/:id" component={SpotDetail} />
      <Route path="/surf-analysis" component={SurfAnalysis} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
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
