import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { CheckCircle2, Clock, FileCheck, Home } from "lucide-react";

export default function Submission() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/10 mb-6">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Exam Submitted Successfully!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your exam has been submitted and is being processed
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-elevated border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Exam Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Questions Attempted</span>
                </div>
                <span className="text-lg font-bold text-success">32 / 50</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Not Attempted</span>
                </div>
                <span className="text-lg font-bold text-muted-foreground">18 / 50</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Time Taken</span>
                </div>
                <span className="text-lg font-bold text-foreground">42 min 18 sec</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-foreground mb-2">
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Your exam responses are being reviewed by our AI proctoring system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Any flagged activities will be manually verified by our proctoring team</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Results will be available in your dashboard within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>You will receive an email notification once results are published</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/Feedback">
              <Button size="lg" className="w-full sm:w-auto">
                <Home className="w-5 h-5 mr-2" />
                Submit Your Feedback
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
