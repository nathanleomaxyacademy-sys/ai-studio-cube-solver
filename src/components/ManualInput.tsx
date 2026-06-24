import React from 'react';
import { CubeState, FaceName, CubeColor, COLOR_HEX, FACE_NAMES, DEFAULT_FACE_COLORS, COLOR_NAMES } from '../types';
import { Lock } from 'lucide-react';

interface ManualInputProps {
  cubeState: CubeState;
  onChange: (newState: CubeState) => void;
  selectedColor: CubeColor;
  setSelectedColor: (color: CubeColor) => void;
  onScramble: () => void;
  onReset: () => void;
  onClear: () => void;
}

export default function ManualInput({
  cubeState,
  onChange,
  selectedColor,
  setSelectedColor,
  onScramble,
  onReset,
  onClear,
}: ManualInputProps) {
  // Update a single tile color
  const handleTileClick = (face: FaceName, tileIndex: number) => {
    // Center tile (index 4) is locked and cannot be edited
    if (tileIndex === 4) return;

    const newState = { ...cubeState };
    newState[face] = [...newState[face]];
    newState[face][tileIndex] = selectedColor;
    onChange(newState);
  };

  const colorsList: CubeColor[] = ['white', 'orange', 'green', 'red', 'blue', 'yellow'];

  // Helper to render a 3x3 face grid
  const renderFaceGrid = (face: FaceName, label: string) => {
    const tiles = cubeState[face] || Array(9).fill('white');
    return (
      <div className="flex flex-col items-center p-4 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-inner w-full max-w-[180px]">
        <span className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
          {label} ({face})
        </span>
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
          {tiles.map((color, index) => {
            const isCenter = index === 4;
            return (
              <button
                key={`${face}-${index}`}
                onClick={() => handleTileClick(face, index)}
                disabled={isCenter}
                className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-md transition-all duration-200 border border-black/30 hover:scale-105 active:scale-95 ${
                  isCenter ? 'cursor-not-allowed scale-100 opacity-90' : 'cursor-pointer hover:shadow-lg'
                }`}
                style={{
                  backgroundColor: COLOR_HEX[color],
                  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15)',
                }}
                title={isCenter ? `Locked Center Tile` : `Paint with ${COLOR_NAMES[selectedColor]}`}
              >
                {isCenter && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md">
                    <Lock className="w-3.5 h-3.5 text-slate-950 drop-shadow-md" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full" id="manual-input-container">
      {/* Quick Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
        <button
          onClick={onReset}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 bg-slate-900 border border-slate-850 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-md cursor-pointer hover:text-white"
        >
          Reset Solved
        </button>
        <button
          onClick={onScramble}
          className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          Scramble Cube
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 bg-slate-900 border border-slate-850 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-md cursor-pointer hover:text-white"
        >
          Clear to Blank
        </button>
      </div>

      {/* Color Palette Picker */}
      <div className="flex flex-col items-center gap-3.5 bg-slate-950/30 border border-slate-800/80 rounded-3xl p-5 shadow-inner">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Select Paint Color
        </span>
        <div className="flex flex-wrap justify-center gap-3">
          {colorsList.map((color) => {
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`group relative flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20'
                    : 'border-slate-800 hover:border-slate-600 hover:scale-105'
                }`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                title={`Select ${COLOR_NAMES[color]}`}
              >
                {/* Active Checkmark Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 rounded-full">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md border border-slate-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3 h-3 text-indigo-600"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                )}
                {/* Hover label */}
                <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-950 text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-800 shadow-md">
                  {COLOR_NAMES[color]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unfolded Flat Cube Map (Cross layout) */}
      <div className="flex flex-col items-center gap-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Unfolded Cube Layout (Flat Map)
        </span>

        {/* CSS Grid layout for unfolding cross */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-4xl p-2 justify-items-center">
          {/* U - Up face is centered in Row 1 */}
          <div className="md:col-start-2 md:col-span-1 flex justify-center w-full">
            {renderFaceGrid('U', 'Up (White)')}
          </div>

          {/* Spacer for Row 1 */}
          <div className="hidden md:block col-span-1"></div>
          <div className="hidden md:block col-span-1"></div>

          {/* L, F, R, B - Middle Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:col-span-4 gap-4 mt-1 w-full justify-items-center">
            {renderFaceGrid('L', 'Left (Orange)')}
            {renderFaceGrid('F', 'Front (Green)')}
            {renderFaceGrid('R', 'Right (Red)')}
            {renderFaceGrid('B', 'Back (Blue)')}
          </div>

          {/* D - Down face is centered in Row 3 */}
          <div className="md:col-start-2 md:col-span-1 flex justify-center mt-1 w-full">
            {renderFaceGrid('D', 'Down (Yellow)')}
          </div>
        </div>
      </div>
    </div>
  );
}
