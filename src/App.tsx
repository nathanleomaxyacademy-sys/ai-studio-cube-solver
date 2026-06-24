import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Edit,
  BookOpen,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import { CubeState, FaceName, CubeColor, DEFAULT_FACE_COLORS, COLOR_HEX, FACE_NAMES, SolutionStep } from './types';
import { getSolvedCubeState, getBlankCubeState, simulateMove, generateScramble } from './utils/cubeSolver';

import RubiksCube3D from './components/RubiksCube3D';
import ManualInput from './components/ManualInput';
import CubeScanner from './components/CubeScanner';
import AlgorithmExplainer from './components/AlgorithmExplainer';

export default function App() {
  // Input or active Rubik's Cube state
  const [cubeState, setCubeState] = useState<CubeState>(() => getSolvedCubeState());
  const [selectedColor, setSelectedColor] = useState<CubeColor>('white');
  const [activeTab, setActiveTab] = useState<'manual' | 'camera' | 'learn'>('manual');

  // Solution and Playback states
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<{ error: string; details?: string } | null>(null);
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [solvedStateHistory, setSolvedStateHistory] = useState<CubeState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1); // -1 means starting scrambled state
  
  // Animation/Playback settings
  const [animatingMove, setAnimatingMove] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800); // ms per move

  // Keep a reference of state history for fast lookups in playback callbacks
  const stateHistoryRef = useRef<CubeState[]>([]);
  stateHistoryRef.current = solvedStateHistory;

  // Real-time distribution check
  const getColorDistribution = () => {
    const counts: Record<CubeColor, number> = {
      white: 0,
      orange: 0,
      green: 0,
      red: 0,
      blue: 0,
      yellow: 0,
    };
    for (const face of FACE_NAMES) {
      for (const color of cubeState[face]) {
        counts[color]++;
      }
    }
    return counts;
  };

  const distribution = getColorDistribution();
  const isDistributionCorrect = Object.values(distribution).every((count) => count === 9);

  // Client-side Scramble trigger
  const handleScramble = () => {
    // Stop any playing solutions
    setIsPlaying(false);
    setSolutionSteps([]);
    setCurrentStepIndex(-1);
    setValidationError(null);

    const { state } = generateScramble();
    setCubeState(state);
  };

  // Client-side Clear trigger
  const handleClear = () => {
    setIsPlaying(false);
    setSolutionSteps([]);
    setCurrentStepIndex(-1);
    setValidationError(null);
    setCubeState(getBlankCubeState());
  };

  // Client-side Reset trigger
  const handleReset = () => {
    setIsPlaying(false);
    setSolutionSteps([]);
    setCurrentStepIndex(-1);
    setValidationError(null);
    setCubeState(getSolvedCubeState());
  };

  // Callback when a face is scanned via Camera/AI
  const handleScanFace = (face: FaceName, tiles: CubeColor[]) => {
    setValidationError(null);
    const newState = { ...cubeState };
    newState[face] = tiles;
    setCubeState(newState);
  };

  // Call API to solve the current cube state
  const handleSolve = async () => {
    setIsPlaying(false);
    setIsSolving(true);
    setValidationError(null);
    setSolutionSteps([]);
    setCurrentStepIndex(-1);

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cubeState }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setValidationError({
          error: data.error || 'Solver Error',
          details: data.details || 'The backend was unable to solve this cube state.',
        });
        return;
      }

      // Success! Set steps
      const steps: SolutionStep[] = data.steps;
      setSolutionSteps(steps);

      // Pre-compute the state after each step for bug-free rendering
      let currState = JSON.parse(JSON.stringify(cubeState));
      const history: CubeState[] = [JSON.parse(JSON.stringify(currState))];

      for (const step of steps) {
        currState = simulateMove(currState, step.move);
        history.push(JSON.parse(JSON.stringify(currState)));
      }

      setSolvedStateHistory(history);
      setCurrentStepIndex(0); // Set to step 0 (scrambled starting position)
    } catch (err: any) {
      console.error(err);
      setValidationError({
        error: 'Network Error',
        details: 'Unable to communicate with the solver API. Ensure your backend server is active and accessible.',
      });
    } finally {
      setIsSolving(false);
    }
  };

  // Playback control: Move Next (triggers 3D turn animation)
  const handleNextStep = useCallback(() => {
    if (solutionSteps.length === 0 || currentStepIndex >= solutionSteps.length) {
      setIsPlaying(false);
      return;
    }

    const nextStep = solutionSteps[currentStepIndex];
    setAnimatingMove(nextStep.move);
  }, [solutionSteps, currentStepIndex]);

  // Playback control: Move Prev
  const handlePrevStep = () => {
    if (currentStepIndex <= 0) return;

    setIsPlaying(false);
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    // Load the pre-computed exact state from history for that position
    if (stateHistoryRef.current[prevIndex]) {
      setCubeState(JSON.parse(JSON.stringify(stateHistoryRef.current[prevIndex])));
    }
  };

  // Handle completion of 3D turn animation
  const handleAnimationComplete = () => {
    setAnimatingMove(null);

    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);

    // Apply the exact color state from pre-computed history
    if (stateHistoryRef.current[nextIndex]) {
      setCubeState(JSON.parse(JSON.stringify(stateHistoryRef.current[nextIndex])));
    }

    // If playing, queue up the next move after a short delay
    if (isPlaying && nextIndex < solutionSteps.length) {
      setTimeout(() => {
        handleNextStep();
      }, 100);
    } else if (nextIndex >= solutionSteps.length) {
      setIsPlaying(false);
    }
  };

  // Toggle play/pause
  useEffect(() => {
    if (isPlaying) {
      handleNextStep();
    }
  }, [isPlaying, handleNextStep]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans" id="app-root-container">
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-400 uppercase flex items-center gap-2">
              CUBE.SOLVER <span className="text-slate-600 font-mono text-sm ml-2">v2.4.0</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              Real-time Heuristic Analysis
            </p>
          </div>

          {/* Tab Navigation */}
          <nav className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              Manual Input
            </button>
            <button
              onClick={() => {
                setActiveTab('camera');
                setValidationError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              AI Camera Scan
            </button>
            <button
              onClick={() => setActiveTab('learn')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'learn'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Learn Algorithm
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Main content split viewport */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left column: 3D Visualizer & Active Playback HUD / Status info */}
        <div className="md:col-span-5 flex flex-col gap-6 md:sticky md:top-24">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Live 3D Cube Model
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">60FPS Active</span>
              </div>
            </div>
            
            <RubiksCube3D
              cubeState={cubeState}
              animatingMove={animatingMove}
              animationDuration={playbackSpeed}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          {/* Show Playback HUD here when solving so it is always next to the animating cube */}
          {solutionSteps.length > 0 ? (
            <div className={`flex flex-col gap-5 rounded-3xl p-6 items-center justify-center text-center relative overflow-hidden shadow-2xl border transition-all duration-300 ${
              currentStepIndex >= 0 && currentStepIndex < solutionSteps.length
                ? 'bg-indigo-600 text-white border-indigo-500/30'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              {/* Progress bar */}
              <div className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300 shadow-md"
                style={{ width: `${((currentStepIndex + 1) / (solutionSteps.length + 1)) * 100}%` }}
              />

              {/* Active Step Move Display */}
              <div className="flex flex-col items-center gap-3 py-4">
                {currentStepIndex === -1 ? (
                  <>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">State: Initial</span>
                    <span className="text-4xl font-black font-mono tracking-tighter text-indigo-400">START</span>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed mt-1">
                      This is the starting scrambled state. Click Play or Next to begin solving!
                    </p>
                  </>
                ) : currentStepIndex >= solutionSteps.length ? (
                  <>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">State: Complete</span>
                    <span className="text-4xl font-black font-mono tracking-tighter text-emerald-400">SOLVED!</span>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed mt-1">
                      Congratulations! The Rubik's Cube is now fully solved.
                    </p>
                  </>
                ) : (
                  <>
                    <span className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${
                      currentStepIndex >= 0 && currentStepIndex < solutionSteps.length ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      Active Algorithm Instruction
                    </span>
                    <span className="text-6xl font-black font-mono leading-none tracking-tighter select-all">
                      {solutionSteps[currentStepIndex].move}
                    </span>
                    <p className={`text-xs font-medium px-4 max-w-sm leading-normal mt-3 ${
                      currentStepIndex >= 0 && currentStepIndex < solutionSteps.length ? 'text-indigo-100' : 'text-slate-300'
                    }`}>
                      {solutionSteps[currentStepIndex].explanation}
                    </p>
                  </>
                )}
              </div>

              {/* Controls HUD */}
              <div className={`flex flex-wrap items-center justify-center gap-4 pt-4 border-t w-full ${
                currentStepIndex >= 0 && currentStepIndex < solutionSteps.length
                  ? 'border-white/10'
                  : 'border-slate-800'
              }`}>
                {/* Previous Step */}
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIndex <= -1}
                  className={`p-3 rounded-2xl border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                    currentStepIndex >= 0 && currentStepIndex < solutionSteps.length
                      ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                      : 'bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  title="Previous Move"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Play / Pause Toggle */}
                {currentStepIndex >= solutionSteps.length ? (
                  <button
                    onClick={() => {
                      setCurrentStepIndex(-1);
                      setCubeState(JSON.parse(JSON.stringify(solvedStateHistory[0])));
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-white text-slate-950 text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer transition active:scale-95 hover:bg-slate-100 shadow-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESTART
                  </button>
                ) : (
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-3.5 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xl ${
                      currentStepIndex >= 0 && currentStepIndex < solutionSteps.length
                        ? 'bg-white text-indigo-600 hover:bg-slate-100'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                )}

                {/* Next Step */}
                <button
                  onClick={handleNextStep}
                  disabled={currentStepIndex >= solutionSteps.length || animatingMove !== null}
                  className={`p-3 rounded-2xl border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                    currentStepIndex >= 0 && currentStepIndex < solutionSteps.length
                      ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                      : 'bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  title="Next Move"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Playback Speed Slider */}
              <div className="flex items-center gap-3.5 w-full max-w-xs mt-3">
                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 ${
                  currentStepIndex >= 0 && currentStepIndex < solutionSteps.length ? 'text-indigo-200' : 'text-slate-500'
                }`}>
                  Speed:
                </span>
                <input
                  type="range"
                  min="400"
                  max="2000"
                  step="100"
                  value={2400 - playbackSpeed} // invert to feel like speed is sliding up
                  onChange={(e) => setPlaybackSpeed(2400 - Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1 bg-slate-800/40 rounded-lg cursor-pointer"
                />
                <span className={`text-[9px] font-mono font-bold shrink-0 ${
                  currentStepIndex >= 0 && currentStepIndex < solutionSteps.length ? 'text-indigo-100' : 'text-slate-400'
                }`}>
                  {Math.round((1000 / playbackSpeed) * 10) / 10} t/s
                </span>
              </div>
            </div>
          ) : (
            /* Quick Real-Time validation monitor in Setup Mode only */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Color Tile Counter Monitor
                </span>
                {isDistributionCorrect ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono tracking-tight">
                    READY TO SOLVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 font-mono tracking-tight">
                    SETUP REQUIRED
                  </span>
                )}
              </div>

              {/* Grid of colors */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                {Object.entries(distribution).map(([color, count]) => (
                  <div key={color} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-md border border-black/40 shadow-inner"
                      style={{ backgroundColor: COLOR_HEX[color as CubeColor] }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {count}/9
                    </span>
                  </div>
                ))}
              </div>

              {/* Error alerts or helpful guide banner */}
              {!isDistributionCorrect && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Each color must have exactly 9 tiles for the solver to work. Scramble or edit manually to adjust.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Form Input, Scanner or Solution sequences */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {/* Show Solution steps when a solution is loaded */}
            {solutionSteps.length > 0 ? (
              <motion.div
                key="solution-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5"
              >
                {/* Solution Header and Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <h3 className="font-black text-indigo-400 uppercase tracking-tighter text-lg flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Solution Loaded
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">
                      {solutionSteps.length} Total Moves • Step {currentStepIndex + 1} of {solutionSteps.length + 1}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSolutionSteps([]);
                      setCurrentStepIndex(-1);
                    }}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-755 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700/60 active:scale-95 transition-all"
                  >
                    Edit Input Cube
                  </button>
                </div>

                {/* Steps List Timeline Scroller */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Moves Sequences Timeline
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {solutionSteps.map((step, idx) => {
                      const isActive = idx === currentStepIndex;
                      const isCompleted = idx < currentStepIndex;

                      return (
                        <button
                          key={`${step.move}-${idx}`}
                          onClick={() => {
                            setIsPlaying(false);
                            setCurrentStepIndex(idx);
                            if (solvedStateHistory[idx]) {
                              setCubeState(JSON.parse(JSON.stringify(solvedStateHistory[idx])));
                            }
                          }}
                          className={`px-4 py-3 rounded-2xl text-xs font-black font-mono transition-all duration-200 shrink-0 min-w-[55px] text-center border cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/15 scale-105'
                              : isCompleted
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 opacity-70 hover:opacity-100'
                              : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span className="block text-sm">{step.move}</span>
                          <span className="text-[9px] font-normal text-slate-500 font-sans block mt-0.5">
                            #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Integration of Algorithm Notation Guide right beside the solving timeline */}
                <div className="border-t border-slate-800/80 pt-5 mt-2">
                  <AlgorithmExplainer />
                </div>
              </motion.div>
            ) : (
              /* If no steps, render Input Editors */
              <motion.div
                key="editor-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* Validation Warnings */}
                {validationError && (
                  <div className="flex items-start gap-3.5 p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-200">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-xs uppercase tracking-wider text-rose-400">
                        {validationError.error}
                      </span>
                      <p className="text-xs text-slate-400 leading-normal">{validationError.details}</p>
                    </div>
                  </div>
                )}

                {/* Solver CTA Button */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 text-center items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
                  <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">Ready to Compute Step-by-Step Solver?</h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Once you've filled in the cube facelets manually or via camera, click Solve to let the Two-Phase algorithm find the solution paths.
                  </p>
                  <button
                    onClick={handleSolve}
                    disabled={isSolving}
                    className="w-full max-w-sm py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    {isSolving ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Running Algorithmic Solver...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        Solve Cube Step-by-Step
                      </>
                    )}
                  </button>
                </div>

                {/* Main Selected Input Tab Body */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  {activeTab === 'manual' && (
                    <ManualInput
                      cubeState={cubeState}
                      onChange={setCubeState}
                      selectedColor={selectedColor}
                      setSelectedColor={setSelectedColor}
                      onScramble={handleScramble}
                      onReset={handleReset}
                      onClear={handleClear}
                    />
                  )}

                  {activeTab === 'camera' && (
                    <CubeScanner
                      cubeState={cubeState}
                      onScanFace={handleScanFace}
                    />
                  )}

                  {activeTab === 'learn' && <AlgorithmExplainer />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
