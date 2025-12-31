import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Hash,
} from "lucide-react";

export default function ProfileVerification() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [micWarning, setMicWarning] = useState(false);

  /* LOAD PROFILE FROM SESSION (NO API CALL) */
  useEffect(() => {
    const userRaw = sessionStorage.getItem("user");
    const token = localStorage.getItem("authToken");

    if (!userRaw || !token) {
      alert("Session expired. Please login again.");
      navigate("/");
      return;
    }

    setProfile(JSON.parse(userRaw));
    setLoading(false);
  }, [navigate]);

  /* CAMERA MOCK */
  useEffect(() => {
    if (!cameraOn) return;

    const interval = setInterval(() => {
      setFaceDetected(true);
      setMicWarning(Math.random() > 0.8);
    }, 2000);

    return () => clearInterval(interval);
  }, [cameraOn]);

  const handleStartExam = () => {
    if (faceDetected && cameraOn) navigate("/exam");
  };

  const getInitials = (name?: string) => {
    if (!name) return "NA";
    const p = name.split(" ");
    return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white min-h-screen">
      <Header />

      <div className="flex flex-1 p-4 justify-center items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">

          {/* LEFT */}
          <div className="flex flex-col space-y-4">
            <h1 className="text-2xl font-semibold">Profile Verification</h1>
            <p className="text-muted-foreground text-sm">
              Verify your details before starting the exam
            </p>

            <div className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                  {profile.ProfileImage
                    ? <img src={profile.ProfileImage} className="w-full h-full object-cover" />
                    : getInitials(profile.UserName)}
                </div>

                   <div>
                  <h2 className="text-lg font-medium">{profile.UserName}</h2>
                  <p className="text-xs text-muted-foreground">Candidate</p>
                </div>
              </div>

              <InputField icon={<User size={14} />} label="Full Name" value={profile?.UserName} />
              <InputField icon={<Hash size={14} />} label="Enrollment Number" value={profile?.UserID} />
              <InputField icon={<Mail size={14} />} label="Email Address" value={profile?.UserEmail} />
             
              <div className="grid grid-cols-2 gap-2">
              
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Camera Verification</h2>
            <p className="text-muted-foreground text-sm">
              Ensure your face is clearly visible
            </p>

            <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                {!cameraOn ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="w-12 h-12 text-gray-400" />
                    <Button className="mt-3" onClick={() => setCameraOn(true)}>
                      Enable Camera
                    </Button>
                  </div>
                ) : (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-1">
                <StatusRow icon={CheckCircle2} text="Face detected" active={faceDetected} />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleStartExam}
                disabled={!cameraOn || !faceDetected}
                className="h-9 px-6"
              >
                {cameraOn && faceDetected
                  ? "Start Exam"
                  : "Waiting for verification..."}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/*---------------- HELPERS ---------------- */
const InputField = ({ icon, label, value }: any) => (
  <div className="flex items-center gap-2">
    <Label className="w-40 flex items-center gap-1 text-xs">
      {icon} {label}
    </Label>
    <Input value={value || ""} readOnly />
  </div>
);

const StatusRow = ({ icon: Icon, text, active, warn }: any) => (
  <div className={`text-xs ${active ? "text-green-600" : warn ? "text-yellow-600" : "text-gray-400"}`}>
    <Icon size={14} /> {text}
  </div>
);