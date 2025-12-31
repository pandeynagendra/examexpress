// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Mail, Lock } from "lucide-react";
// import api from "@/Service/api";

// /* -------------------- TYPES -------------------- */
// interface User {
//   UserID: string;        
//   BatchID: number;
// TheoryQuizID:number,
//   UserPassword: string; 
//   Token?: string;
//   [key: string]: any;
// }

// /* -------------------- COMPONENT -------------------- */
// export default function Login() {
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
  

//   /* -------------------- LOGIN HANDLER -------------------- */
//   const handleEmailSignIn = async () => {
//   setError("");

//   if (!email || !password) {
//     setError("Please enter both enrollment no and password");
//     return;
//   }

//   setLoading(true);

//   try {
//     const res = await api.get<User>("/Auth", {
//       params: {
//         userName: email,
//         password,
//         IPAddress: "",
//         AppType: "ExamExpress",
//         AndroidVersion: "12.6",
//         AppVersion: "1.8",
//       },
//     });

//     const userData = res.data;
//     console.log("API Response:", userData);

//       if (!userData?.UserID || !userData?.Token) {
//       setError("Invalid enrollment no or password");
//       return;
//     }

//     // ✅ CLEAR OLD SESSION
//     localStorage.clear();
//     sessionStorage.clear();
    
//     // ✅ SAVE TOKEN (GLOBAL)
//     localStorage .setItem("authToken", userData.Token);

//     // ✅ CandidateID (numeric only)
//     const candidateId = Number(
//       userData.UserID.replace("CID_", "").replace("CI_", "")
//     );

//     if (isNaN(candidateId)) {
//       setError("Invalid Candidate ID");
//       return;
//     }

//     // ✅ SAVE CANDIDATE
//     localStorage.setItem(
//       "candidate",
//       JSON.stringify({
//         candidateId,
//         batchId: userData.BatchID,
//       })
//     );

//     // ✅ SAVE FULL USER
//     sessionStorage.setItem("user", JSON.stringify(userData));

//     navigate("/PreExamCheck");

//   } catch (err: any) {
//     console.error(err);
//     setError(
//       err?.response?.data?.message || "Login failed. Please try again."
//     );
//   } finally {
//     setLoading(false);
//   }
// };
//   /* -------------------- UI -------------------- */

//    return (
//     <div className="w-full min-h-screen flex bg-[#eef2f6]">
//       <div className="flex flex-col lg:flex-row w-full min-h-screen">

//         {/* LEFT PANEL */}
//         <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#0f5257] text-white px-5 py-6 space-y-4">
//           <img
//             src="../assets/examexpress.png"
//             alt="ExamExpress Logo"
//             className="h-12 bg-white p-2 rounded-md object-contain"
//           />
//           <h1 className="text-3xl font-extrabold text-center leading-snug">
//             Secure Online Proctored Exams
//           </h1>
//           <p className="text-center text-white/80 max-w-md">
//             AI-powered monitoring ensures exam integrity with real-time proctoring.
//           </p>

//           <div className="w-full max-w-sm h-48 rounded-xl overflow-hidden shadow-xl border border-white/20">
//             <img
//               src="../assets/exam-hero.jpg"
//               alt="Exam Illustration"
//               className="w-full h-full object-cover brightness-95"
//             />
//           </div>

//           <div className="w-full max-w-sm">
//             <p className="text-center text-sm uppercase text-white/60 font-semibold">
//               Trusted by leading organizations
//             </p>
//             <div className="grid grid-cols-3 gap-3 mt-3">
//               {["LG", "Philips", "Google", "Microsoft", "Paytm", "Walmart"].map((i) => (
//                 <div
//                   key={i}
//                   className="h-12 bg-white/15 border border-white/25 rounded-lg flex items-center justify-center shadow"
//                 >
//                   <span className="text-white font-bold text-sm">{i}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* RIGHT PANEL */}
//         <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
//           <div className="bg-white border shadow-xl rounded-2xl w-full max-w-sm p-8 space-y-6">

//             <div className="text-center space-y-1">
//               <h2 className="text-2xl font-bold text-gray-800">Student Login 👋</h2>
//               <p className="text-sm text-gray-500">Sign in to ExamExpress</p>
//             </div>

//             <div className="space-y-4">

//               {/* Email / Enrollment Input */}
//               <div className="relative">
//                 <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
//                 <Input
//                   type="text"
//                   placeholder="Enter Email / Enrollment No"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="h-11 pl-10 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0f5257]"
//                 />
//               </div>

//               {/* Password Input */}
//               <div className="relative">
//                 <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
//                 <Input
//                   type="password"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="h-11 pl-10 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0f5257]"
//                 />
//               </div>

//               {error && (
//                 <p className="text-red-500 text-xs font-medium">{error}</p>
//               )}

//               {/* Login Button */}
//               <Button
//                 size="lg"
//                 className="w-full h-11 text-base rounded-lg bg-[#0f5257] hover:bg-[#0c3f42]"
//                 onClick={handleEmailSignIn}
//                 disabled={loading}
//               >
//                 {loading ? "Please wait..." : "Login"}
//               </Button>
//             </div>

//             <p className="text-xs text-center text-gray-500">
//               By signing in, you agree to our{" "}
//               <a className="underline text-[#0f5257]">Terms</a> and{" "}
//               <a className="underline text-[#0f5257]">Privacy Policy</a>.
//             </p>
//           </div>
//         </div>

//       </div>
//     </div>
//   ); 
// }


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";
import api from "@/Service/api";

/* -------------------- TYPES -------------------- */
interface User {
  UserID: string;
  BatchID: number;
  AgencyID: number;
  Token: string;
  UserName?: string;
  RoleName?: string;
  [key: string]: any;
}

/* -------------------- COMPONENT -------------------- */
export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* -------------------- LOGIN HANDLER -------------------- */
  const handleEmailSignIn = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter both enrollment no and password");
      return;
    }

    setLoading(true);

    try {
      const res = await api.get<User>("/Auth", {
        params: {
          userName: email,
          password,
          IPAddress: "",
          AppType: "ExamExpress",
          AndroidVersion: "12.6",
          AppVersion: "1.8",
        },
      });

      const userData = res.data;
      console.log("LOGIN API RESPONSE 👉", userData);

      if (!userData?.UserID || !userData?.Token) {
        setError("Invalid enrollment no or password");
        return;
      }

      /* ================= CLEAR OLD SESSION ================= */
      localStorage.clear();
      sessionStorage.clear();

      /* ================= SAVE TOKEN ================= */
      localStorage.setItem("authToken", userData.Token);

      /* ================= SAVE FULL LOGIN OBJECT ================= */
      localStorage.setItem("candidate", JSON.stringify(userData));

      /* (OPTIONAL) SAVE IN SESSION TOO */
      sessionStorage.setItem("user", JSON.stringify(userData));

      /* ================= NAVIGATE ================= */
      navigate("/PreExamCheck");

    } catch (err: any) {
      console.error("LOGIN ERROR 👉", err);
      setError(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="w-full min-h-screen flex bg-[#eef2f6]">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">

        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#0f5257] text-white px-5 py-6 space-y-4">
          <img
            src="../assets/examexpress.png"
            alt="ExamExpress Logo"
            className="h-12 bg-white p-2 rounded-md object-contain"
          />
          <h1 className="text-3xl font-extrabold text-center leading-snug">
            Secure Online Proctored Exams
          </h1>
          <p className="text-center text-white/80 max-w-md">
            AI-powered monitoring ensures exam integrity with real-time proctoring.
          </p>

          <div className="w-full max-w-sm h-48 rounded-xl overflow-hidden shadow-xl border border-white/20">
            <img
              src="../assets/exam-hero.jpg"
              alt="Exam Illustration"
              className="w-full h-full object-cover brightness-95"
            />
          </div>

          <div className="w-full max-w-sm">
            <p className="text-center text-sm uppercase text-white/60 font-semibold">
              Trusted by leading organizations
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {["LG", "Philips", "Google", "Microsoft", "Paytm", "Walmart"].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-white/15 border border-white/25 rounded-lg flex items-center justify-center shadow"
                >
                  <span className="text-white font-bold text-sm">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="bg-white border shadow-xl rounded-2xl w-full max-w-sm p-8 space-y-6">

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">Student Login 👋</h2>
              <p className="text-sm text-gray-500">Sign in to ExamExpress</p>
            </div>

            <div className="space-y-4">

              {/* Email / Enrollment Input */}
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter Email / Enrollment No"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs font-medium">{error}</p>
              )}

              {/* Login Button */}
              <Button
                size="lg"
                className="w-full h-11 text-base rounded-lg bg-[#0f5257] hover:bg-[#0c3f42]"
                onClick={handleEmailSignIn}
                disabled={loading}
              >
                {loading ? "Please wait..." : "Login"}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              By signing in, you agree to our{" "}
              <a className="underline text-[#0f5257]">Terms</a> and{" "}
              <a className="underline text-[#0f5257]">Privacy Policy</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  ); 
}