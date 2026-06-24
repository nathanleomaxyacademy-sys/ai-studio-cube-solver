import React, { useState, useRef, useEffect } from 'react';
import { FaceName, CubeColor, COLOR_HEX, DEFAULT_FACE_COLORS, FACE_NAMES, COLOR_NAMES } from '../types';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, Check, HelpCircle } from 'lucide-react';

interface CubeScannerProps {
  onScanFace: (face: FaceName, tiles: CubeColor[]) => void;
  cubeState: any; // current cube state to know which colors are set
}

export default function CubeScanner({ onScanFace, cubeState }: CubeScannerProps) {
  const [selectedFace, setSelectedFace] = useState<FaceName>('F');
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Completed faces list based on whether they have been modified from empty or manually scanned
  // Let's keep a history of scanned faces
  const [scannedFaces, setScannedFaces] = useState<Record<FaceName, boolean>>({
    U: false, L: false, F: false, R: false, B: false, D: false
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // List of comforting loading messages
  const scanningMessages = [
    'Initializing multimodal vision model...',
    'Analyzing 3x3 Rubik\'s Cube face layout...',
    'Extracting grid coordinates and color histograms...',
    'Compensating for lighting shadows and white balance...',
    'Resolving subtle hue variations between Orange and Red...',
    'Finalizing grid alignment checks...',
  ];

  // Rotate through messages during scan
  useEffect(() => {
    if (!isScanning) return;
    let index = 0;
    setScanMessage(scanningMessages[0]);
    const interval = setInterval(() => {
      index = (index + 1) % scanningMessages.length;
      setScanMessage(scanningMessages[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Clean up camera on unmount or mode switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    setPreviewImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please allow camera permissions or upload an image instead.');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw square crop
      const size = Math.min(canvas.width, canvas.height);
      const startX = (canvas.width - size) / 2;
      const startY = (canvas.height - size) / 2;
      ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 480, 480);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewImage(dataUrl);
      stopCamera();
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 640x640 to save bandwidth and improve Gemini performance
        const canvas = document.createElement('canvas');
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPreviewImage(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    stopCamera();
  };

  const handleScanSubmit = async () => {
    if (!previewImage) return;

    setIsScanning(true);
    setError(null);

    try {
      const centerColor = DEFAULT_FACE_COLORS[selectedFace];
      const response = await fetch('/api/detect-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: previewImage,
          faceName: selectedFace === 'U' ? 'Up (Top)' : 
                    selectedFace === 'D' ? 'Down (Bottom)' :
                    selectedFace === 'F' ? 'Front' :
                    selectedFace === 'B' ? 'Back' :
                    selectedFace === 'L' ? 'Left' : 'Right',
          centerColor,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze the photo.');
      }

      // Success! Update face state
      onScanFace(selectedFace, data.tiles);
      setScannedFaces((prev) => ({ ...prev, [selectedFace]: true }));
      setPreviewImage(null);

      // Auto-advance to the next unscanned face
      const nextFaceIndex = FACE_NAMES.indexOf(selectedFace) + 1;
      if (nextFaceIndex < FACE_NAMES.length) {
        setSelectedFace(FACE_NAMES[nextFaceIndex]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while calling the AI model. Please check your internet connection or API Key.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full" id="cube-scanner-container">
      {/* Target Face Selector & Progress Tracker */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">
            1. Select Face to Scan
          </h3>
          <p className="text-xs text-slate-400">
            For best results, align your physical cube so that the selected face's center matches the lock color.
          </p>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {FACE_NAMES.map((face) => {
            const isSelected = selectedFace === face;
            const isScanned = scannedFaces[face];
            const centerColor = DEFAULT_FACE_COLORS[face];

            const faceLabels: Record<FaceName, string> = {
              U: 'Up (White)',
              L: 'Left (Orange)',
              F: 'Front (Green)',
              R: 'Right (Red)',
              B: 'Back (Blue)',
              D: 'Down (Yellow)',
            };

            return (
              <button
                key={face}
                onClick={() => {
                  setSelectedFace(face);
                  setPreviewImage(null);
                  stopCamera();
                }}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all text-center relative cursor-pointer ${
                  isSelected
                    ? 'bg-slate-850/80 border-indigo-500 ring-1 ring-indigo-500/20 scale-102 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:scale-101'
                }`}
              >
                {/* Visual color dot representing center of face */}
                <div
                  className="w-5 h-5 rounded-md border border-black/30 shadow-inner flex items-center justify-center relative"
                  style={{ backgroundColor: COLOR_HEX[centerColor] }}
                >
                  {isScanned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400 truncate w-full">
                  {faceLabels[face].split(' ')[0]}
                </span>

                {/* Scanned Checkmark indicator badge */}
                {isScanned && (
                  <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-950 shadow-md">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Upload/Camera Stage Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6 items-center justify-center min-h-[300px]">
        {error && (
          <div className="w-full flex items-start gap-3.5 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-300 text-xs mb-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider text-rose-400 block mb-0.5 text-[10px]">Scanning Error</span>
              {error}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isScanning ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4 w-full">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-900/30 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <Camera className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Analyzing Photo with Gemini</h4>
              <p className="text-xs text-indigo-400 font-mono min-h-[32px]">{scanMessage}</p>
            </div>
          </div>
        ) : previewImage ? (
          /* Preview State */
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-2xl bg-slate-950 flex items-center justify-center">
              <img src={previewImage} alt="Captured cube face" className="w-full h-full object-cover" />
              {/* Overlay center guide */}
              <div className="absolute inset-0 border-4 border-indigo-500/10 pointer-events-none flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-dashed border-white/60 rounded-2xl flex items-center justify-center bg-black/20">
                  <span className="text-[10px] font-mono font-bold text-white/90 drop-shadow-md tracking-wider">
                    CENTER
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3.5 w-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 transition active:scale-95 border border-slate-700/60 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleScanSubmit}
                className="flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Analyze Face ({selectedFace})
              </button>
            </div>
          </div>
        ) : useCamera ? (
          /* Live Camera Feed State */
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Overlay center lock color box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 border-2 border-dashed border-white/80 rounded-2xl flex items-center justify-center bg-black/30 shadow-lg">
                  <div
                    className="w-4 h-4 rounded border border-black/40 shadow-md animate-pulse"
                    style={{ backgroundColor: COLOR_HEX[DEFAULT_FACE_COLORS[selectedFace]] }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3.5 w-full">
              <button
                onClick={stopCamera}
                className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 transition border border-slate-700/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 shadow-lg cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capture Photo
              </button>
            </div>
          </div>
        ) : (
          /* Empty Selection State */
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 hover:border-indigo-500/50 rounded-3xl p-8 w-full max-w-lg text-center gap-5 transition bg-slate-950/20 shadow-inner group"
          >
            <div className="p-4 rounded-full bg-slate-850 border border-slate-800 group-hover:border-indigo-500/20 transition-all duration-300">
              <Camera className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-xs">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Scan Cube Face
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a photo or drag-and-drop a close-up image of the{' '}
                <span className="font-bold text-slate-200">
                  {COLOR_NAMES[DEFAULT_FACE_COLORS[selectedFace]]}
                </span>{' '}
                face.
              </p>
            </div>

            <div className="flex flex-wrap gap-3.5 justify-center">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-250 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-indigo-400" />
                Use Web Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-250 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                Upload Image
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* 3. Helper Instructions */}
      <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-5 text-slate-400 text-xs leading-relaxed flex gap-3.5">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-slate-200 uppercase tracking-widest text-[9px]">AIPowered Scan Tips:</span>
          <ul className="list-disc pl-4 space-y-1">
            <li>Ensure high, uniform lighting to avoid severe shadows.</li>
            <li>Align the cube face so it fills most of the photo frame.</li>
            <li>Keep the center tile aligned with the lock color of the face.</li>
            <li>If the AI detects any tile incorrectly, you can quickly override it using the manual editor tap grid!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
