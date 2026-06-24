export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type CubeColor = 'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue';

export interface FaceState {
  face: FaceName;
  tiles: CubeColor[]; // Array of 9 colors (indices 0 to 8)
}

export type CubeState = Record<FaceName, CubeColor[]>;

export interface SolutionStep {
  move: string;       // e.g. "R", "U'", "F2"
  explanation: string; // e.g. "Turn the Right face clockwise 90 degrees."
  visualAction: {
    face: FaceName;
    clockwise: boolean;
    double: boolean;
  };
}

export interface SolverResponse {
  success: boolean;
  solution?: string; // Raw space-separated solution e.g., "R U R' U'"
  steps?: SolutionStep[];
  error?: string;
  details?: string;
}

export const FACE_NAMES: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];

export const DEFAULT_FACE_COLORS: Record<FaceName, CubeColor> = {
  U: 'white',
  L: 'orange',
  F: 'green',
  R: 'red',
  B: 'blue',
  D: 'yellow',
};

export const COLOR_HEX: Record<CubeColor, string> = {
  white: '#FFFFFF',
  orange: '#FF5800',
  green: '#009F4F',
  red: '#B71234',
  blue: '#0046AD',
  yellow: '#FFD500',
};

export const COLOR_NAMES: Record<CubeColor, string> = {
  white: 'White',
  orange: 'Orange',
  green: 'Green',
  red: 'Red',
  blue: 'Blue',
  yellow: 'Yellow',
};
