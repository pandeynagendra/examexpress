import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Mic, MapPin, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PreExamCheck() {
  const [cameraStatus, setCameraStatus] = useState<"pending" | "success" | "failed">("pending");
  const [micStatus, setMicStatus] = useState<"pending" | "success" | "failed">("pending");
  const [locationStatus, setLocationStatus] = useState<"pending" | "success" | "failed">("pending");
  const [internetStatus, setInternetStatus] = useState<"pending" | "success" | "slow" | "failed">("pending");

  const navigate = useNavigate();

  const textMap = {
    pending: "Check",
    success: "Verified ✓",
    failed: "Failed ✗",
    slow: "Slow ⚠",
  };

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera access granted:", stream);
      setCameraStatus("success");
    } catch (error) {
      console.error("Camera error:", error);
      setCameraStatus("failed");
    }
  };

  const checkMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted:", stream);
      setMicStatus("success");
    } catch (error) {
      console.error("Microphone error:", error);
      setMicStatus("failed");
    }
  };

  const checkLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      setLocationStatus("failed");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location access granted:", position);
        setLocationStatus("success");
      },
      (error) => {
        console.error("Location error:", error);
        setLocationStatus("failed");
      }
    );
  };

  const checkInternetSpeed = () => {
    const start = performance.now();
    fetch("https://www.google.com", { mode: "no-cors" })
      .then(() => {
        const time = performance.now() - start;
        console.log("Internet speed check:", time);
        if (time < 300) setInternetStatus("success");
        else setInternetStatus("slow");
      })
      .catch((error) => {
        console.error("Internet check failed:", error);
        setInternetStatus("failed");
      });
  };

  const allPassed =
    cameraStatus === "success" &&
    micStatus === "success" &&
    locationStatus === "success" &&
    internetStatus === "success";

  const handleNext = () => {
    if (allPassed) navigate("/Instructions");
  };

  return (
    <div className="w-full min-h-screen bg-[#eef2f6] flex justify-center items-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-5 sm:p-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-700 leading-tight">
          Pre-Exam Environment Check
        </h1>
        <p className="text-center text-sm sm:text-base text-gray-500">
          Complete all system checks before starting the exam.
        </p>

        <div className="space-y-5">

          {/* CAMERA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-gray-50 gap-3">
            <div className="flex items-center gap-3">
              <Camera className="h-7 w-7 text-gray-700" />
              <div>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Camera Check</p>
                <p className="text-xs text-gray-500">Required for proctoring</p>
              </div>
            </div>
            <Button onClick={checkCamera} className="bg-[#0f5257] w-full sm:w-auto">
              {textMap[cameraStatus]}
            </Button>
          </div>

          {/* MIC */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-gray-50 gap-3">
            <div className="flex items-center gap-3">
              <Mic className="h-7 w-7 text-gray-700" />
              <div>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Microphone Check</p>
                <p className="text-xs text-gray-500">Required for sound validation</p>
              </div>
            </div>
            <Button onClick={checkMicrophone} className="bg-[#0f5257] w-full sm:w-auto">
              {textMap[micStatus]}
            </Button>
          </div>

          {/* LOCATION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-gray-50 gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-7 w-7 text-gray-700" />
              <div>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Location Access</p>
                <p className="text-xs text-gray-500">Required for exam monitoring</p>
              </div>
            </div>
            <Button onClick={checkLocation} className="bg-[#0f5257] w-full sm:w-auto">
              {textMap[locationStatus]}
            </Button>
          </div>

          {/* INTERNET */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-gray-50 gap-3">
            <div className="flex items-center gap-3">
              <Wifi className="h-7 w-7 text-gray-700" />
              <div>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Internet Speed</p>
                <p className="text-xs text-gray-500">Stable network required</p>
              </div>
            </div>
            <Button onClick={checkInternetSpeed} className="bg-[#0f5257] w-full sm:w-auto">
              {internetStatus === "pending"
                ? "Check"
                : internetStatus === "success"
                ? "Good ✓"
                : textMap[internetStatus]}
            </Button>
          </div>
        </div>

        {/* NEXT */}
        <div className="pt-2">
          <Button
            onClick={handleNext}
            disabled={!allPassed}
            className={`w-full h-12 text-lg ${
              allPassed ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {allPassed ? "Continue to Exam" : "Complete all checks to continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
