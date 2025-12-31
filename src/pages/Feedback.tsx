import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Star,
  Send,
  MessageSquare,
  CheckCircle,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/Service/api";

interface FeedbackQuestion {
  QuestionID: number;
  Question: string;
  Rating: number;
}

const Feedback = () => {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const navigate = useNavigate();

  /* ================= LOGIN DATA (SAFE WAY) ================= */

  const [token, setToken] = useState<string | null>(null);
  const [USER_ID, setUSER_ID] = useState<number | null>(null);
  const [BATCH_ID, setBATCH_ID] = useState<number | null>(null);
  const [AGENCY_ID, setAGENCY_ID] = useState<number | null>(null);

  useEffect(() => {
    const candidateRaw = localStorage.getItem("candidate");

    if (!candidateRaw) {
      toast.error("Session expired. Please login again.");
      navigate("/");
      return;
    }

    try {
      const candidate = JSON.parse(candidateRaw);

      setToken(candidate.Token || localStorage.getItem("authToken"));
      setUSER_ID(candidate.UserID ? Number(candidate.UserID) : null);
      setBATCH_ID(candidate.BatchID ?? null);
      setAGENCY_ID(candidate.AgencyID ?? null);

      setAuthChecked(true);
    } catch (err) {
      console.error("Invalid candidate data", err);
      toast.error("Invalid session data");
      navigate("/");
    }
  }, [navigate]);

  /* ================= FETCH QUESTIONS ================= */

  useEffect(() => {
    if (!authChecked) return;

    const fetchQuestions = async () => {
      try {
        const res = await api.get(
          "/GetFeedbackByUserType?UserType=Candidate&AppType=ExamExpress"
        );

        setQuestions(
          res.data.map((q: any) => ({
            QuestionID: q.QuestionID,
            Question: q.Question,
            Rating: 0,
          }))
        );
      } catch {
        toast.error("Failed to load feedback questions");
      }
    };

    fetchQuestions();
  }, [authChecked]);

  /* ================= SET RATING ================= */

  const setRating = (qid: number, rating: number) => {
    setQuestions(prev =>
      prev.map(q =>
        q.QuestionID === qid ? { ...q, Rating: rating } : q
      )
    );
  };

  /* ================= STAR → TEXT ================= */

  const getReviewText = (rating: number) => {
    if (rating === 1) return "Poor";
    if (rating === 2) return "Good";
    if (rating === 3) return "Very Good";
    return "Excellent";
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.some(q => q.Rating === 0)) {
      toast.error("Please rate all questions");
      return;
    }

    // ✅ SAFE CHECK
    if (
      !token ||
      USER_ID == null ||
      BATCH_ID == null ||
      AGENCY_ID == null
    ) {
      console.error("LOGIN DATA DEBUG 👉", {
        token,
        USER_ID,
        BATCH_ID,
        AGENCY_ID,
      });
      toast.error("Login data missing");
      return;
    }

    setLoading(true);

    try {
      const feedbackReview =
        questions
          .map(
            q =>
              `${q.QuestionID}_${q.Rating}_${getReviewText(q.Rating)}`
          )
          .join(",") + ",";

      const feedBackToggle =
        questions.map(q => `${q.QuestionID}_1`).join(",");

      const url =
        `/SaveFeedbackByUserType` +
        `?UserID=${USER_ID}` +
        `&BatchID=${BATCH_ID}` +
        `&AgencyID=${AGENCY_ID}` +
        `&UserType=Candidate` +
        `&FeedbackReview=${encodeURIComponent(feedbackReview)}` +
        `&FeedBackToggle=${encodeURIComponent(feedBackToggle)}` +
        `&Comment=${encodeURIComponent("No Issue")}` +
        `&AppType=ExamExpress`;

      const res = await api.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("SUCCESS RESPONSE 👉", res.data);
      toast.success("Feedback saved successfully");
      setSubmitted(true);

    } catch (error: any) {
      console.error("API ERROR 👉", error.response?.data || error);
      toast.error("Feedback submission failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SUCCESS UI ================= */

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-green-50 border rounded-2xl">
        <CheckCircle className="w-14 h-14 mx-auto text-green-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          Your feedback has been submitted successfully.
        </p>

        <Button onClick={() => navigate("/")}>
          <Home className="mr-2 w-4 h-4" />
          Return to Home
        </Button>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-8">
        <MessageSquare className="w-10 h-10 mx-auto text-blue-600 mb-3" />
        <h1 className="text-3xl font-bold">Training Feedback</h1>
        <p className="text-gray-600">Please rate each question</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.QuestionID} className="bg-white border rounded-2xl p-6">
            <p className="font-medium mb-4">
              {index + 1}. {q.Question}
            </p>

            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRating(q.QuestionID, v)}
                >
                  <Star
                    className={`w-8 h-8 ${
                      q.Rating >= v
                        ? "fill-amber-500 text-amber-500"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        <Button type="submit" disabled={loading} className="w-full py-6 text-lg">
          {loading ? "Submitting..." : <><Send className="mr-2" /> Submit Feedback</>}
        </Button>
      </form>
    </div>
  );
};

export default Feedback;
