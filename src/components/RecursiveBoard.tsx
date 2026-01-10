import React from 'react';
import type { BoardState, CellValue } from '../game/types';
import { Cell } from './Cell';

interface RecursiveBoardProps {
    board: BoardState<any>;
    level: number;
    path: number[];
    onCellClick: (path: [number, number, number]) => void;
    isValidTarget: (path: [number, number, number]) => boolean;
    activePath: [number, number] | null;
}

export const RecursiveBoard: React.FC<RecursiveBoardProps> = ({
    board,
    level,
    path,
    onCellClick,
    isValidTarget,
    activePath
}) => {
    // If this board is won, show the winner overlay
    const isWon = board.owner !== null;

    // Helper to check if this board is part of the active path
    const isActive = (() => {
        if (!activePath) return true; // No constraint
        if (level === 3) return false; // Root never active container in terms of border
        if (level === 2) return activePath[0] === path[0]; // Medium board matches L3 index
        if (level === 1) return activePath[0] === path[0] && activePath[1] === path[1]; // Small board matches L3, L2
        return false;
    })();

    // Gridline thickness based on level
    // Level 3 (Large) -> Gap between Medium boards -> Thickest
    // Level 2 (Medium) -> Gap between Small boards -> Thicker
    // Level 1 (Small) -> Gap between Cells -> Thick
    const gapSize = level === 3 ? '12px' : level === 2 ? '6px' : '2px';
    const padding = level === 3 ? '12px' : level === 2 ? '6px' : '0px';
    const bgColor = '#9ca3af'; // Gray-400 for softer gridlines

    const containerStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
        gap: gapSize,
        padding: padding,
        backgroundColor: bgColor,
        // Active border only for Medium and Small boards
        // User requested "much thicker" selector
        outline: isActive && !isWon ? `${level === 2 ? '8px' : '4px'} solid #3b82f6` : 'none',
        outlineOffset: level === 2 ? '4px' : '2px',
        borderRadius: '0px',
        position: 'relative' as const,
        zIndex: 0, // Establish stacking context
    };

    if (level === 0) {
        return null;
    }

    return (
        <div style={containerStyle} className="shadow-sm bg-black">
            {/* Won Overlay - Rendered FIRST so it sits BEHIND content by default, but we use z-index to be sure */}
            {isWon && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-0 pointer-events-none">
                    <span className={`text-[10rem] font-black opacity-40 ${board.owner === 'X' ? 'text-blue-600' : 'text-red-600'}`}>
                        {board.owner}
                    </span>
                </div>
            )}

            {board.grid.map((item, index) => {
                const currentPath = [...path, index];
                const bgClass = 'bg-white relative z-10 overflow-hidden min-w-0 min-h-0'; // Ensure content sits above overlay and doesn't expand grid

                if (level === 1) {
                    // Render Cell
                    return (
                        <div key={index} className={bgClass}>
                            <Cell
                                value={item as CellValue}
                                onClick={() => onCellClick(currentPath as [number, number, number])}
                                isValid={isValidTarget(currentPath as [number, number, number])}
                                isLastMove={false}
                            />
                        </div>
                    );
                } else {
                    // Render Sub-Board
                    return (
                        <div key={index} className={bgClass}>
                            <RecursiveBoard
                                board={item as BoardState<any>}
                                level={level - 1}
                                path={currentPath}
                                onCellClick={onCellClick}
                                isValidTarget={isValidTarget}
                                activePath={activePath}
                            />
                        </div>
                    );
                }
            })}
        </div>
    );
};
