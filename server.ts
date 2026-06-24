import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import Cube from 'cubejs';

dotenv.config();

const app = express();
const PORT = 3000;

// Limit body payload to handle base64 images
app.use(express.json({ limit: '10mb' }));

// Initialize the Rubik's Cube solver tables on startup
console.log('Initializing Rubik\'s Cube Solver tables...');
try {
  Cube.initSolver();
  console.log('Solver tables initialized successfully.');
} catch (err) {
  console.error('Error initializing cubejs solver tables:', err);
}

// Lazy-initialize Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Detect Rubik's Cube face colors from a photo
app.post('/api/detect-face', async (req, res) => {
  try {
    const { image, faceName, centerColor } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    if (!faceName || !centerColor) {
      return res.status(400).json({ error: 'faceName and centerColor are required' });
    }

    // Extract base64 image data
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format. Must be a base64 Data URL.' });
    }
    const mimeType = `image/${matches[1]}`;
    const base64Data = matches[2];

    const ai = getGeminiClient();
    const prompt = `You are an expert Rubik's Cube color analyzer. 
Analyze this close-up image of the "${faceName}" face of a standard 3x3 Rubik's Cube.
The center tile of this face (position 4, the 5th tile) has the color "${centerColor}".

Your goal is to detect the color of each of the 9 tiles in the 3x3 grid for this face.
The position indices are ordered in row-major order (top-to-bottom, left-to-right):
Row 1: [0] Top-Left,  [1] Top-Middle,  [2] Top-Right
Row 2: [3] Mid-Left,  [4] Mid-Middle (must be "${centerColor}"), [5] Mid-Right
Row 3: [6] Bot-Left,  [7] Bot-Middle,  [8] Bot-Right

The only valid colors on a standard Rubik's Cube are:
- "white"
- "orange"
- "green"
- "red"
- "blue"
- "yellow"

Please compensate for lighting or shadow variations. For example, a white tile under warm light might look yellow or orange, but compare it to other tiles to decide. Green and blue, or orange and red can sometimes look similar in shadows; use your spatial understanding of Rubik's cubes to differentiate them.

Return the result as a JSON object containing a 'tiles' array with exactly 9 colors. Each element of the array must be one of the six valid color strings.`;

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [imagePart, prompt],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tiles: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'Detected color of the tile (white, orange, green, red, blue, yellow)',
              },
              description: 'Exactly 9 colors ordered 0-8 in row-major format',
            },
          },
          required: ['tiles'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const result = JSON.parse(text);
    if (!result.tiles || !Array.isArray(result.tiles) || result.tiles.length !== 9) {
      throw new Error('Gemini did not return an array of exactly 9 tiles.');
    }

    // Force middle tile to be the centerColor
    result.tiles[4] = centerColor;

    // Validate colors are standard
    const validColors = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];
    result.tiles = result.tiles.map((color: string) => {
      const lower = color.toLowerCase().trim();
      return validColors.includes(lower) ? lower : centerColor;
    });

    res.json({ success: true, tiles: result.tiles });
  } catch (error: any) {
    console.error('Error in /api/detect-face:', error);
    res.status(500).json({ success: false, error: error.message || 'Error parsing face image' });
  }
});

// 2. API: Solve the Rubik's Cube
app.post('/api/solve', (req, res) => {
  try {
    const { cubeState } = req.body;
    if (!cubeState) {
      return res.status(400).json({ error: 'cubeState is required' });
    }

    // A valid cube state must have U, R, F, D, L, B faces
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (const face of faces) {
      if (!cubeState[face] || !Array.isArray(cubeState[face]) || cubeState[face].length !== 9) {
        return res.status(400).json({ error: `Invalid face configuration for face ${face}` });
      }
    }

    // Count colors to make sure we have exactly 9 of each color
    const counts: Record<string, number> = {
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
      return res.json({
        success: false,
        error: 'Color distribution error',
        details: `A valid Rubik's Cube must have exactly 9 tiles of each color. Currently, you have: ${details}. Please verify your inputs.`,
      });
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
    const orderedFaces = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (const face of orderedFaces) {
      for (let i = 0; i < 9; i++) {
        cubeString += colorToChar(cubeState[face][i]);
      }
    }

    console.log('Solving Rubik\'s Cube with state string:', cubeString);

    // Solve using cubejs
    const cube = Cube.fromString(cubeString);
    const solutionStr = cube.solve();

    if (!solutionStr) {
      // Already solved!
      return res.json({
        success: true,
        solution: '',
        steps: [],
      });
    }

    // Parse steps
    const moves = solutionStr.split(/\s+/).filter(Boolean);
    const steps = moves.map((move, index) => {
      let faceChar = move[0] as 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
      let modifier = move.substring(1);

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

    res.json({
      success: true,
      solution: solutionStr,
      steps,
    });
  } catch (error: any) {
    console.error('Error solving cube state:', error);
    res.json({
      success: false,
      error: 'Unsolvable cube state',
      details: 'This cube state is physically impossible to solve. This can occur if some tiles are colored incorrectly, or if a corner/edge was physically flipped on the cube. Please check the color of all tiles carefully.',
    });
  }
});

// Setup Vite development server or serve static production build
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
