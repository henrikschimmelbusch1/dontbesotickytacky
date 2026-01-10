import React from 'react';
import type { GameState } from '../game/types';

interface SvgBoardProps {
    gameState: GameState;
    onCellClick: (path: [number, number, number]) => void;
    activePath: [number, number] | null;
    lineWeights: {
        level1: number;
        level2: number;
        level3: number;
    };
    inactiveBlur: number;
    occupiedOpacity: number;
    cornerRadius: number;
}

export const SvgBoard: React.FC<SvgBoardProps> = ({
    gameState,
    onCellClick,
    activePath,
    lineWeights,
    inactiveBlur,
    occupiedOpacity,
    cornerRadius
}) => {
    // Coordinate System:
    // Total Size: 2700 x 2700
    // Large Cell (Medium Board): 900 x 900
    // Medium Cell (Small Board): 300 x 300
    // Small Cell (Playable): 100 x 100

    const VIEWBOX_SIZE = 2700;
    const CELL_SIZE = 100;
    const SMALL_BOARD_SIZE = 300;
    const MEDIUM_BOARD_SIZE = 900;

    // Helper to render global grid lines (Level 2 and 3)
    const renderGlobalGridLines = () => {
        const lines = [];

        // Level 2 Lines (Medium, Thicker) - Every 300 units
        // We render these globally to ensure they are crisp borders
        for (let i = 1; i < 9; i++) {
            if (i % 3 === 0) continue; // Skip higher level lines
            const pos = i * SMALL_BOARD_SIZE;
            lines.push(<line key={`l2-v-${i}`} x1={pos} y1={0} x2={pos} y2={VIEWBOX_SIZE} stroke="#9ca3af" strokeWidth={lineWeights.level2} />);
            lines.push(<line key={`l2-h-${i}`} x1={0} y1={pos} x2={VIEWBOX_SIZE} y2={pos} stroke="#9ca3af" strokeWidth={lineWeights.level2} />);
        }

        // Level 3 Lines (Largest, Thickest) - Every 900 units
        for (let i = 1; i < 3; i++) {
            const pos = i * MEDIUM_BOARD_SIZE;
            lines.push(<line key={`l3-v-${i}`} x1={pos} y1={0} x2={pos} y2={VIEWBOX_SIZE} stroke="#4b5563" strokeWidth={lineWeights.level3} />);
            lines.push(<line key={`l3-h-${i}`} x1={0} y1={pos} x2={VIEWBOX_SIZE} y2={pos} stroke="#4b5563" strokeWidth={lineWeights.level3} />);
        }

        return lines;
    };

    // Render a single Medium Board (contains 9 Small Boards)
    const renderMediumBoard = (l3: number) => {
        const mediumBoard = gameState.board.grid[l3];
        const l3Row = Math.floor(l3 / 3);
        const l3Col = l3 % 3;
        const l3X = l3Col * MEDIUM_BOARD_SIZE;
        const l3Y = l3Row * MEDIUM_BOARD_SIZE;

        // Check if this medium board is active
        // A medium board is active if:
        // 1. activePath is null (start of game or free play)
        // 2. activePath points to this board (activePath[0] === l3)
        let isMediumBoardActive = true;
        if (activePath) {
            isMediumBoardActive = activePath[0] === l3;
        }

        // Apply blur if inactive
        const style = isMediumBoardActive ? {} : { filter: `blur(${inactiveBlur}px)`, opacity: 0.8 };

        const elements = [];

        // 1. Render Level 1 Grid Lines for this Medium Board
        // These are local to the medium board so they get blurred
        for (let i = 1; i < 9; i++) {
            if (i % 3 === 0) continue;
            const pos = i * CELL_SIZE;
            // Vertical
            elements.push(
                <line
                    key={`l1-v-${l3}-${i}`}
                    x1={l3X + pos} y1={l3Y}
                    x2={l3X + pos} y2={l3Y + MEDIUM_BOARD_SIZE}
                    stroke="#e5e7eb"
                    strokeWidth={lineWeights.level1}
                />
            );
            // Horizontal
            elements.push(
                <line
                    key={`l1-h-${l3}-${i}`}
                    x1={l3X} y1={l3Y + pos}
                    x2={l3X + MEDIUM_BOARD_SIZE} y2={l3Y + pos}
                    stroke="#e5e7eb"
                    strokeWidth={lineWeights.level1}
                />
            );
        }

        // 2. Render Small Boards and Cells
        for (let l2 = 0; l2 < 9; l2++) {
            const smallBoard = mediumBoard.grid[l2];
            const l2Row = Math.floor(l2 / 3);
            const l2Col = l2 % 3;
            const l2X = l3X + l2Col * SMALL_BOARD_SIZE;
            const l2Y = l3Y + l2Row * SMALL_BOARD_SIZE;

            // Won Overlay for Small Board
            if (smallBoard.owner) {
                elements.push(
                    <rect
                        key={`won-bg-${l3}-${l2}`}
                        x={l2X} y={l2Y} width={SMALL_BOARD_SIZE} height={SMALL_BOARD_SIZE}
                        fill={smallBoard.owner === 'X' ? '#3b82f6' : '#ef4444'} fillOpacity="0.15"
                    />
                );
                elements.push(
                    <text
                        key={`won-sym-${l3}-${l2}`}
                        x={l2X + SMALL_BOARD_SIZE / 2}
                        y={l2Y + SMALL_BOARD_SIZE / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="200"
                        fontWeight="900"
                        fill={smallBoard.owner === 'X' ? '#2563eb' : '#dc2626'}
                        opacity="0.3"
                        pointerEvents="none"
                    >
                        {smallBoard.owner}
                    </text>
                );
            }

            // Cells
            for (let l1 = 0; l1 < 9; l1++) {
                const cellValue = smallBoard.grid[l1];
                const l1Row = Math.floor(l1 / 3);
                const l1Col = l1 % 3;
                const cellX = l2X + l1Col * CELL_SIZE;
                const cellY = l2Y + l1Row * CELL_SIZE;

                // Determine cursor style
                let isValid = !cellValue;
                if (activePath) {
                    if (activePath[0] !== l3 || activePath[1] !== l2) isValid = false;
                }

                const cursor = isValid ? 'pointer' : 'not-allowed';

                // Click Target
                elements.push(
                    <rect
                        key={`click-${l3}-${l2}-${l1}`}
                        x={cellX} y={cellY} width={CELL_SIZE} height={CELL_SIZE}
                        fill="transparent"
                        onClick={() => onCellClick([l3, l2, l1])}
                        style={{ cursor }}
                    />
                );

                // Render Symbol
                if (cellValue) {
                    // Greyed out background for occupied cell
                    elements.push(
                        <rect
                            key={`occ-bg-${l3}-${l2}-${l1}`}
                            x={cellX} y={cellY} width={CELL_SIZE} height={CELL_SIZE}
                            fill="gray"
                            fillOpacity={occupiedOpacity}
                            pointerEvents="none"
                        />
                    );

                    elements.push(
                        <text
                            key={`cell-${l3}-${l2}-${l1}`}
                            x={cellX + CELL_SIZE / 2}
                            y={cellY + CELL_SIZE / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="80"
                            fontWeight="900"
                            fill={cellValue === 'X' ? '#2563eb' : '#dc2626'}
                            pointerEvents="none"
                        >
                            {cellValue}
                        </text>
                    );
                }
            }
        }

        // Won Overlay for Medium Board
        if (mediumBoard.owner) {
            elements.push(
                <rect
                    key={`won-med-bg-${l3}`}
                    x={l3X} y={l3Y} width={MEDIUM_BOARD_SIZE} height={MEDIUM_BOARD_SIZE}
                    fill={mediumBoard.owner === 'X' ? '#3b82f6' : '#ef4444'} fillOpacity="0.2"
                    pointerEvents="none"
                />
            );
            elements.push(
                <text
                    key={`won-med-sym-${l3}`}
                    x={l3X + MEDIUM_BOARD_SIZE / 2}
                    y={l3Y + MEDIUM_BOARD_SIZE / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="600"
                    fontWeight="900"
                    fill={mediumBoard.owner === 'X' ? '#2563eb' : '#dc2626'}
                    opacity="0.2"
                    pointerEvents="none"
                >
                    {mediumBoard.owner}
                </text>
            );
        }

        return (
            <g key={`medium-${l3}`} style={style}>
                {elements}
            </g>
        );
    };

    // Active Board Highlight
    const renderActiveHighlight = () => {
        if (!activePath) return null;
        const [l3, l2] = activePath;

        const l3Row = Math.floor(l3 / 3);
        const l3Col = l3 % 3;
        const l2Row = Math.floor(l2 / 3);
        const l2Col = l2 % 3;

        // Calculate global position in the 9x9 small board grid
        const globalRow = l3Row * 3 + l2Row;
        const globalCol = l3Col * 3 + l2Col;

        const x = (l3Col * MEDIUM_BOARD_SIZE) + (l2Col * SMALL_BOARD_SIZE);
        const y = (l3Row * MEDIUM_BOARD_SIZE) + (l2Row * SMALL_BOARD_SIZE);

        // Determine which corners should be rounded (if any)
        const isTopLeft = globalRow === 0 && globalCol === 0;
        const isTopRight = globalRow === 0 && globalCol === 8;
        const isBottomLeft = globalRow === 8 && globalCol === 0;
        const isBottomRight = globalRow === 8 && globalCol === 8;

        const inset = 4;
        const w = SMALL_BOARD_SIZE - 8;
        const h = SMALL_BOARD_SIZE - 8;
        const r = cornerRadius; // Corner radius from props

        // Build path with selective rounded corners
        const tlr = isTopLeft ? r : 0;
        const trr = isTopRight ? r : 0;
        const brr = isBottomRight ? r : 0;
        const blr = isBottomLeft ? r : 0;

        const path = `
            M ${x + inset + tlr} ${y + inset}
            L ${x + inset + w - trr} ${y + inset}
            ${trr > 0 ? `Q ${x + inset + w} ${y + inset} ${x + inset + w} ${y + inset + trr}` : ''}
            L ${x + inset + w} ${y + inset + h - brr}
            ${brr > 0 ? `Q ${x + inset + w} ${y + inset + h} ${x + inset + w - brr} ${y + inset + h}` : ''}
            L ${x + inset + blr} ${y + inset + h}
            ${blr > 0 ? `Q ${x + inset} ${y + inset + h} ${x + inset} ${y + inset + h - blr}` : ''}
            L ${x + inset} ${y + inset + tlr}
            ${tlr > 0 ? `Q ${x + inset} ${y + inset} ${x + inset + tlr} ${y + inset}` : ''}
            Z
        `;

        return (
            <path
                d={path}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
                pointerEvents="none"
            />
        );
    };

    return (
        <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            className="w-full h-full bg-white shadow-lg"
            style={{ display: 'block' }}
        >
            {/* 1. Medium Boards (Content + L1 Lines) */}
            {Array.from({ length: 9 }).map((_, i) => renderMediumBoard(i))}

            {/* 2. Global Grid Lines (L2, L3) */}
            {renderGlobalGridLines()}

            {/* 3. Active Highlight */}
            {renderActiveHighlight()}
        </svg>
    );
};
