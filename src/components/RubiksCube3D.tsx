import React, { useState, useEffect, useRef } from 'react';
import { CubeState, FaceName, CubeColor, COLOR_HEX } from '../types';

interface RubiksCube3DProps {
  cubeState: CubeState;
  animatingMove: string | null; // e.g. "R", "U'", "R2"
  animationDuration?: number; // ms
  onAnimationComplete?: () => void;
}

export default function RubiksCube3D({
  cubeState,
  animatingMove,
  animationDuration = 500,
  onAnimationComplete,
}: RubiksCube3DProps) {
  // Orbital rotation angles for user to rotate the cube in 3D
  const [rotateX, setRotateX] = useState<number>(-25);
  const [rotateY, setRotateY] = useState<number>(-45);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: -25, y: -45 });

  // Animation states for face rotation
  const [rotationProgress, setRotationProgress] = useState<number>(0);
  const [activeRotationFace, setActiveRotationFace] = useState<FaceName | null>(null);
  const [activeRotationDirection, setActiveRotationDirection] = useState<number>(1); // 1 or -1
  const [activeRotationDouble, setActiveRotationDouble] = useState<boolean>(false);

  // Trigger rotation animation when animatingMove changes
  useEffect(() => {
    if (!animatingMove) {
      setActiveRotationFace(null);
      setRotationProgress(0);
      return;
    }

    const face = animatingMove[0] as FaceName;
    const modifier = animatingMove.substring(1);
    const isClockwise = modifier !== "'";
    const isDouble = modifier === '2';

    setActiveRotationFace(face);
    setActiveRotationDouble(isDouble);
    setActiveRotationDirection(isClockwise ? 1 : -1);
    setRotationProgress(0);

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setRotationProgress(easedProgress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Animation finished
        setTimeout(() => {
          setActiveRotationFace(null);
          setRotationProgress(0);
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 50);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [animatingMove, animationDuration]);

  // Handle dragging to rotate camera
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    currentRotation.current = { x: rotateX, y: rotateY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    // Rotate camera (Y drag rotates X-axis, X drag rotates Y-axis)
    setRotateX(Math.max(-85, Math.min(85, currentRotation.current.x - deltaY * 0.5)));
    setRotateY(currentRotation.current.y + deltaX * 0.5);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      currentRotation.current = { x: rotateX, y: rotateY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.current.x;
    const deltaY = e.touches[0].clientY - dragStart.current.y;

    setRotateX(Math.max(-85, Math.min(85, currentRotation.current.x - deltaY * 0.5)));
    setRotateY(currentRotation.current.y + deltaX * 0.5);
  };

  // Build the 27 cubies (x, y, z from -1 to 1)
  const cubies: React.ReactNode[] = [];
  const CUBIE_SIZE = 48; // px size of each cubie

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Core center cubie is not visible, but we can render it or skip it
        if (x === 0 && y === 0 && z === 0) continue;

        cubies.push(
          renderCubie(x, y, z, CUBIE_SIZE)
        );
      }
    }
  }

  // Render a single cubie with 6 faces
  function renderCubie(cx: number, cy: number, cz: number, size: number) {
    const key = `cubie-${cx}-${cy}-${cz}`;

    // 1. Map tile colors based on position
    let upColor: CubeColor | 'internal' = 'internal';
    let downColor: CubeColor | 'internal' = 'internal';
    let frontColor: CubeColor | 'internal' = 'internal';
    let backColor: CubeColor | 'internal' = 'internal';
    let leftColor: CubeColor | 'internal' = 'internal';
    let rightColor: CubeColor | 'internal' = 'internal';

    // Top face (y = 1)
    if (cy === 1) {
      const idx = (cz + 1) * 3 + (cx + 1);
      upColor = cubeState.U[idx];
    }
    // Bottom face (y = -1)
    if (cy === -1) {
      const idx = (1 - cz) * 3 + (cx + 1);
      downColor = cubeState.D[idx];
    }
    // Front face (z = 1)
    if (cz === 1) {
      const idx = (1 - cy) * 3 + (cx + 1);
      frontColor = cubeState.F[idx];
    }
    // Back face (z = -1)
    if (cz === -1) {
      const idx = (1 - cy) * 3 + (1 - cx);
      backColor = cubeState.B[idx];
    }
    // Left face (x = -1)
    if (cx === -1) {
      const idx = (1 - cy) * 3 + (cz + 1);
      leftColor = cubeState.L[idx];
    }
    // Right face (x = 1)
    if (cx === 1) {
      const idx = (1 - cy) * 3 + (1 - cz);
      rightColor = cubeState.R[idx];
    }

    // 2. Compute normal translation and rotation of this cubie
    let baseTransform = `translate3d(${cx * size}px, ${-cy * size}px, ${cz * size}px)`;

    // 3. Apply active face rotation animation if applicable
    let animationTransform = '';
    if (activeRotationFace) {
      let isPartOfFace = false;
      let rotX = 0, rotY = 0, rotZ = 0;
      const angle = (activeRotationDouble ? 180 : 90) * rotationProgress * activeRotationDirection;

      if (activeRotationFace === 'U' && cy === 1) {
        isPartOfFace = true;
        rotY = -angle; // Y axis is inverted in CSS 3D
      } else if (activeRotationFace === 'D' && cy === -1) {
        isPartOfFace = true;
        rotY = angle;
      } else if (activeRotationFace === 'R' && cx === 1) {
        isPartOfFace = true;
        rotX = -angle;
      } else if (activeRotationFace === 'L' && cx === -1) {
        isPartOfFace = true;
        rotX = angle;
      } else if (activeRotationFace === 'F' && cz === 1) {
        isPartOfFace = true;
        rotZ = -angle;
      } else if (activeRotationFace === 'B' && cz === -1) {
        isPartOfFace = true;
        rotZ = angle;
      }

      if (isPartOfFace) {
        // Rotate around the origin (0,0,0) of the Rubik's Cube
        animationTransform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) `;
      }
    }

    // In CSS 3D, we apply the animation rotation FIRST, and then position the cubie,
    // so it rotates around the center of the cube!
    const transformStyle = animationTransform 
      ? `${animationTransform} ${baseTransform}` 
      : baseTransform;

    const faceStyle = (color: CubeColor | 'internal', rotation: string) => {
      const isInternal = color === 'internal';
      return {
        width: `${size - 1}px`, // 1px margin for visual border between tiles
        height: `${size - 1}px`,
        position: 'absolute' as const,
        backgroundColor: isInternal ? '#111111' : COLOR_HEX[color],
        border: isInternal ? 'none' : '1.5px solid #000000',
        borderRadius: '4px',
        transform: rotation,
        backfaceVisibility: 'hidden' as const,
        boxShadow: isInternal ? 'none' : 'inset 0 0 4px rgba(0,0,0,0.15)',
      };
    };

    const halfSize = size / 2;

    return (
      <div
        key={key}
        className="absolute transition-transform duration-75"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transformStyle: 'preserve-3d',
          transform: transformStyle,
          left: `calc(50% - ${halfSize}px)`,
          top: `calc(50% - ${halfSize}px)`,
        }}
      >
        {/* Top Face */}
        <div style={faceStyle(upColor, `rotateX(90deg) translateZ(${halfSize}px)`)} />
        {/* Bottom Face */}
        <div style={faceStyle(downColor, `rotateX(-90deg) translateZ(${halfSize}px)`)} />
        {/* Front Face */}
        <div style={faceStyle(frontColor, `rotateY(0deg) translateZ(${halfSize}px)`)} />
        {/* Back Face */}
        <div style={faceStyle(backColor, `rotateY(180deg) translateZ(${halfSize}px)`)} />
        {/* Left Face */}
        <div style={faceStyle(leftColor, `rotateY(-90deg) translateZ(${halfSize}px)`)} />
        {/* Right Face */}
        <div style={faceStyle(rightColor, `rotateY(90deg) translateZ(${halfSize}px)`)} />
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing w-full h-[320px] md:h-[400px] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      id="3d-visualizer-container"
    >
      {/* 3D Scene Wrapper */}
      <div
        className="relative w-[300px] h-[300px]"
        style={{
          perspective: '800px',
        }}
      >
        {/* Rubik's Cube Object */}
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          }}
        >
          {cubies}
        </div>
      </div>

      {/* Floating UI Helper for dragging */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-400 backdrop-blur-sm pointer-events-none shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-indigo-400"><path d="M15 18H9.5a3.5 3.5 0 0 1 0-7h5.3l-.3-.2a1 1 0 0 1 .4-1.6l1.7-.8a1 1 0 0 1 1.4.9v4.2a1 1 0 0 1-1 1z"/><path d="M14 6v5"/></svg>
        <span>DRAG TO ROTATE VIEW</span>
      </div>
    </div>
  );
}
