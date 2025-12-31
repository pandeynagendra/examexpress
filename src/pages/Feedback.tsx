import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Home, 
} from "lucide-react";
import { toast } from "sonner";
import api from "@/Service/api";

interface FeedbackQuestion {
  QuestionID: number;
  Question: string;
  Rating: number;
}

const USER_ID = 748307;
const BATCH_ID = 27840;

const Feedback = () => {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();



  useEffect(() => {
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
  }, []);

  /* ================= SET RATING ================= */

  const setRating = (qid: number, rating: number) => {
    setQuestions(prev =>
      prev.map(q =>
        q.QuestionID === qid ? { ...q, Rating: rating } : q
      )
    );
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.some(q => q.Rating === 0)) {
      toast.error("Please rate all questions");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Authentication token missing");
      return;
    }

    setLoading(true);

    try {
      const feedbackReview =
        questions.map(q => `${q.QuestionID}_${q.Rating}`).join(",") + ",";

      const feedBackToggle =
        questions.map(q => `${q.QuestionID}_1`).join(",");

      const url =
        `/SaveFeedbackByUserType` +
        `?UserID=${USER_ID}` +
        `&BatchID=${BATCH_ID}` +
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
      console.error("API ERROR FULL 👉", error.response?.data || error);
      toast.error(error.response?.data?.Message || "400 Bad Request");
    } finally {
      setLoading(false);
    }
  };



  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <CheckCircle className="w-14 h-14 mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully.
          </p>

       
          <Button
            onClick={() => navigate("/")}   
            className="px-6 py-3 text-base"
          >
            <Home className="mr-2 w-4 h-4" />
            Return to Home
          </Button>
        </div>
      </div>
    );
  }



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

        <div className="bg-white border rounded-2xl p-6">
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Additional comments"
            className="min-h-[120px]"
          />
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
            <AlertCircle className="w-4 h-4" /> Confidential
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full py-6 text-lg">
          {loading ? "Submitting..." : <><Send className="mr-2" /> Submit Feedback</>}
        </Button>
      </form>
    </div>
  );
};

export default Feedback;
