import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import api from "@/Service/api";
import { toast } from "sonner";
import {
  Camera,
  Eye,
  Monitor,
  Volume2,
  Clock,
  Smartphone,
  AlertCircle,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

const instructions = [
  { icon: Camera, title: "Camera must be ON", description: "Camera will be active throughout the exam." },
  { icon: Eye, title: "Face must be visible", description: "Keep your face clearly visible during the exam." },
  { icon: Monitor, title: "No tab switch", description: "Tab switching or new windows will be flagged." },
  { icon: Eye, title: "AI movement monitoring", description: "AI monitors head & eye direction." },
  { icon: Clock, title: "Screenshot every 1 min", description: "Screenshots recorded regularly." },
  { icon: Volume2, title: "Mic monitored", description: "Noise & background sounds monitored." },
  { icon: Smartphone, title: "No mobile devices", description: "External device use prohibited." },
];

export default function Instructions() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<"selfie" | "document" | null>(null);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [documentCaptured, setDocumentCaptured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<{
    selfie: 'pending' | 'uploading' | 'success' | 'error';
    document: 'pending' | 'uploading' | 'success' | 'error';
    message?: string;
  }>({
    selfie: 'pending',
    document: 'pending'
  });
  const [uploadedUrls, setUploadedUrls] = useState<{
    selfie?: string;
    document?: string;
  }>({});
  const [networkError, setNetworkError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>("Unknown");

  useEffect(() => {
    const candidateRaw = localStorage.getItem("candidate");
    if (!candidateRaw) {
      alert("Session expired. Please login again.");
      window.location.href = "/";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setCurrentLocation(`${latitude}, ${longitude}`);
      },
      (error) => {
        console.error("Error getting location:", error);
        setCurrentLocation("Unknown");
      }
    );
  }, []);

  const candidateRaw = localStorage.getItem("candidate");
  if (!candidateRaw) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const candidate = JSON.parse(candidateRaw);
  const candidateId = candidate.candidateId;
  const batchId = candidate.batchId;
  const agencyId = 101;

  const startCamera = async (mode: "selfie" | "document") => {
    setCameraMode(mode);
    try {
      const constraints = {
        video: {
          facingMode: mode === "selfie" ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      alert(`Camera access denied: ${error.message}. Please allow camera permissions.`);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setCameraMode(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !videoStream) return;
    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      if (video.readyState < 2) {
        await new Promise(resolve => {
          video.addEventListener('loadeddata', () => resolve(true));
        });
      }
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        alert("Failed to capture image.");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.8);
      if (cameraMode === "selfie") {
        setSelfie(image);
        setSelfieCaptured(true);
        setUploadStatus(prev => ({ ...prev, selfie: 'pending' }));
      } else {
        setDocumentImage(image);
        setDocumentCaptured(true);
        setUploadStatus(prev => ({ ...prev, document: 'pending' }));
      }
      stopCamera();
    } catch (error) {
      alert("Failed to capture photo.");
    }
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    if (parts.length !== 2) throw new Error("Invalid base64 string");
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) uInt8Array[i] = raw.charCodeAt(i);
    return new Blob([uInt8Array], { type: contentType });
  };

  const generateS3FileName = (imageFor: 1 | 2): string => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear().toString().slice(-2)}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
    return `API_${candidateId}_${imageFor}_${dateStr}_${timeStr}.jpg`;
  };

  const getBucketNameFromS3Url = (url: string): string => {
    try {
      return new URL(url).hostname.split(".")[0];
    } catch {
      return "";
    }
  };

  const uploadToAWS = async (imageBase64: string, imageFor: 1 | 2) => {
    try {
      const imageType = imageFor === 1 ? "selfie" : "document";

      setUploadStatus(prev => ({
        ...prev,
        [imageType]: "uploading",
        message: `Preparing ${imageType}...`
      }));

      setUploadProgress(`Uploading ${imageType}...`);

      const blob = base64ToBlob(imageBase64);
      const fileName = generateS3FileName(imageFor);
      const formData = new FormData();

      formData.append("file", blob, fileName);
      formData.append("AppType", "ExamExpress");
      formData.append("AgencyID", agencyId.toString());
      formData.append("BatchID", batchId.toString());
      formData.append("CandidateID", candidateId.toString());
      formData.append("DOCID", imageFor.toString());

      const uploadResponse = await api.post("/Upload", formData);

      if (!uploadResponse.data?.url) {
        throw new Error("Upload failed");
      }

      const imageUrl = uploadResponse.data.url;
      const savedFileName = uploadResponse.data.fileName || fileName;
      const bucketName = getBucketNameFromS3Url(imageUrl);

      if (imageFor === 1) {
        setUploadedUrls(prev => ({ ...prev, selfie: imageUrl }));
      } else {
        setUploadedUrls(prev => ({ ...prev, document: imageUrl }));
      }

      await saveToDatabase(imageFor, imageUrl, savedFileName, bucketName);

      toast.success(
        `${imageType.toUpperCase()} uploaded & saved successfully`,
        { duration: 3000 }
      );

      return { success: true, url: imageUrl, fileName: savedFileName };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Upload failed";

      toast.error(message, { duration: 4000 });

      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("candidate");
        setTimeout(() => (window.location.href = "/"), 2000);
      }

      throw error;
    }
  };

  const saveToDatabase = async (
    imageType: number,
    imageUrl: string,
    fileName: string,
    bucketName: string
  ) => {
    const response = await api.post("/SaveEvidence", null, {
      params: {
        CandidateID: candidateId,
        BatchID: batchId,
        ImageFor: imageType,
        ImageName: "/" + fileName,
        BucketName: bucketName,
        Location: currentLocation,
        AppType: "ExamExpress"
      },
      paramsSerializer: params => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }
    });

    if (response.status !== 200) {
      throw new Error("Database save failed");
    }

    return response.data;
  };
  const handleProceed = async () => {
    if (!agreed || !selfie || !documentImage) {
      alert("Please capture both selfie and document, and agree to the terms.");
      return;
    }

    setUploading(true);
    setNetworkError("");
    setUploadProgress("Starting verification...");
    setUploadStatus({ selfie: 'pending', document: 'pending', message: 'Starting upload...' });

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication token missing.");

      setUploadProgress("Uploading selfie...");
      const selfieResult = await uploadToAWS(selfie, 1);

      setUploadProgress("Uploading ID document...");
      const documentResult = await uploadToAWS(documentImage, 2);

      if (selfieResult?.success && documentResult?.success) {
        setUploadProgress("Verification complete!");
        setUploadStatus({ message: 'Verification successful!', selfie: 'success', document: 'success' });

        localStorage.setItem('verificationUrls', JSON.stringify({
          selfie: selfieResult.url,
          document: documentResult.url,
          timestamp: new Date().toISOString()
        }));

        setTimeout(() => {
          alert("Identity verification successful!");
          navigate("/profile-verification");
        }, 1500);
      } else {
        throw new Error("One or more uploads failed");
      }
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
      setUploading(false);
      setUploadProgress("");
    }
  };

  const testUpload = async () => {
    if (!selfie) {
      alert("Please capture a selfie first");
      return;
    }
    try {
      setUploading(true);
      setUploadProgress("Testing upload...");
      const testBlob = base64ToBlob(selfie);
      const formData = new FormData();
      formData.append("file", testBlob, "test_upload.jpg");
      formData.append("AppType", "ExamExpress");
      formData.append("AgencyID", agencyId.toString());
      formData.append("BatchID", batchId.toString());
      formData.append("CandidateID", candidateId.toString());
      formData.append("DOCID", "1");

      const response = await api.post("/Upload", formData);
      alert(`Test upload: SUCCESS\nResponse: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error: any) {
      alert(`Test upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const renderUploadStatus = () => {
    const { selfie: selfieStatus, document: docStatus, message } = uploadStatus;
    return (
      <div className="mt-4 p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Upload Status</span>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-2 rounded ${selfieStatus === 'success' ? 'bg-green-50 border border-green-200' :
            selfieStatus === 'error' ? 'bg-red-50 border border-red-200' :
              selfieStatus === 'uploading' ? 'bg-blue-50 border border-blue-200' :
                'bg-white border'}`}>
            <div className="flex items-center gap-2">
              {selfieStatus === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                selfieStatus === 'error' ? <XCircle className="w-4 h-4 text-red-600" /> :
                  selfieStatus === 'uploading' ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> :
                    <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
              <span className="text-xs font-medium">Selfie</span>
            </div>
            <div className="text-xs mt-1">
              {selfieStatus === 'success' ? 'Uploaded ✓' :
                selfieStatus === 'error' ? 'Failed ✗' :
                  selfieStatus === 'uploading' ? 'Uploading...' :
                    selfieCaptured ? 'Ready' : 'Pending'}
            </div>
          </div>
          <div className={`p-2 rounded ${docStatus === 'success' ? 'bg-green-50 border border-green-200' :
            docStatus === 'error' ? 'bg-red-50 border border-red-200' :
              docStatus === 'uploading' ? 'bg-blue-50 border border-blue-200' :
                'bg-white border'}`}>
            <div className="flex items-center gap-2">
              {docStatus === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                docStatus === 'error' ? <XCircle className="w-4 h-4 text-red-600" /> :
                  docStatus === 'uploading' ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> :
                    <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
              <span className="text-xs font-medium">Document</span>
            </div>
            <div className="text-xs mt-1">
              {docStatus === 'success' ? 'Uploaded ✓' :
                docStatus === 'error' ? 'Failed ✗' :
                  docStatus === 'uploading' ? 'Uploading...' :
                    documentCaptured ? 'Ready' : 'Pending'}
            </div>
          </div>
        </div>
        {networkError && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded"><p className="text-xs text-red-600">{networkError}</p></div>}
        
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Exam Instructions</h1>
          <p className="text-sm text-gray-500 mt-1">Read carefully before starting the exam</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          <div className="lg:w-2/3 bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Exam Rules & Instructions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {instructions.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex gap-3 p-4 rounded-lg border hover:bg-gray-50">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lg:w-1/3 bg-white rounded-xl p-6 shadow-sm border space-y-6">
            <h2 className="text-lg font-semibold text-center">Identity Verification</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Selfie</p>
                  {selfieCaptured && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✓ Captured</span>}
                </div>
                <div className="relative aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                  {cameraMode === "selfie" ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> :
                    selfie ? <img src={selfie} alt="Selfie" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Camera className="w-12 h-12 mb-2" /><span className="text-sm">No selfie</span></div>}
                </div>
                <div className="flex gap-2">
                  {!selfie ? <Button onClick={() => startCamera("selfie")} className="flex-1" size="sm"><Camera className="w-4 h-4 mr-2" />Take Selfie</Button> :
                    <><Button onClick={() => startCamera("selfie")} variant="outline" className="flex-1" size="sm">Retake</Button>
                      <Button onClick={() => setCameraMode("selfie")} className="flex-1" size="sm">Preview</Button></>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">ID Document</p>
                  {documentCaptured && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✓ Captured</span>}
                </div>
                <div className="relative aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                  {cameraMode === "document" ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> :
                    documentImage ? <img src={documentImage} alt="Document" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Camera className="w-12 h-12 mb-2" /><span className="text-sm">No document</span></div>}
                </div>
                <div className="flex gap-2">
                  {!documentImage ? <Button onClick={() => startCamera("document")} className="flex-1" size="sm"><Camera className="w-4 h-4 mr-2" />Capture ID</Button> :
                    <><Button onClick={() => startCamera("document")} variant="outline" className="flex-1" size="sm">Retake</Button>
                      <Button onClick={() => setCameraMode("document")} className="flex-1" size="sm">Preview</Button></>}
                </div>
              </div>
            </div>
            {cameraMode && <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm">Taking {cameraMode === "selfie" ? "Selfie" : "Document"} Photo</span>
                <Button onClick={stopCamera} variant="ghost" size="sm" className="h-8">Cancel</Button>
              </div>
              <Button onClick={capturePhoto} className="w-full"><CheckCircle className="w-4 h-4 mr-2" />Capture Photo</Button>
            </div>}
            {renderUploadStatus()}
            {uploading && <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1"><p className="font-medium text-sm text-blue-700">Uploading Evidence</p>
                  {uploadProgress && <p className="text-xs text-blue-600 mt-1">{uploadProgress}</p>}</div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: uploadProgress.includes("complete") ? "100%" : "50%" }}></div>
              </div>
            </div>}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex gap-3"><AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div><p className="font-medium text-sm text-yellow-800 mb-1">Important Security Notice</p>
              <p className="text-sm text-yellow-700">Any violation of exam rules will result in immediate disqualification. AI proctoring continuously monitors your activity. All evidence is securely stored in AWS S3.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Checkbox id="agreement" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="h-5 w-5" />
            <label htmlFor="agreement" className="text-sm font-medium cursor-pointer">I have read and agree to all exam instructions, rules, and consent to identity verification</label>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleProceed} disabled={!agreed || !selfie || !documentImage || uploading} className="min-w-[300px] h-12 text-base" size="lg">
              {uploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploading Evidence...</> : <><Upload className="w-5 h-5 mr-2" />Proceed to Exam</>}
            </Button>
          </div>
          {networkError && <div className="text-center">
            <p className="text-sm text-red-600">{networkError}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-2"><RefreshCw className="w-4 h-4 mr-2" />Refresh Page</Button>
          </div>}
        </div>
      </div>
    </div>
  );
}