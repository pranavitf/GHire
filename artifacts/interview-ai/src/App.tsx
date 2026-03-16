import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/Home";
import CareerHub from "./pages/CareerHub";
import Session from "./pages/Session";
import Arena from "./pages/Arena";
import Leaderboard from "./pages/Leaderboard";
import Portfolio from "./pages/Portfolio";
import PortfolioDashboard from "./pages/PortfolioDashboard";
import Recruiter from "./pages/Recruiter";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hub" component={CareerHub} />
      <Route path="/arena/:sessionId" component={Arena} />
      <Route path="/interview/:sessionId" component={Session} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/portfolio/:sessionId" component={Portfolio} />
      <Route path="/portfolio" component={PortfolioDashboard} />
      <Route path="/recruiter" component={Recruiter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
