import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, ChevronRight, Flag, AlertTriangle, Video, VideoOff, Maximize2, Minimize2, Menu, X, ChevronLeft, ChevronRight as ChevronRightIcon, AlertCircle, Camera } from "lucide-react";
import api from "@/Service/api";

interface ApiQuestion {
  QuestionID: number;
  Question: string;
  Option1?: string;
  Option2?: string;
  Option3?: string;
  Option4?: string;
  Option5?: string;
  Option6?: string;
  QType: number;
}

interface UIQuestion {
  id: number;
  questionId: number;
  question: string;
  options: string[];
  answered: boolean;
  flagged: boolean;
  type: number;
  answer: string | string[];
}

interface CandidateInfo {
  QB_TheoryID: number;
}

export default function Exam() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const permissionGrantedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const initAttemptedRef = useRef(false);
  const lastFullscreenAlertRef = useRef(0);
  const faceDetectorRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastFaceWarnRef = useRef(0);
  const lastAudioWarnRef = useRef(0);
  
  const [recordingActive, setRecordingActive] = useState(false);
  const [lastVideoUploadTime, setLastVideoUploadTime] = useState<number>(0);
  const [lastPhotoCaptureTime, setLastPhotoCaptureTime] = useState<number>(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [currentVideoMinute, setCurrentVideoMinute] = useState<number>(0);
  const [totalVideoChunks, setTotalVideoChunks] = useState<number>(0);
  const [videoChunks, setVideoChunks] = useState<Array<{minute: number, timestamp: Date, uploaded: boolean}>>([]);

  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>("");
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
  const [examDurationMinutes] = useState<number>(60);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error" | "blocked">("idle");
  const [errorDetails, setErrorDetails] = useState("");
  const [isProctoringMinimized, setIsProctoringMinimized] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [questionsPerRow, setQuestionsPerRow] = useState(6);
  const questionsContainerRef = useRef<HTMLDivElement>(null);
  
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullscreenRequested, setFullscreenRequested] = useState(false);
  const [faceCount, setFaceCount] = useState<number>(0);
  const [lastFaceCount, setLastFaceCount] = useState<number>(0);

  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelTestDialog, setShowCancelTestDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenButton, setShowFullscreenButton] = useState(true);
  const [showAnswerAlert, setShowAnswerAlert] = useState(false);

  const answeredCount = useMemo(() => {
    return questions.filter(q => q.answered).length;
  }, [questions]);

  const flaggedCount = useMemo(() => {
    return questions.filter(q => q.flagged).length;
  }, [questions]);

  const allQuestionsAnswered = useMemo(() => {
    return questions.length > 0 && questions.every(q => q.answered);
  }, [questions]);

  const saveQuizStartStatus = useCallback(async () => {
    try {
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const candidateId = candidate.candidateId;
      const quizId = candidate.QB_TheoryID;

      if (!quizId || !candidateId) {
        console.warn("QuizID or CandidateID missing, skipping quiz start status");
        return;
      }

      await api.post("/SaveQuizStartStatus", null, {
        params: { QuizID: quizId, CandidateID: candidateId, AppType: "ExamExpress" }
      });

      console.log("Quiz start status saved successfully");
    } catch (error) {
      console.error("Failed to save quiz start status:", error);
    }
  }, []);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setAlerts(prev => ["⚠️ Copying text is not allowed during exam", ...prev.slice(0, 4)]);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setAlerts(prev => ["⚠️ Pasting text is not allowed during exam", ...prev.slice(0, 4)]);
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setAlerts(prev => ["⚠️ Cutting text is not allowed during exam", ...prev.slice(0, 4)]);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setAlerts(prev => ["⚠️ Right-click is disabled during exam", ...prev.slice(0, 4)]);
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !showSubmitDialog && !showCancelTestDialog) {
        const now = Date.now();
        if (now - lastFullscreenAlertRef.current > 10000) {
          lastFullscreenAlertRef.current = now;
          setFullscreenViolationCount(prev => prev + 1);
          
          if (fullscreenViolationCount >= 2) {
            handleAutoSubmit();
          } else {
            setShowFullscreenWarning(true);
            setAlerts(prev => ["⚠️ Fullscreen mode is required for the exam. Please return to fullscreen immediately.", ...prev.slice(0, 4)]);
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F11") {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        if (now - lastFullscreenAlertRef.current > 10000) {
          lastFullscreenAlertRef.current = now;
          setFullscreenViolationCount(prev => prev + 1);
          
          if (fullscreenViolationCount >= 2) {
            handleAutoSubmit();
          } else {
            setShowFullscreenWarning(true);
            setAlerts(prev => ["⚠️ Exit shortcuts are disabled. Do not attempt to exit fullscreen.", ...prev.slice(0, 4)]);
          }
        }
        return false;
      }

      if ((e.ctrlKey && (e.key === "r" || e.key === "R")) || (e.metaKey && e.key === "r")) {
        e.preventDefault();
        setAlerts(prev => ["⚠️ Page refresh is disabled during exam", ...prev.slice(0, 4)]);
        return false;
      }

      if ((e.ctrlKey && e.key === "p") || (e.metaKey && e.key === "p")) {
        e.preventDefault();
        setAlerts(prev => ["⚠️ Print is disabled during exam", ...prev.slice(0, 4)]);
        return false;
      }

      if ((e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) || 
          (e.metaKey && e.shiftKey && e.key === "4")) {
        e.preventDefault();
        setAlerts(prev => ["⚠️ Screenshot shortcuts are disabled", ...prev.slice(0, 4)]);
        return false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setAlerts(prev => ["⚠️ Tab switch detected! Return to exam immediately.", ...prev.slice(0, 4)]);
        
        if (tabSwitchCount >= 3) {
          handleAutoSubmit();
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? The exam will be auto-submitted.";
      return "Are you sure you want to leave? The exam will be auto-submitted.";
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("blur", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("blur", handleVisibilityChange);
    };
  }, [fullscreenViolationCount, showSubmitDialog, showCancelTestDialog, tabSwitchCount]);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!fullscreenRequested && !document.fullscreenElement) {
        setFullscreenRequested(true);
        setShowFullscreenButton(false);
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [fullscreenRequested]);

  const enterFullscreen = useCallback(() => {
    if (document.fullscreenElement) return;
    
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.log("Fullscreen error:", err);
        if (err.name !== 'AbortError') {
          setAlerts(prev => ["⚠️ Please enable fullscreen mode for the exam.", ...prev.slice(0, 4)]);
        }
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (!showSubmitDialog && !showCancelTestDialog) {
      setShowFullscreenWarning(true);
      return;
    }
    
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, [showSubmitDialog, showCancelTestDialog]);

  const handleAutoSubmit = async () => {
    setAlerts(prev => ["⚠️ Exam is being auto-submitted due to violations.", ...prev.slice(0, 4)]);
    
    await saveAnswers(true, true);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (mediaRecorderRef.current && recordingActive) {
      mediaRecorderRef.current.stop();
    }
    
    setTimeout(() => {
      navigate("/Feedback", { state: { violated: true } });
    }, 2000);
  };

  useEffect(() => {
    const updateQuestionsPerRow = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setQuestionsPerRow(3);
      } else if (width < 768) {
        setQuestionsPerRow(4);
      } else if (width < 1024) {
        setQuestionsPerRow(5);
      } else {
        setQuestionsPerRow(6);
      }
    };

    updateQuestionsPerRow();
    window.addEventListener('resize', updateQuestionsPerRow);
    return () => window.removeEventListener('resize', updateQuestionsPerRow);
  }, []);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  useEffect(() => {
    const totalSeconds = 60 * 60;
    const minutesPassed = Math.floor((totalSeconds - timeRemaining) / 60);
    if (minutesPassed !== currentVideoMinute) {
      setCurrentVideoMinute(minutesPassed);
    }
  }, [timeRemaining, currentVideoMinute]);

  const handleTimeUp = async () => {
    setAlerts(prev => ["⏰ Time is up! The exam will be auto-submitted.", ...prev.slice(0, 4)]);
    
    await saveAnswers(true, true);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (mediaRecorderRef.current && recordingActive) {
      mediaRecorderRef.current.stop();
    }
    
    setTimeout(() => {
      navigate("/Feedback", { state: { timeUp: true } });
    }, 3000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (questions.length > 0 && currentQuestion < questions.length) {
        const currentQ = questions[currentQuestion];
        if (currentQ) {
          setQuestionTimes(prev => ({
            ...prev,
            [currentQ.questionId]: (prev[currentQ.questionId] || 0) + 1
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, questions]);

  const generateS3FileName = useCallback((docId: number, minute?: number): string => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear().toString().slice(-2)}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
    
    const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
    const candidateId = candidate.candidateId || "unknown";
    
    const extension = docId === 4 ? 'mp4' : 'jpg';
    
    if (docId === 4 && minute !== undefined) {
      return `API_${candidateId}_${docId}_${dateStr}_${timeStr}_Minute_${minute + 1}_of_60.${extension}`;
    }
    
    return `API_${candidateId}_${docId}_${dateStr}_${timeStr}.${extension}`;
  }, []);

  const getBucketNameFromS3Url = useCallback((url: string): string => {
    try {
      return new URL(url).hostname.split(".")[0];
    } catch {
      return "";
    }
  }, []);

  const base64ToBlob = useCallback((base64: string, type = 'image/jpeg'): Blob => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }, []);

  const saveToDatabase = useCallback(async (
    imageType: number,
    imageUrl: string,
    fileName: string,
    bucketName: string
  ) => {
    try {
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const { candidateId, batchId } = candidate;
      
      let location = "Lati:28.508371_Longi:77.3790765";
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = `Lati:${position.coords.latitude}_Longi:${position.coords.longitude}`;
        } catch (geoError) {
          console.log("Geolocation failed, using default location");
        }
      }

      const response = await api.post("/SaveEvidence", null, {
        params: {
          CandidateID: candidateId,
          BatchID: batchId,
          ImageFor: imageType,
          ImageName: "/" + fileName,
          BucketName: bucketName,
          Location: location,
          AppType: "ExamExpress"
        }
      });

      if (response.status !== 200) {
        throw new Error("Database save failed");
      }

      return response.data;
    } catch (error) {
      console.error("Error saving to database:", error);
      throw error;
    }
  }, []);

  const uploadMediaToAWS = useCallback(async (blob: Blob, docId: 4 | 5, minute?: number) => {
    try {
      setIsUploadingMedia(true);
      
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const { candidateId, batchId, agencyId } = candidate;
      
      const fileName = generateS3FileName(docId, minute);
      const formData = new FormData();

      formData.append("file", blob, fileName);
      formData.append("AppType", "ExamExpress");
      formData.append("AgencyID", agencyId?.toString() || "0");
      formData.append("BatchID", batchId?.toString() || "0");
      formData.append("CandidateID", candidateId?.toString() || "0");
      formData.append("DOCID", docId.toString());

      if (docId === 4 && minute !== undefined) {
        formData.append("Minute", (minute + 1).toString());
        formData.append("TotalMinutes", "60");
      }

      const uploadResponse = await api.post("/Upload", formData);

      if (!uploadResponse.data?.url) {
        throw new Error("Upload failed");
      }

      const mediaUrl = uploadResponse.data.url;
      const savedFileName = uploadResponse.data.fileName || fileName;
      const bucketName = getBucketNameFromS3Url(mediaUrl);

      await saveToDatabase(docId, mediaUrl, savedFileName, bucketName);

      console.log(`${docId === 4 ? 'Video' : 'Photo'} uploaded successfully:`, mediaUrl);
      
      if (docId === 4) {
        setTotalVideoChunks(prev => prev + 1);
        setVideoChunks(prev => [...prev, {
          minute: minute || 0,
          timestamp: new Date(),
          uploaded: true
        }]);
      }
      
      return { success: true, url: mediaUrl, fileName: savedFileName };
    } catch (error: any) {
      console.error(`Upload failed for DOCID ${docId}:`, error);
      
      if (docId === 4 && minute !== undefined) {
        setVideoChunks(prev => [...prev, {
          minute: minute,
          timestamp: new Date(),
          uploaded: false
        }]);
      }
      
      return { success: false, error };
    } finally {
      setIsUploadingMedia(false);
    }
  }, [generateS3FileName, getBucketNameFromS3Url, saveToDatabase]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || cameraState !== "active") return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const blob = base64ToBlob(dataUrl);
        
        await uploadMediaToAWS(blob, 5);
        setLastPhotoCaptureTime(Date.now());
        
        setAlerts(prev => ["📸 Random photo captured", ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
    }
  }, [cameraState, uploadMediaToAWS, base64ToBlob]);

  const startVideoRecording = useCallback(() => {
    if (!mediaStreamRef.current || recordingActive) return;

    try {
      recordedChunksRef.current = [];
      
      let options = {};
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { 
            type: mediaRecorder.mimeType || 'video/webm'
          });
          
          setVideoChunks(prev => [...prev, {
            minute: currentVideoMinute,
            timestamp: new Date(),
            uploaded: false
          }]);
          
          await uploadMediaToAWS(blob, 4, currentVideoMinute);
          recordedChunksRef.current = [];
          
          setAlerts(prev => [`🎥 30-second video recorded (Minute ${currentVideoMinute + 1}/60)`, ...prev.slice(0, 4)]);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecordingActive(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current && recordingActive && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          setRecordingActive(false);
          setLastVideoUploadTime(Date.now());
        }
      }, 30000);
    } catch (error) {
      console.error("Error starting video recording:", error);
      setAlerts(prev => ["⚠️ Video recording failed: " + error, ...prev.slice(0, 4)]);
    }
  }, [recordingActive, uploadMediaToAWS, currentVideoMinute]);

  useEffect(() => {
    let photoTimeout: NodeJS.Timeout;
    let videoTimeout: NodeJS.Timeout;

    const scheduleNextPhoto = () => {
      photoTimeout = setTimeout(() => {
        capturePhoto();
        scheduleNextVideo();
      }, 60000);
    };

    const scheduleNextVideo = () => {
      videoTimeout = setTimeout(() => {
        startVideoRecording();
        setTimeout(() => {
          scheduleNextPhoto();
        }, 30000);
      }, 0);
    };

    if (cameraState === "active") {
      photoTimeout = setTimeout(() => {
        capturePhoto();
        videoTimeout = setTimeout(() => {
          startVideoRecording();
          setTimeout(() => {
            scheduleNextPhoto();
          }, 30000);
        }, 35000);
      }, 5000);
    }

    return () => {
      if (photoTimeout) clearTimeout(photoTimeout);
      if (videoTimeout) clearTimeout(videoTimeout);
      if (mediaRecorderRef.current && recordingActive) {
        mediaRecorderRef.current.stop();
        setRecordingActive(false);
      }
    };
  }, [cameraState, capturePhoto, startVideoRecording, recordingActive]);

  const checkExistingPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (cameraPermission.state === "granted") {
          permissionGrantedRef.current = true;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const waitForVideoElement = (maxAttempts = 10, interval = 200) => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (videoRef.current) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          resolve(false);
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  };

  const startCameraSilently = async () => {
    if (cameraState === "active" || cameraState === "requesting") return;
    
    setCameraState("requesting");

    try {
      const videoElementReady = await waitForVideoElement();
      if (!videoElementReady || !videoRef.current) {
        console.error("Video element not ready after waiting");
        setCameraState("error");
        setErrorDetails("Video element not found");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { min: 320, ideal: 640 },
          height: { min: 240, ideal: 480 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      
      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            setCameraState("active");
            startFaceDetection();
            startAudioMonitoring(stream);
          })
          .catch((playError) => {
            console.log("Autoplay blocked, but stream is active:", playError);
            setCameraState("active");
            startFaceDetection();
            startAudioMonitoring(stream);
          });
      };

      video.onerror = (error) => {
        console.error("Video error:", error);
        setCameraState("error");
        setErrorDetails("Video playback error");
      };

    } catch (error: any) {
      console.error("Camera start failed:", error);
      setCameraState("error");
      
      if (error.name === "NotAllowedError") {
        setErrorDetails("Camera permission needed. Click to enable.");
      } else if (error.name === "NotFoundError") {
        setErrorDetails("No camera found");
      } else if (error.name === "NotReadableError") {
        setErrorDetails("Camera in use by another app");
      } else {
        setErrorDetails("Camera error: " + (error.message || "Unknown"));
      }
    }
  };

  const forceCameraStart = async () => {
    if (!videoRef.current) {
      console.error("Video ref not available");
      return;
    }

    userInteractedRef.current = true;
    setCameraState("requesting");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setCameraState("active");
            startFaceDetection();
            startAudioMonitoring(stream);
          })
          .catch((playError) => {
            console.log("Play failed but stream active:", playError);
            setCameraState("active");
            startFaceDetection();
            startAudioMonitoring(stream);
          });
      }
    } catch (error: any) {
      setCameraState("error");
      setErrorDetails("Please allow camera access");
    }
  };

  useEffect(() => {
    if (initAttemptedRef.current) return;
    
    const init = async () => {
      initAttemptedRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const hasPermission = await checkExistingPermission();
      
      if (hasPermission) {
        await waitForVideoElement();
        startCameraSilently();
      }
    };

    init();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        mediaStreamRef.current = null;
      }
      if (mediaRecorderRef.current && recordingActive) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        if (cameraState !== "active" && videoRef.current) {
          forceCameraStart();
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [cameraState]);

  const startFaceDetection = () => {
    if (!("FaceDetector" in window) || !videoRef.current) return;

    try {
      faceDetectorRef.current = new (window as any).FaceDetector({
        fastMode: true,
        maxDetectedFaces: 5,
      });

      const interval = setInterval(async () => {
        if (!videoRef.current || cameraState !== "active") {
          clearInterval(interval);
          return;
        }

        try {
          const faces = await faceDetectorRef.current.detect(videoRef.current);
          const now = Date.now();
          
          setFaceCount(faces.length);
          
          if (faces.length !== lastFaceCount) {
            if (faces.length === 0) {
              setAlerts(a => ["⚠️ No face detected", ...a.slice(0, 4)]);
            } else if (faces.length === 1) {
              setAlerts(a => ["✅ Face detected", ...a.slice(0, 4)]);
            } else if (faces.length > 1) {
              setAlerts(a => ["⚠️ Multiple faces detected", ...a.slice(0, 4)]);
            }
            setLastFaceCount(faces.length);
          }
          
        } catch (e) {
          console.error("Face detection error:", e);
        }
      }, 3000);
    } catch (err) {
      console.error("Face detector initialization error:", err);
    }
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const interval = setInterval(() => {
        if (!analyserRef.current || cameraState !== "active") {
          clearInterval(interval);
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const now = Date.now();
        
        if (avg > 85 && now - lastAudioWarnRef.current > 5000) {
          lastAudioWarnRef.current = now;
          setAlerts(a => ["🔊 High audio level detected", ...a.slice(0, 4)]);
        }
      }, 2000);
    } catch (err) {
      console.error("Audio monitoring error:", err);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth token missing");
      
      const baseCandidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const { candidateId, batchId } = baseCandidate;
      
      if (!candidateId || !batchId) {
        throw new Error("candidateId or batchId missing");
      }
      
      const candidateRes = await api.get<CandidateInfo>("/CanidateInfoByCandidateID", {
        params: { CandidateID: candidateId, BatchID: batchId, AppType: "ExamExpress" },
      });
      
      const candidateData = candidateRes.data;
      if (!candidateData?.QB_TheoryID) {
        throw new Error("QB_TheoryID missing in candidate info");
      }
      
      const updatedCandidate = { ...baseCandidate, QB_TheoryID: candidateData.QB_TheoryID };
      localStorage.setItem("candidate", JSON.stringify(updatedCandidate));
      
      await saveQuizStartStatus();
      
      const quizRes = await api.get<ApiQuestion[]>("/TheoryQuiz", {
        params: {
          TheoryQuizID: candidateData.QB_TheoryID,
          BatchID: batchId,
          LangCode: "en",
          AppType: "ExamExpress",
        },
      });
      
      const data = quizRes.data;
      const formatted: UIQuestion[] = data.map((q, index) => ({
        id: index + 1,
        questionId: q.QuestionID,
        question: q.Question,
        options: [q.Option1, q.Option2, q.Option3, q.Option4, q.Option5, q.Option6]
          .filter(Boolean) as string[],
        type: q.QType || 1,
        answered: false,
        flagged: false,
        answer: q.QType === 2 ? [] : ""
      }));
      
      setQuestions(formatted);
      setCurrentQuestion(0);
      if (formatted.length > 0) {
        setSelectedAnswer(formatted[0].answer || "");
      }
      
    } catch (err: any) {
      console.error("Exam Load Error:", err.message);
      setAlerts(a => [err.message, ...a.slice(0, 4)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length) {
      setSelectedAnswer(questions[currentQuestion].answer || "");
    }
  }, [currentQuestion, questions]);

  const prepareAnswerData = () => {
    const optionParts: string[] = [];
    const timeParts: string[] = [];

    questions.forEach(q => {
      let answerStr = "";
      
      if (q.type === 2) {
        if (Array.isArray(q.answer) && q.answer.length > 0) {
          answerStr = q.answer.join("|||");
        } else {
          answerStr = "";
        }
      } else if (q.type === 4 || q.type === 5 || q.type === 6) {
        answerStr = (q.answer as string) || "";
      } else {
        if (q.answer && q.options.length > 0) {
          const idx = q.options.indexOf(q.answer as string);
          if (idx !== -1) {
            answerStr = q.answer as string;
          } else if (q.type === 3) {
            answerStr = q.answer as string;
          } else {
            answerStr = q.answer as string;
          }
        } else {
          answerStr = "";
        }
      }

      const flagStatus = q.flagged ? "1" : "0";
      optionParts.push(`${q.questionId}_${answerStr}_${flagStatus}`);

      const timeSpent = questionTimes[q.questionId] || 0;
      timeParts.push(`${q.questionId}_${timeSpent}`);
    });

    const Option = optionParts.join(",");
    const Time = timeParts.join(",");

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).toUpperCase();
    
    const AI = alerts.slice(0, 3).map(alert => {
      return `${formattedTime}_${alert}`;
    }).join(", ");

    return { Option, Time, AI };
  };

  const saveAnswers = async (isFinalSubmit: boolean = false, isAutoSubmit: boolean = false) => {
    try {
      setIsSaving(true);
      
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const { candidateId, batchId, QB_TheoryID } = candidate;
      
      if (!candidateId || !batchId || !QB_TheoryID) {
        throw new Error("Candidate information missing");
      }

      const { Option, Time, AI } = prepareAnswerData();
      
      const totalTimeTaken = (60 * 60) - timeRemaining;

      let location = "Lati:28.508371_Longi:77.3790765";
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = `Lati:${position.coords.latitude}_Longi:${position.coords.longitude}`;
        } catch (geoError) {
          console.log("Geolocation failed, using default location");
        }
      }

      const params = {
        CandidateID: candidateId,
        QuizID: QB_TheoryID,
        BatchID: batchId,
        WindowCount: tabSwitchCount,
        WarningCount: alerts.length,
        ResponseType: "Theory",
        AppType: "ExamExpress",
        TimeTakenInSeconds: totalTimeTaken,
        Location: location,
        LangCode: "en",
        AutoSubmitStatus: isAutoSubmit ? 1 : 0,
        Action: isFinalSubmit ? "FinalSubmit" : "TempSubmit"
      };

      const requestBody = {
        Option,
        Time,
        AI
      };

      const response = await api.post(
        "/SaveTheoryAndPracticalMCQResponse", 
        requestBody, 
        { params }
      );

      if (response.data) {
        setLastSaveTime(new Date());
        if (!isFinalSubmit) {
          setAlerts(prev => ["✅ Answers saved successfully", ...prev.slice(0, 4)]);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Save error:", error);
      setAlerts(prev => [" Failed to save answers: " + (error.message || "Unknown error"), ...prev.slice(0, 4)]);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!allQuestionsAnswered) {
      setShowAnswerAlert(true);
      return;
    }
    
    if (questions.length > 0) {
      const saved = await saveAnswers(false, false);
      if (saved) {
        setAlerts(prev => ["✅ Progress saved successfully!", ...prev.slice(0, 4)]);
      }
    } else {
      setAlerts(prev => ["ℹ️ No answers to save yet", ...prev.slice(0, 4)]);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSaveAndNext = () => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      answered: true,
      answer: selectedAnswer
    };
    setQuestions(updatedQuestions);
    
    if (currentQuestion < updatedQuestions.length - 1) {
      setCurrentQuestion(c => c + 1);
    } else {
      setAlerts(a => ["You are on the last question. Please submit the test.", ...a.slice(0, 4)]);
    }
  };

  const handleFlagQuestion = () => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion].flagged = !updatedQuestions[currentQuestion].flagged;
    setQuestions(updatedQuestions);
  };

  const handleCheckboxChange = (option: string, isChecked: boolean) => {
    if (questions[currentQuestion].type !== 2) return;
    
    let updatedAnswers: string[];
    if (Array.isArray(selectedAnswer)) {
      if (isChecked) {
        updatedAnswers = [...selectedAnswer, option];
      } else {
        updatedAnswers = selectedAnswer.filter(item => item !== option);
      }
    } else {
      updatedAnswers = isChecked ? [option] : [];
    }
    
    setSelectedAnswer(updatedAnswers);
  };

  const handleTextAnswerChange = (value: string) => {
    setSelectedAnswer(value);
  };

  const renderQuestionByType = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return null;

    switch (currentQ.type) {
      case 1:
        return (
          <RadioGroup 
            value={selectedAnswer as string} 
            onValueChange={(value) => setSelectedAnswer(value)} 
            className="space-y-3 md:space-y-4"
          >
            {currentQ.options.map((option, index) => (
              <div
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`p-4 md:p-5 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedAnswer === option 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3 md:mr-4 ${
                    selectedAnswer === option ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-grow">
                    <RadioGroupItem value={option} id={`opt-${index}`} className="hidden" />
                    <Label htmlFor={`opt-${index}`} className="text-base md:text-lg cursor-pointer select-none">
                      {option}
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        );

      case 2:
        return (
          <div className="space-y-3 md:space-y-4">
            {currentQ.options.map((option, index) => {
              const isChecked = Array.isArray(selectedAnswer) 
                ? selectedAnswer.includes(option) 
                : false;
              
              return (
                <div
                  key={index}
                  className={`p-4 md:p-5 border rounded-lg transition-all duration-200 ${
                    isChecked 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <Checkbox
                      id={`checkbox-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                      className="mr-3 md:mr-4 h-5 w-5"
                    />
                    <div className="flex-grow">
                      <Label 
                        htmlFor={`checkbox-${index}`} 
                        className="text-base md:text-lg cursor-pointer select-none"
                      >
                        {option}
                      </Label>
                    </div>
                  </div>
                </div>
              );
            })}
            {Array.isArray(selectedAnswer) && selectedAnswer.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  Selected: {selectedAnswer.length} option(s)
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <RadioGroup 
            value={selectedAnswer as string} 
            onValueChange={(value) => setSelectedAnswer(value)} 
            className="space-y-3 md:space-y-4"
          >
            <div
              onClick={() => setSelectedAnswer("True")}
              className={`p-4 md:p-5 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedAnswer === "True" 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3 md:mr-4 ${
                  selectedAnswer === "True" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  T
                </div>
                <div className="flex-grow">
                  <RadioGroupItem value="True" id="true-option" className="hidden" />
                  <Label htmlFor="true-option" className="text-base md:text-lg cursor-pointer select-none">
                    True
                  </Label>
                </div>
              </div>
            </div>
            
            <div
              onClick={() => setSelectedAnswer("False")}
              className={`p-4 md:p-5 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedAnswer === "False" 
                  ? "border-red-500 bg-red-50" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3 md:mr-4 ${
                  selectedAnswer === "False" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  F
                </div>
                <div className="flex-grow">
                  <RadioGroupItem value="False" id="false-option" className="hidden" />
                  <Label htmlFor="false-option" className="text-base md:text-lg cursor-pointer select-none">
                    False
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">Type your answer in the box below:</p>
              <Input
                value={selectedAnswer as string}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                placeholder="Enter your answer here..."
                className="h-12 text-lg"
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• Fill in the blank with the correct word or phrase</p>
              <p>• Check your spelling before submitting</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">Write your short answer below:</p>
              <Textarea
                value={selectedAnswer as string}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                placeholder="Write your answer here... (Short answer)"
                className="min-h-[150px] text-base resize-y"
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
              />
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Recommended length: 2-3 sentences</span>
              <span>{(selectedAnswer as string).length} characters</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">Write your essay below:</p>
              <Textarea
                value={selectedAnswer as string}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                placeholder="Write your essay here... (Minimum 150 words)"
                className="min-h-[300px] text-base resize-y"
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
              />
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Recommended: 150-300 words</span>
                <span className="flex items-center gap-1">
                  <span className="font-medium">Words:</span>
                  {(selectedAnswer as string).trim().split(/\s+/).filter(word => word.length > 0).length}
                </span>
              </div>
              <span>{(selectedAnswer as string).length} characters</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Structure your essay with introduction, body, and conclusion</p>
              <p>• Use proper grammar and punctuation</p>
              <p>• Support your arguments with examples where applicable</p>
            </div>
          </div>
        );

      default:
        return (
          <RadioGroup 
            value={selectedAnswer as string} 
            onValueChange={(value) => setSelectedAnswer(value)} 
            className="space-y-3 md:space-y-4"
          >
            {currentQ.options.map((option, index) => (
              <div
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`p-4 md:p-5 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedAnswer === option 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3 md:mr-4 ${
                    selectedAnswer === option ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-grow">
                    <RadioGroupItem value={option} id={`opt-${index}`} className="hidden" />
                    <Label htmlFor={`opt-${index}`} className="text-base md:text-lg cursor-pointer select-none">
                      {option}
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        );
    }
  };

  const getQuestionTypeLabel = (type: number) => {
    switch (type) {
      case 1: return "Single Choice";
      case 2: return "Multiple Choice";
      case 3: return "True/False";
      case 4: return "Fill in the Blanks";
      case 5: return "Short Answer";
      case 6: return "Essay";
      default: return "Question";
    }
  };

  const getAnswerStatus = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return "Not answered";
    
    if (currentQ.type === 2) {
      if (Array.isArray(selectedAnswer) && selectedAnswer.length > 0) {
        return `${selectedAnswer.length} option(s) selected`;
      }
      return "No options selected";
    } else {
      if (typeof selectedAnswer === 'string' && selectedAnswer.trim().length > 0) {
        return "Answered";
      }
      return "Not answered";
    }
  };

  const isAnswerValid = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return false;
    
    if (currentQ.type === 2) {
      return Array.isArray(selectedAnswer) && selectedAnswer.length > 0;
    } else {
      return typeof selectedAnswer === 'string' && selectedAnswer.trim().length > 0;
    }
  };

  const handleSubmit = () => {
    if (!allQuestionsAnswered) {
      setShowAnswerAlert(true);
      const firstUnansweredIndex = questions.findIndex(q => !q.answered);
      if (firstUnansweredIndex !== -1) {
        setCurrentQuestion(firstUnansweredIndex);
      }
      return;
    }
    
    const flaggedQuestions = questions.filter(q => q.flagged);
    
    if (flaggedQuestions.length > 0) {
      const flaggedNumbers = flaggedQuestions.map(q => q.id).join(", ");
      
      setAlerts(a => [
        `⚠️ Please remove flags from the following questions: ${flaggedNumbers}`,
        "You cannot submit while questions are flagged for review.",
        ...a.slice(0, 2)
      ]);
      
      const firstFlaggedIndex = questions.findIndex(q => q.flagged);
      if (firstFlaggedIndex !== -1) {
        setCurrentQuestion(firstFlaggedIndex);
      }
      
      return;
    }
    
    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    const saved = await saveAnswers(true, false);
    if (saved) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (mediaRecorderRef.current && recordingActive) {
        mediaRecorderRef.current.stop();
      }
      
      setShowSubmitDialog(false);
      
      navigate("/Feedback", { 
        state: { 
          submitted: true,
          questions: questions,
          timeSpent: (60 * 60) - timeRemaining,
          videoChunks: totalVideoChunks
        } 
      });
    } else {
      setAlerts(prev => [" Could not submit exam. Please try again.", ...prev.slice(0, 4)]);
    }
  };

  const handleCancelTest = () => {
    setShowCancelTestDialog(true);
  };

  const confirmCancelTest = async () => {
    await saveAnswers(false, false);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (mediaRecorderRef.current && recordingActive) {
      mediaRecorderRef.current.stop();
    }
    
    setShowCancelTestDialog(false);
    setAlerts(prev => ["⚠️ Test cancelled by user.", ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const getCameraStatusColor = () => {
    switch (cameraState) {
      case "active": return "bg-green-100 text-green-700";
      case "error": return "bg-yellow-100 text-yellow-700";
      case "blocked": return "bg-red-100 text-red-700";
      case "requesting": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getCameraStatusText = () => {
    switch (cameraState) {
      case "active": return "Active";
      case "error": return "Error";
      case "blocked": return "Blocked";
      case "requesting": return "Starting...";
      default: return "Inactive";
    }
  };

  const handleEnableCamera = () => {
    if (videoRef.current) {
      forceCameraStart();
    } else {
      console.error("Cannot start camera: video element not available");
      setAlerts(a => ["⚠️ Video element not ready", ...a.slice(0, 4)]);
    }
  };

  const toggleProctoringSize = () => {
    setIsProctoringMinimized(!isProctoringMinimized);
  };

  const handlePreviousQuestion = () => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      answered: isAnswerValid(),
      answer: selectedAnswer
    };
    setQuestions(updatedQuestions);
    
    if (currentQuestion > 0) {
      setCurrentQuestion(c => c - 1);
    }
  };

  const handleNextQuestion = () => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      answered: isAnswerValid(),
      answer: selectedAnswer
    };
    setQuestions(updatedQuestions);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
    } else {
      setAlerts(a => ["ℹ️ You are on the last question. Please submit the test.", ...a.slice(0, 4)]);
    }
  };

  const handleQuestionClick = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      answered: isAnswerValid(),
      answer: selectedAnswer
    };
    setQuestions(updatedQuestions);
    setCurrentQuestion(index);
  };

  const getQuestionRows = () => {
    const rows = [];
    for (let i = 0; i < questions.length; i += questionsPerRow) {
      rows.push(questions.slice(i, i + questionsPerRow));
    }
    return rows;
  };

  const getSubmitButtonText = () => {
    if (flaggedCount > 0) {
      return `Submit (${flaggedCount} Flagged)`;
    }
    return "Submit Test";
  };

  const getSaveStatusText = () => {
    if (isSaving) return "Saving...";
    if (lastSaveTime) {
      const minutesAgo = Math.floor((new Date().getTime() - lastSaveTime.getTime()) / 60000);
      if (minutesAgo === 0) return "Just saved";
      return `Saved ${minutesAgo} min ago`;
    }
    return "Not saved yet";
  };

  const getVideoRecordingInfo = () => {
    const minutesLeft = Math.max(0, 60 - currentVideoMinute);
    return {
      currentMinute: currentVideoMinute + 1,
      totalMinutes: 60,
      chunksRecorded: totalVideoChunks,
      chunksLeft: minutesLeft,
      uploadedChunks: videoChunks.filter(chunk => chunk.uploaded).length,
      totalChunks: videoChunks.length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-card rounded-xl border max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground mb-4">There are no questions for this exam. Please contact support.</p>
          <Button onClick={() => navigate("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const videoInfo = getVideoRecordingInfo();

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={showAnswerAlert} onOpenChange={setShowAnswerAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              All Questions Required
            </DialogTitle>
            <DialogDescription>
              You must attempt all questions before saving or submitting the exam.
              <br /><br />
              <span className="font-semibold">
                {answeredCount} of {questions.length} questions answered.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAnswerAlert(false)}
              className="w-full"
            >
              Continue Exam
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const firstUnansweredIndex = questions.findIndex(q => !q.answered);
                if (firstUnansweredIndex !== -1) {
                  setCurrentQuestion(firstUnansweredIndex);
                }
                setShowAnswerAlert(false);
              }}
              className="w-full"
            >
              Go to First Unanswered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFullscreenWarning} onOpenChange={setShowFullscreenWarning}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Fullscreen Required
            </DialogTitle>
            <DialogDescription>
              The exam must be taken in fullscreen mode. Please return to fullscreen immediately.
              <br /><br />
              <span className="font-semibold">
                Violation {fullscreenViolationCount + 1} of 3
              </span>
              <br />
              The exam will be auto-submitted on the 3rd violation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={() => {
                enterFullscreen();
                setShowFullscreenWarning(false);
              }}
              className="w-full"
            >
              Return to Fullscreen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit the exam?
              <br />
              {answeredCount} of {questions.length} questions answered.
              <br />
              {videoInfo.chunksRecorded} video chunks recorded.
              <br />
              <span className="font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSubmit}
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              {isSaving ? "Submitting..." : "Yes, Submit Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelTestDialog} onOpenChange={setShowCancelTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancel Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the exam?
              <br />
              <span className="font-semibold">
                All progress will be lost and this will be recorded as an incomplete attempt.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelTestDialog(false)}
              className="w-full sm:w-auto"
            >
              Continue Exam
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelTest}
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              {isSaving ? "Cancelling..." : "Yes, Cancel Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobileNav(!showMobileNav)}
            >
              {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <img src="../assets/examexpress.png" alt="ExamExpress" className="h-16 bg-white p-2 rounded" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
              lastSaveTime ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}>
              <div className={`w-2 h-2 rounded-full ${lastSaveTime ? "bg-green-500" : "bg-gray-500"}`}></div>
              <span>{getSaveStatusText()}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">{formatTime(timeRemaining)}</span>
              <span className="text-xs text-primary/70">(60:00 total)</span>
            </div>
            
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
              isFullscreen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              <div className={`w-2 h-2 rounded-full ${isFullscreen ? "bg-green-500" : "bg-red-500"}`}></div>
              <span>{isFullscreen ? "Fullscreen" : "Not Fullscreen"}</span>
            </div>
            
            {showFullscreenButton && !isFullscreen && (
              <Button
                variant="default"
                size="sm"
                onClick={enterFullscreen}
                className="hidden md:flex bg-red-500 hover:bg-red-600 text-white"
              >
                Enter Fullscreen
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTest}
              className="hidden md:flex border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Cancel Test
            </Button>
          </div>
        </div>
      </div>

      {!isFullscreen && showFullscreenButton && (
        <Alert variant="destructive" className="mx-4 mt-4 border-red-300 bg-red-50 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium flex items-center justify-between">
            <span>⚠️ Please enable fullscreen mode for the exam.</span>
            <Button
              variant="default"
              size="sm"
              onClick={enterFullscreen}
              className="ml-4 bg-red-500 hover:bg-red-600 text-white"
            >
              Click to Enter Fullscreen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showMobileNav && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileNav(false)}>
          <div className="absolute top-0 left-0 h-full w-3/4 bg-card p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Questions</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMobileNav(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    handleQuestionClick(i);
                    setShowMobileNav(false);
                  }}
                  className={`aspect-square rounded text-sm relative ${
                    currentQuestion === i
                      ? "bg-primary text-white"
                      : q.flagged
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : q.answered
                      ? "bg-green-100 text-green-700"
                      : "bg-muted"
                  }`}
                >
                  {q.id}
                  {q.flagged && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={handleManualSave}
              className="w-full mt-3"
              disabled={isSaving || !allQuestionsAnswered}
            >
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
            
            {!isFullscreen && (
              <Button
                variant="default"
                onClick={enterFullscreen}
                className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
              >
                Enter Fullscreen
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleCancelTest}
              className="w-full mt-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Cancel Test
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="hidden lg:block lg:w-1/6">
            <div className="bg-card p-3 rounded-xl border sticky top-24">
              <h3 className="font-semibold mb-3 text-sm">Questions ({questions.length})</h3>
              
              <div ref={questionsContainerRef} className="space-y-2 max-h-[500px] overflow-y-auto">
                {getQuestionRows().map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQuestionClick(q.id - 1)}
                        className={`flex-1 aspect-square rounded text-xs relative ${
                          currentQuestion === q.id - 1
                            ? "bg-primary text-white"
                            : q.flagged
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : q.answered
                            ? "bg-green-100 text-green-700"
                            : "bg-muted hover:bg-gray-200"
                        }`}
                      >
                        {q.id}
                        {q.flagged && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  className="w-full mb-3"
                  disabled={isSaving || !allQuestionsAnswered}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
                
                <div className="mb-3">
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Question Types</h4>
                  <div className="space-y-1 text-xs">
                    {[1,2,3,4,5,6].map(type => {
                      const count = questions.filter(q => q.type === type).length;
                      if (count === 0) return null;
                      return (
                        <div key={type} className="flex justify-between">
                          <span>{getQuestionTypeLabel(type)}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Answered</span>
                    <span>{answeredCount}/{questions.length}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Flagged</span>
                    <span>{flaggedCount}/{questions.length}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(flaggedCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span>Current</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Video Recording (60 min)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Current Minute:</span>
                      <span className="font-medium">{videoInfo.currentMinute}/60</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunks Recorded:</span>
                      <span className="font-medium">{videoInfo.chunksRecorded}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(videoInfo.currentMinute / 60) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-blue-600 text-center">
                      {videoInfo.uploadedChunks}/{videoInfo.totalChunks} uploaded
                    </div>
                  </div>
                </div>
                
                {!isFullscreen && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={enterFullscreen}
                    className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
                  >
                    Enter Fullscreen
                  </Button>
                )}
                
                {lastSaveTime && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Last saved:</span>
                      <span>{lastSaveTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-[10px] text-green-600 mt-1">
                      Auto-save when all questions answered
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 lg:w-4/6">
            <div className="lg:hidden mb-4">
              <div className="bg-card p-3 rounded-xl border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Question {currentQuestion + 1} of {questions.length}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestion === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextQuestion}
                      disabled={currentQuestion === questions.length - 1}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-1 min-w-max">
                    {questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => handleQuestionClick(i)}
                        className={`w-8 h-8 rounded text-xs relative ${
                          currentQuestion === i ? "bg-primary text-white"
                            : q.flagged
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : q.answered
                            ? "bg-green-100 text-green-700"
                            : "bg-muted"
                        }`}
                      >
                        {q.id}
                        {q.flagged && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-4 md:p-6 lg:p-8 rounded-xl border mb-4 md:mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg md:text-xl font-semibold">Question {currentQuestion + 1}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {getQuestionTypeLabel(questions[currentQuestion].type)}
                    </span>
                    {questions[currentQuestion].flagged && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flagged
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block h-6 w-1 bg-primary/30"></div>
                  <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{answeredCount} answered</span>
                    <span>•</span>
                    <span>{flaggedCount} flagged</span>
                    <span>•</span>
                    <span>{questions.length - answeredCount} remaining</span>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-normal gap-2">
                  <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-md">
                    Status: <span className={isAnswerValid() ? "text-green-600" : "text-red-600"}>
                      {getAnswerStatus()}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`gap-2 ${questions[currentQuestion].flagged ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''}`}
                    onClick={handleFlagQuestion}
                  >
                    <Flag className={`w-4 h-4 ${questions[currentQuestion].flagged ? 'fill-red-600' : ''}`} /> 
                    <span className="hidden sm:inline">
                      {questions[currentQuestion].flagged ? 'Unflag' : 'Flag'}
                    </span>
                  </Button>
                </div>
              </div>
              
              <div className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-semibold leading-relaxed mb-6">
                  {questions[currentQuestion].question}
                </h2>
                
                {renderQuestionByType()}
              </div>

              <div className="lg:hidden mb-4 space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Answered</span>
                    <span>{answeredCount}/{questions.length} ({Math.round((answeredCount / questions.length) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Flagged</span>
                    <span>{flaggedCount}/{questions.length} ({Math.round((flaggedCount / questions.length) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(flaggedCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Video Recording</span>
                    <span>{videoInfo.chunksRecorded} chunks</span>
                  </div>
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(videoInfo.currentMinute / 60) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-600 mt-1 text-center">
                    Minute {videoInfo.currentMinute} of 60
                  </div>
                </div>
                
                {!isFullscreen && (
                  <Button
                    variant="default"
                    onClick={enterFullscreen}
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    Enter Fullscreen
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleManualSave}
                  className="w-full"
                  disabled={isSaving || !allQuestionsAnswered}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 md:pt-6 border-t">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (questions[currentQuestion].type === 2) {
                        setSelectedAnswer([]);
                      } else {
                        setSelectedAnswer("");
                      }
                    }}
                    className="flex-1 sm:flex-none"
                    disabled={questions[currentQuestion].type === 2 
                      ? Array.isArray(selectedAnswer) && selectedAnswer.length === 0 
                      : !selectedAnswer}
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    className="flex-1 sm:flex-none"
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleManualSave}
                    className="hidden sm:flex flex-none"
                    disabled={isSaving || !allQuestionsAnswered}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
                
                <Button 
                  onClick={handleSaveAndNext} 
                  disabled={!isAnswerValid()}
                  className="w-full sm:w-auto px-6"
                >
                  {currentQuestion < questions.length - 1 ? "Save & Next" : "Save & Review"}
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t p-3 z-30">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium">{answeredCount}/{questions.length} answered</span>
                  <span className="mx-2">•</span>
                  <span className="text-red-600">{flaggedCount} flagged</span>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleSubmit}
                  disabled={flaggedCount > 0 || isSaving || !allQuestionsAnswered}
                >
                  {getSubmitButtonText()}
                </Button>
              </div>
              <div className="flex justify-between mt-1 text-xs">
                <span>Video: {videoInfo.chunksRecorded} chunks</span>
                <span>Time: {formatTime(timeRemaining)} / 60:00</span>
              </div>
              {!isFullscreen && (
                <div className="mt-2 text-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={enterFullscreen}
                    className="text-red-600 h-auto p-0"
                  >
                    ⚠️ Click to Enter Fullscreen
                  </Button>
                </div>
              )}
              {flaggedCount > 0 && (
                <div className="mt-2 text-xs text-red-600 text-center">
                  Please remove flags before submitting
                </div>
              )}
              {!allQuestionsAnswered && (
                <div className="mt-2 text-xs text-red-600 text-center">
                  Answer all questions to submit
                </div>
              )}
              {lastSaveTime && (
                <div className="mt-1 text-xs text-green-600 text-center">
                  Last save: {lastSaveTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              )}
            </div>

            <div className="hidden lg:flex flex-col items-center gap-4 mt-8">
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  You have answered {answeredCount} out of {questions.length} questions
                </div>
                <div className="text-sm text-blue-600">
                  🎥 Video Recording: {videoInfo.chunksRecorded} chunks recorded
                  (Minute {videoInfo.currentMinute} of 60)
                </div>
                {!allQuestionsAnswered && (
                  <div className="text-sm text-red-600">
                    ⚠️ Please answer all questions before submitting.
                  </div>
                )}
                {flaggedCount > 0 && (
                  <div className="text-sm text-red-600">
                    ⚠️ {flaggedCount} questions are flagged for review. Please unflag them before submitting.
                  </div>
                )}
                {!isFullscreen && (
                  <div className="text-sm text-red-600">
                    ⚠️ Fullscreen mode is required. Please enter fullscreen to continue.
                  </div>
                )}
                {lastSaveTime && (
                  <div className="text-sm text-green-600">
                    ✅ Last auto-save: {lastSaveTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                {!isFullscreen && (
                  <Button 
                    variant="default"
                    onClick={enterFullscreen}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Enter Fullscreen
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={handleManualSave}
                  disabled={isSaving || !allQuestionsAnswered}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="lg" 
                  onClick={handleSubmit}
                  className="px-10"
                  disabled={flaggedCount > 0 || isSaving || !allQuestionsAnswered}
                >
                  {getSubmitButtonText()}
                </Button>
              </div>
              {flaggedCount > 0 && (
                <div className="text-sm text-red-600">
                  Click on each flagged question and click "Unflag" to remove the flag
                </div>
              )}
            </div>
          </div>

          <div className={`lg:w-1/6 ${isProctoringMinimized ? 'lg:w-16' : ''}`}>
            <div className={`bg-card rounded-xl border shadow-lg sticky top-24 overflow-hidden transition-all duration-300 ${
              isProctoringMinimized ? 'w-16' : 'w-full'
            }`}>
              <div className={`p-3 border-b flex items-center justify-between ${
                isProctoringMinimized ? 'flex-col gap-2' : ''
              }`}>
                <div className={`flex items-center gap-2 ${isProctoringMinimized ? 'hidden' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${
                    cameraState === "active" ? "bg-green-500 animate-pulse" : 
                    cameraState === "error" ? "bg-red-500" : 
                    "bg-yellow-500"
                  }`}></div>
                  <h3 className="font-semibold text-sm">AI Proctoring</h3>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleProctoringSize}
                    className={`h-8 w-8 p-0 ${isProctoringMinimized ? '' : 'mr-1'}`}
                  >
                    {isProctoringMinimized ? 
                      <Maximize2 className="w-4 h-4" /> : 
                      <Minimize2 className="w-4 h-4" />
                    }
                  </Button>
                  
                  <span className={`text-xs px-2 py-1 rounded ${getCameraStatusColor()} ${
                    isProctoringMinimized ? 'hidden' : ''
                  }`}>
                    {getCameraStatusText()}
                  </span>
                </div>
              </div>
              
              {!isProctoringMinimized ? (
                <>
                  <div className="p-3">
                    <div className="relative aspect-video border rounded-lg overflow-hidden bg-black mb-3">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ display: cameraState === "active" ? "block" : "none" }}
                      />
                      
                      {cameraState !== "active" && (
                        <div 
                          className="absolute inset-0 flex flex-col items-center justify-center p-3 cursor-pointer bg-black/90"
                          onClick={handleEnableCamera}
                        >
                          {cameraState === "blocked" ? (
                            <>
                              <VideoOff className="w-8 h-8 text-red-400 mb-2" />
                              <p className="text-white text-center text-xs">Camera Blocked</p>
                            </>
                          ) : cameraState === "error" ? (
                            <>
                              <AlertTriangle className="w-8 h-8 text-yellow-400 mb-2" />
                              <p className="text-white text-center text-xs">Click to Start</p>
                            </>
                          ) : cameraState === "requesting" ? (
                            <>
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
                              <p className="text-white text-center text-xs">Starting...</p>
                            </>
                          ) : (
                            <>
                              <Video className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-white text-center text-xs">Enable Camera</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-3 p-2 bg-gray-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Face Detection:</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          faceCount === 0 ? 'bg-red-100 text-red-700' :
                          faceCount === 1 ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {faceCount === 0 ? 'No Face' :
                           faceCount === 1 ? '1 Face' :
                           `${faceCount} Faces`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {alerts.slice(0, 2).map((a, i) => (
                        <div key={i} className="flex gap-2 p-2 bg-warning/10 rounded text-xs">
                          <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />
                          <span className="truncate">{a}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 text-xs space-y-2">
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span>Media Capture</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            isUploadingMedia ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {isUploadingMedia ? 'Uploading...' : 'Active'}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          • Photo: Every 60 seconds (JPEG)
                          <br />
                          • Video: 30-second MP4
                        </div>
                      </div>

                      <div className="p-2 bg-blue-50 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span>Video Progress</span>
                          <span className="font-medium">{videoInfo.currentMinute}/60</span>
                        </div>
                        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(videoInfo.currentMinute / 60) * 100}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-blue-700 text-center">
                          Minute {videoInfo.currentMinute} of 60
                        </div>
                      </div>

                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span>Save Status</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            lastSaveTime ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {getSaveStatusText()}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span>Fullscreen</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${isFullscreen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isFullscreen ? '✓ Active' : '✗ Inactive'}
                          </span>
                        </div>
                      </div>

                      {!isFullscreen && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={enterFullscreen}
                          className="w-full bg-red-500 hover:bg-red-600 text-white text-xs py-1"
                        >
                          Enter Fullscreen
                        </Button>
                      )}

                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span>Violations</span>
                          <span className="font-medium text-amber-600">{fullscreenViolationCount}/3</span>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span>Tab Switches</span>
                          <span className="font-medium text-amber-600">{tabSwitchCount}/3</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Answered</span>
                          <span className="text-muted-foreground">{answeredCount}/{questions.length}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Flagged</span>
                          <span className="text-muted-foreground">{flaggedCount}/{questions.length}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${(flaggedCount / questions.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{answeredCount}</div>
                          <div className="text-muted-foreground text-[10px]">Answered</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{flaggedCount}</div>
                          <div className="text-muted-foreground text-[10px]">Flagged</div>
                        </div>
                      </div>
                      
                      <div className="p-2 bg-blue-50 rounded text-blue-700">
                        <div className="flex items-center justify-between">
                          <span>Auto-save</span>
                          <span className="text-[10px]">When all answered</span>
                        </div>
                      </div>

                      <div className="p-2 bg-green-50 rounded text-green-700">
                        <div className="flex items-center gap-2">
                          <Camera className="w-3 h-3" />
                          <span className="text-[10px]">Recording {videoInfo.chunksRecorded} videos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 flex flex-col items-center">
                  <div 
                    className="relative w-10 h-10 rounded-full overflow-hidden mb-2 cursor-pointer"
                    onClick={handleEnableCamera}
                  >
                    {cameraState === "active" ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-black flex items-center justify-center">
                        {cameraState === "error" || cameraState === "blocked" ? (
                          <VideoOff className="w-5 h-5 text-red-400" />
                        ) : (
                          <Video className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mb-1 mx-auto ${
                      cameraState === "active" ? "bg-green-500 animate-pulse" : 
                      cameraState === "error" ? "bg-red-500" : 
                      "bg-yellow-500"
                    }`}></div>
                    <div className="text-[10px] text-muted-foreground">AI</div>
                    <div className="flex gap-1 mt-1">
                      <div className="text-[10px] font-medium text-green-600">{answeredCount}</div>
                      <div className="text-[10px] font-medium text-red-600">{flaggedCount}</div>
                    </div>
                    <div className="mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto ${
                        faceCount === 0 ? 'bg-red-500' :
                        faceCount === 1 ? 'bg-green-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <div className="text-[8px] text-muted-foreground">F{faceCount}</div>
                    </div>
                    <div className="mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto ${isFullscreen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="text-[8px] text-muted-foreground">FS</div>
                    </div>
                    <div className="mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto ${lastSaveTime ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div className="text-[8px] text-muted-foreground">SV</div>
                    </div>
                    <div className="mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto ${isUploadingMedia ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <div className="text-[8px] text-muted-foreground">MC</div>
                    </div>
                    <div className="mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto bg-blue-500`}></div>
                      <div className="text-[8px] text-muted-foreground">V{videoInfo.chunksRecorded}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}