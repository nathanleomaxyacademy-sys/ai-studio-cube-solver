import React from 'react';
import { HelpCircle, BookOpen, Layers, Award, ShieldAlert, ArrowRight, CornerUpLeft } from 'lucide-react';

export default function AlgorithmExplainer() {
  const notations = [
    { move: 'U', name: 'Up', desc: 'Rotate top face 90° clockwise.' },
    { move: "U'", name: 'Up Prime', desc: 'Rotate top face 90° counter-clockwise.' },
    { move: 'U2', name: 'Up Double', desc: 'Rotate top face 180°.' },
    { move: 'F', name: 'Front', desc: 'Rotate front face 90° clockwise.' },
    { move: 'R', name: 'Right', desc: 'Rotate right face 90° clockwise.' },
    { move: 'L', name: 'Left', desc: 'Rotate left face 90° clockwise.' },
    { move: 'B', name: 'Back', desc: 'Rotate back face 90° clockwise.' },
    { move: 'D', name: 'Down', desc: 'Rotate bottom face 90° clockwise.' },
  ];

  return (
    <div className="flex flex-col gap-8 w-full text-slate-300" id="algorithm-explainer-container">
      {/* 1. Header Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/30 to-indigo-950/20 border border-indigo-900/40 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-100">Rubik's Cube Notation & Algorithms</h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Solving a Rubik's Cube algorithmically is a fascinating mathematical problem. This solver uses 
          <span className="text-indigo-400 font-bold"> Herbert Kociemba's Two-Phase Algorithm</span>, which solves any valid scrambled cube in under 20 moves—extremely close to God's Number of 20 (the absolute optimal moves to solve any position).
        </p>
      </div>

      {/* 2. Interactive Move Glossary */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Singmaster Move Notation Glossary
        </h3>
        <p className="text-xs text-slate-400 mb-1">
          Move instructions use standard Singmaster notation. Each letter represents a face rotation as if you are looking directly at that face:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {notations.map((n) => (
            <div 
              key={n.move}
              className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col gap-2 hover:border-slate-750 hover:scale-101 transition-all shadow-inner"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-black text-indigo-400">{n.move}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{n.name}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight font-medium">{n.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Deep Dive into the Two-Phase Algorithm */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 1 Explainer */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
              1
            </span>
            <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Phase 1: Orienting Facelets</h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Instead of searching the entire astronomical state space of 43 quintillion possibilities, the algorithm first simplifies the cube. It focuses entirely on:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-medium">
            <li>Orienting all 12 edge pieces correctly (so they do not require flipping turns).</li>
            <li>Orienting all 8 corner pieces correctly.</li>
            <li>Placing the 4 middle-layer edge pieces into their target slice (the U/D plane).</li>
          </ul>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 font-mono text-[11px]">
            <span className="text-indigo-400 font-semibold">Goal:</span> Reduce the state to the subgroup <span className="text-emerald-400 font-bold">G1 = ⟨U, D, R2, L2, F2, B2⟩</span> where only 180° turns are allowed for the side faces.
          </p>
        </div>

        {/* Phase 2 Explainer */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              2
            </span>
            <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Phase 2: Final Permutations</h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Once Phase 1 successfully reduces the cube to the G1 subgroup, the algorithm executes Phase 2. Since edges and corners are pre-oriented, it only needs to permute them:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-medium">
            <li>Solve all corners and edges to their exact correct locations.</li>
            <li>Since it operates strictly inside G1, side turns are strictly double-turns (e.g., R2, L2, F2, B2).</li>
            <li>This greatly limits the search depth, allowing a solution to be computed in milliseconds!</li>
          </ul>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 font-mono text-[11px]">
            <span className="text-emerald-400 font-semibold">Result:</span> The cube is fully solved! The algorithm combines the moves of Phase 1 and Phase 2, then optimizes them to shorten sequences.
          </p>
        </div>
      </div>

      {/* 4. God's Number and Math Fun Fact */}
      <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-5 flex items-start gap-4">
        <Award className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">The Power of Optimality (God's Number)</span>
          <p className="text-[11px] leading-relaxed text-slate-400 mt-1">
            In 2010, computer scientists proved that <strong>every single one</strong> of the 43,252,003,274,489,856,000 (43 quintillion) starting states of a Rubik's Cube can be solved in <strong>20 moves or less</strong>. This number is called "God's Number." Kociemba's Two-Phase algorithm utilizes massive pruning tables to quickly find solutions that stay within or very close to this optimal boundary.
          </p>
        </div>
      </div>
    </div>
  );
}
