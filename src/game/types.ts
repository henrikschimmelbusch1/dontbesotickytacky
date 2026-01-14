export type Player = 'X' | 'O';
export type Winner = Player | 'DRAW' | null;

// Level 0: The atomic cell value
export type CellValue = Player | null;

// A generic recursive board structure
// Level 1: 3x3 grid of CellValues
// Level 2: 3x3 grid of Level 1 Boards
// Level 3: 3x3 grid of Level 2 Boards
export interface BoardState<T> {
    level: number;
    owner: Winner; // Who won this specific board
    grid: T[]; // 9 items
}

// Specific types for each level for clarity, though we could use generics
export type SmallBoard = BoardState<CellValue>; // Level 1
export type MediumBoard = BoardState<SmallBoard>; // Level 2
export type LargeBoard = BoardState<MediumBoard>; // Level 3

export type GameState = {
    board: LargeBoard;
    currentPlayer: Player;
    // The constraint for the next move.
    // It points to the specific board the player must play in.
    // If null, the player can play anywhere (that is not full/won).
    // The constraint is defined by indices: [L3_index, L2_index]
    // This means they must play in LargeBoard.grid[L3_index].grid[L2_index]
    activeBoardPath: [number, number] | null;
    winner: Winner;
    gameName: string;
};

export type Move = {
    // The full path to the cell: [L3_index, L2_index, L1_index]
    path: [number, number, number];
    player: Player;
};
