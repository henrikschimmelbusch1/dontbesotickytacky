import type { BoardState, CellValue, GameState, LargeBoard, MediumBoard, Move, Player, SmallBoard, Winner } from './types';

// --- Constants ---
const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// --- Helper Functions ---

export function createBoard<T>(level: number, initialContent: (index: number) => T): BoardState<T> {
    return {
        level,
        owner: null,
        grid: Array.from({ length: 9 }, (_, i) => initialContent(i)),
    };
}

export function createInitialGameState(): GameState {
    // Level 1: Small Board (contains nulls)
    const createSmall = () => createBoard<CellValue>(1, () => null);
    // Level 2: Medium Board (contains Small Boards)
    const createMedium = () => createBoard<SmallBoard>(2, createSmall);
    // Level 3: Large Board (contains Medium Boards)
    const createLarge = () => createBoard<MediumBoard>(3, createMedium);

    return {
        board: createLarge(),
        currentPlayer: 'X',
        activeBoardPath: null, // Start with no constraint (or maybe center? Standard is usually anywhere)
        winner: null,
    };
}

export function checkWinner<T>(grid: (T | Winner)[], getOwner: (item: T) => Winner): Winner {
    // Check patterns
    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        const ownerA = typeof grid[a] === 'string' ? grid[a] as Winner : getOwner(grid[a] as T);
        const ownerB = typeof grid[b] === 'string' ? grid[b] as Winner : getOwner(grid[b] as T);
        const ownerC = typeof grid[c] === 'string' ? grid[c] as Winner : getOwner(grid[c] as T);

        if (ownerA && ownerA !== 'DRAW' && ownerA === ownerB && ownerA === ownerC) {
            return ownerA;
        }
    }

    // Check Draw (Full)
    const isFull = grid.every(item => {
        const owner = typeof item === 'string' ? item as Winner : getOwner(item as T);
        return owner !== null;
    });

    if (isFull) return 'DRAW';

    return null;
}

// --- Game Logic ---

function updateSmallBoard(board: SmallBoard, index: number, player: Player): SmallBoard {
    // Allow playing in won boards, just don't update owner if already set
    const newGrid = [...board.grid];
    if (newGrid[index] !== null) return board; // Cell occupied

    newGrid[index] = player;

    // Check win for this board
    // If already owned, keep the original owner
    const newOwner = board.owner ? board.owner : checkWinner(newGrid, (cell) => cell as Winner);

    return {
        ...board,
        grid: newGrid,
        owner: newOwner,
    };
}

function updateMediumBoard(board: MediumBoard, l2_idx: number, l1_idx: number, player: Player): MediumBoard {
    // Allow playing in won boards
    const newGrid = [...board.grid];
    const subBoard = newGrid[l2_idx];
    const newSubBoard = updateSmallBoard(subBoard, l1_idx, player);
    newGrid[l2_idx] = newSubBoard;

    const newOwner = board.owner ? board.owner : checkWinner(newGrid, (b) => b.owner);

    return {
        ...board,
        grid: newGrid,
        owner: newOwner,
    };
}

function updateLargeBoard(board: LargeBoard, l3_idx: number, l2_idx: number, l1_idx: number, player: Player): LargeBoard {
    // Allow playing in won boards
    const newGrid = [...board.grid];
    const subBoard = newGrid[l3_idx];
    const newSubBoard = updateMediumBoard(subBoard, l2_idx, l1_idx, player);
    newGrid[l3_idx] = newSubBoard;

    const newOwner = board.owner ? board.owner : checkWinner(newGrid, (b) => b.owner);

    return {
        ...board,
        grid: newGrid,
        owner: newOwner,
    };
}

export function isValidMove(gameState: GameState, move: Move): boolean {
    if (gameState.winner) return false;
    if (move.player !== gameState.currentPlayer) return false;

    const [l3, l2, l1] = move.path;

    // 1. Check Active Board Constraint
    if (gameState.activeBoardPath) {
        const [reqL3, reqL2] = gameState.activeBoardPath;
        if (l3 !== reqL3 || l2 !== reqL2) {
            return false;
        }
    }

    // 2. Check if target cell is empty and board is playable
    const large = gameState.board;
    const medium = large.grid[l3];
    const small = medium.grid[l2];
    const cell = small.grid[l1];

    if (large.owner) return false; // Should be covered by winner check, but good for safety
    // Logic Update: We CAN play in won boards now, as long as the cell is empty.

    if (cell !== null) return false; // Cell occupied

    return true;
}

export function applyMove(gameState: GameState, move: Move): GameState {
    if (!isValidMove(gameState, move)) {
        throw new Error("Invalid move");
    }

    const [l3, l2, l1] = move.path;
    const nextPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

    // 1. Update Board
    const newBoard = updateLargeBoard(gameState.board, l3, l2, l1, gameState.currentPlayer);

    // 2. Calculate Next Constraint
    // Rule: Move at (L3, L2, L1) sends next player to MediumBoard at (L2, L1) in the LargeBoard.
    // i.e. The next L3 index is current L2 index.
    //      The next L2 index is current L1 index.
    let nextActivePath: [number, number] | null = [l2, l1];

    // 3. Check if target board is playable
    // Target is LargeBoard.grid[l2].grid[l1]
    const targetMedium = newBoard.grid[l2];
    const targetSmall = targetMedium.grid[l1];

    // Logic Update: We can play in won boards.
    // So we only send to "Anywhere" if the target board is FULL.
    const isTargetFull = targetSmall.grid.every(c => c !== null);

    if (isTargetFull) {
        // Target is full, so player can play anywhere (that is valid)
        nextActivePath = null;
    }

    return {
        board: newBoard,
        currentPlayer: nextPlayer,
        activeBoardPath: nextActivePath,
        winner: newBoard.owner,
    };
}
