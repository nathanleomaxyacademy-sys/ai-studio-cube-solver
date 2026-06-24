import Cube from 'cubejs';
import { CubeState, FaceName, CubeColor, DEFAULT_FACE_COLORS, FACE_NAMES, SolutionStep, SolverResponse } from '../types';

let isSolverInitialized = false;

export function solveCubeLocally(cubeState: CubeState): SolverResponse {
  try {
    if (!isSolverInitialized) {
      Cube.initSolver();
      isSolverInitialized = true;
    }

    // A valid cube state must have U, R, F, D, L, B faces
    const faces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (const face of faces) {
      if (!cubeState[face] || !Array.isArray(cubeState[face]) || cubeState[face].length !== 9) {
        return {
          success: false,
          error: `Invalid face configuration for face ${face}`,
        };
      }
    }

    // Count colors to make sure we have exactly 9 of each color
    const counts: Record<CubeColor, number> = {
      white: 0,
      red: 0,
      green: 0,
      yellow: 0,
      orange: 0,
      blue: 0,
    };

    for (const face of faces) {
      for (const color of cubeState[face]) {
        if (counts[color] !== undefined) {
          counts[color]++;
        }
      }
    }

    const incorrectCounts = Object.entries(counts).filter(([_, count]) => count !== 9);
    if (incorrectCounts.length > 0) {
      const details = Object.entries(counts)
        .map(([color, count]) => `${color}: ${count}`)
        .join(', ');
      return {
        success: false,
        error: 'Color distribution error',
        details: `A valid Rubik's Cube must have exactly 9 tiles of each color. Currently, you have: ${details}. Please verify your inputs.`,
      };
    }

    // Map colors to standard facelet characters (U, R, F, D, L, B) based on center tiles
    const C_U = cubeState.U[4];
    const C_R = cubeState.R[4];
    const C_F = cubeState.F[4];
    const C_D = cubeState.D[4];
    const C_L = cubeState.L[4];
    const C_B = cubeState.B[4];

    const colorToChar = (color: string): string => {
      if (color === C_U) return 'U';
      if (color === C_R) return 'R';
      if (color === C_F) return 'F';
      if (color === C_D) return 'D';
      if (color === C_L) return 'L';
      if (color === C_B) return 'B';
      return 'U'; // Fallback
    };

    // Construct the 54-character string representation for cubejs
    // Order: U, R, F, D, L, B
    let cubeString = '';
    const orderedFaces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (const face of orderedFaces) {
      for (let i = 0; i < 9; i++) {
        cubeString += colorToChar(cubeState[face][i]);
      }
    }

    console.log('Solving Rubik\'s Cube locally with state string:', cubeString);

    const cube = Cube.fromString(cubeString);
    const solutionStr = cube.solve();

    if (!solutionStr) {
      return {
        success: true,
        solution: '',
        steps: [],
      };
    }

    const moves = solutionStr.split(/\s+/).filter(Boolean);
    const steps: SolutionStep[] = moves.map((move) => {
      const faceChar = move[0] as FaceName;
      const modifier = move.substring(1);

      let clockwise = true;
      let double = false;
      let explanation = '';

      const faceNamesFull: Record<string, string> = {
        U: 'Up (White center)',
        R: 'Right (Red center)',
        F: 'Front (Green center)',
        D: 'Down (Yellow center)',
        L: 'Left (Orange center)',
        B: 'Back (Blue center)',
      };

      const faceName = faceNamesFull[faceChar] || faceChar;

      if (modifier === "'") {
        clockwise = false;
        explanation = `Turn the ${faceName} face counter-clockwise by 90 degrees.`;
      } else if (modifier === '2') {
        double = true;
        explanation = `Turn the ${faceName} face 180 degrees (either direction).`;
      } else {
        explanation = `Turn the ${faceName} face clockwise by 90 degrees.`;
      }

      return {
        move,
        explanation,
        visualAction: {
          face: faceChar,
          clockwise,
          double,
        },
      };
    });

    return {
      success: true,
      solution: solutionStr,
      steps,
    };
  } catch (error: any) {
    console.error('Error solving cube state locally:', error);
    return {
      success: false,
      error: 'Unsolvable cube state',
      details: 'This cube state is physically impossible to solve. This can occur if some tiles are colored incorrectly, or if a corner/edge was physically flipped on the cube. Please check the color of all tiles carefully.',
    };
  }
}

// Reset cube to a fully solved state
export function getSolvedCubeState(): CubeState {
  const state = {} as CubeState;
  for (const face of FACE_NAMES) {
    state[face] = Array(9).fill(DEFAULT_FACE_COLORS[face]);
  }
  return state;
}

// Reset cube to a blank state where only center tiles have colors
export function getBlankCubeState(): CubeState {
  const state = {} as CubeState;
  for (const face of FACE_NAMES) {
    // Fill all with a neutral indicator or empty string, except the center (index 4)
    state[face] = Array(9).fill('white'); // default fallback
    state[face][4] = DEFAULT_FACE_COLORS[face];
  }
  return state;
}

// Map a face name to its surrounding faces clockwise
// This helps us simulate moves on a 3x3 cube in client-side state if needed.
// For simplicity, let's write a simple client-side move simulator!
// This will let the 3D cube model reflect the actual rotations when the user plays them.
export function simulateMove(state: CubeState, move: string): CubeState {
  // Deep copy state
  const newState: CubeState = JSON.parse(JSON.stringify(state));

  const face = move[0] as FaceName;
  const modifier = move.substring(1);

  const turns = modifier === '2' ? 2 : modifier === "'" ? 3 : 1;

  for (let t = 0; t < turns; t++) {
    rotateFaceClockwise(newState, face);
  }

  return newState;
}

// Rotate a single face 90 degrees clockwise, and shift its adjacent facelets
function rotateFaceClockwise(state: CubeState, face: FaceName) {
  // 1. Rotate the 9 facelets of the face itself
  const tempFace = [...state[face]];
  // Corner rotations: 0->2, 2->8, 8->6, 6->0
  state[face][2] = tempFace[0];
  state[face][8] = tempFace[2];
  state[face][6] = tempFace[8];
  state[face][0] = tempFace[6];
  // Edge rotations: 1->5, 5->7, 7->3, 3->1
  state[face][5] = tempFace[1];
  state[face][7] = tempFace[5];
  state[face][3] = tempFace[7];
  state[face][1] = tempFace[3];

  // 2. Shift the adjacent face layers
  // The mapping depends on which face is turned.
  // We represent the 3 facelets of each adjacent face that are affected.
  if (face === 'U') {
    // Up turn affects adjacent top rows of B, R, F, L
    // Order of adjacent faces clockwise around U: B -> R -> F -> L -> B
    // Indices for top row of these faces: [0, 1, 2]
    const temp = [state.B[0], state.B[1], state.B[2]];
    
    state.B[0] = state.L[0]; state.B[1] = state.L[1]; state.B[2] = state.L[2];
    state.L[0] = state.F[0]; state.L[1] = state.F[1]; state.L[2] = state.F[2];
    state.F[0] = state.R[0]; state.F[1] = state.R[1]; state.F[2] = state.R[2];
    state.R[0] = temp[0];    state.R[1] = temp[1];    state.R[2] = temp[2];
  } else if (face === 'D') {
    // Down turn affects bottom rows of F, R, B, L
    // Order clockwise around D: F -> R -> B -> L -> F
    // Indices for bottom row of these faces: [6, 7, 8]
    const temp = [state.F[6], state.F[7], state.F[8]];

    state.F[6] = state.L[6]; state.F[7] = state.L[7]; state.F[8] = state.L[8];
    state.L[6] = state.B[6]; state.L[7] = state.B[7]; state.L[8] = state.B[8];
    state.B[6] = state.R[6]; state.B[7] = state.R[7]; state.B[8] = state.R[8];
    state.R[6] = temp[0];    state.R[7] = temp[1];    state.R[8] = temp[2];
  } else if (face === 'F') {
    // Front turn affects: U (bottom row [6,7,8]), R (left col [0,3,6]), D (top row [2,1,0] reversed), L (right col [8,5,2] reversed)
    // Clockwise shift: U -> R -> D -> L -> U
    const temp = [state.U[6], state.U[7], state.U[8]];

    // U bottom row [6,7,8] gets L right column [8,5,2] (reversed)
    state.U[6] = state.L[8]; state.U[7] = state.L[5]; state.U[8] = state.L[2];

    // L right column [2,5,8] gets D top row [0,1,2] (reversed)
    state.L[2] = state.D[0]; state.L[5] = state.D[1]; state.L[8] = state.D[2];

    // D top row [0,1,2] gets R left column [6,3,0] (reversed)
    state.D[0] = state.R[6]; state.D[1] = state.R[3]; state.D[2] = state.R[0];

    // R left column [0,3,6] gets temp (U bottom row [6,7,8])
    state.R[0] = temp[0];    state.R[3] = temp[1];    state.R[6] = temp[2];
  } else if (face === 'B') {
    // Back turn affects: U (top row [2,1,0]), L (left col [0,3,6]), D (bottom row [8,7,6]), R (right col [8,5,2])
    // Clockwise shift: U -> L -> D -> R -> U
    const temp = [state.U[0], state.U[1], state.U[2]];

    // U top row [0,1,2] gets R right col [2,5,8]
    state.U[0] = state.R[2]; state.U[1] = state.R[5]; state.U[2] = state.R[8];

    // R right col [2,5,8] gets D bottom row [8,7,6] (reversed)
    state.R[2] = state.D[8]; state.R[5] = state.D[7]; state.R[8] = state.D[6];

    // D bottom row [6,7,8] gets L left col [0,3,6]
    state.D[6] = state.L[0]; state.D[7] = state.L[3]; state.D[8] = state.L[6];

    // L left col [0,3,6] gets temp (U top row [0,1,2] reversed)
    state.L[0] = temp[2];    state.L[3] = temp[1];    state.L[6] = temp[0];
  } else if (face === 'L') {
    // Left turn affects: U (left col [0,3,6]), F (left col [0,3,6]), D (left col [0,3,6]), B (right col [8,5,2] reversed)
    // Clockwise shift: U -> F -> D -> B -> U
    const temp = [state.U[0], state.U[3], state.U[6]];

    // U left col gets B right col reversed
    state.U[0] = state.B[8]; state.U[3] = state.B[5]; state.U[6] = state.B[2];

    // B right col gets D left col reversed
    state.B[2] = state.D[6]; state.B[5] = state.D[3]; state.B[8] = state.D[0];

    // D left col gets F left col
    state.D[0] = state.F[0]; state.D[3] = state.F[3]; state.D[6] = state.F[6];

    // F left col gets temp
    state.F[0] = temp[0];    state.F[3] = temp[1];    state.F[6] = temp[2];
  } else if (face === 'R') {
    // Right turn affects: U (right col [2,5,8]), B (left col [6,3,0] reversed), D (right col [2,5,8]), F (right col [2,5,8])
    // Clockwise shift: U -> B -> D -> F -> U (or rather U -> B -> D -> F -> U clockwise around R)
    // Looking at Right face, adjacent faces in clockwise order: U -> B -> D -> F -> U
    const temp = [state.U[2], state.U[5], state.U[8]];

    // U right col [2,5,8] gets F right col [2,5,8]
    state.U[2] = state.F[2]; state.U[5] = state.F[5]; state.U[8] = state.F[8];

    // F right col gets D right col
    state.F[2] = state.D[2]; state.F[5] = state.D[5]; state.F[8] = state.D[8];

    // D right col gets B left col reversed
    state.D[2] = state.B[6]; state.D[5] = state.B[3]; state.D[8] = state.B[0];

    // B left col gets temp reversed
    state.B[0] = temp[2];    state.B[3] = temp[1];    state.B[6] = temp[0];
  }
}

// Generate a random scramble (array of moves and the scrambled state)
export function generateScramble(): { moves: string[]; state: CubeState } {
  let state = getSolvedCubeState();
  const possibleMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
  const scrambleLength = 20;
  const scrambleMoves: string[] = [];

  let lastFace = '';
  for (let i = 0; i < scrambleLength; i++) {
    // Pick a move that isn't on the same face as the last one to make it look like a real scramble
    let validMove = '';
    while (!validMove) {
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      const face = move[0];
      if (face !== lastFace) {
        validMove = move;
        lastFace = face;
      }
    }
    scrambleMoves.push(validMove);
    state = simulateMove(state, validMove);
  }

  return { moves: scrambleMoves, state };
}
