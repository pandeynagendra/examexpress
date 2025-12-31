import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import PreExamCheck from "./pages/PreExamCheck";
import Instructions from "./pages/Instructions";
import ProfileVerification from "./pages/ProfileVerification";
import Exam from "./pages/Exam";
import Submission from "./pages/Submission";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/PreExamCheck" element={<PreExamCheck />} />
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/profile-verification" element={<ProfileVerification />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/submission" element={<Submission />} />
          <Route path="/Feedback" element={<Feedback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
