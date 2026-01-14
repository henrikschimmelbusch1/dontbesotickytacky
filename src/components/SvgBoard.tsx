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

    // --- Helper to render specific grid levels ---
    const renderGridLevel = (level: 1 | 2 | 3) => {
        const lines = [];
        if (level === 1) {
            // Level 1: Smallest lines (rendered inside renderMediumBoard already or here)
            // To keep it simple, we'll render L1 lines here or in a loop
            for (let l3 = 0; l3 < 9; l3++) {
                const l3Row = Math.floor(l3 / 3);
                const l3Col = l3 % 3;
                const offset = { x: l3Col * MEDIUM_BOARD_SIZE, y: l3Row * MEDIUM_BOARD_SIZE };
                for (let i = 1; i < 9; i++) {
                    if (i % 3 === 0) continue;
                    const pos = i * CELL_SIZE;
                    lines.push(<line key={`l1v-${l3}-${i}`} x1={offset.x + pos} y1={offset.y} x2={offset.x + pos} y2={offset.y + MEDIUM_BOARD_SIZE} stroke="#e5e7eb" strokeWidth={lineWeights.level1} />);
                    lines.push(<line key={`l1h-${l3}-${i}`} x1={offset.x} y1={offset.y + pos} x2={offset.x + MEDIUM_BOARD_SIZE} y2={offset.y + pos} stroke="#e5e7eb" strokeWidth={lineWeights.level1} />);
                }
            }
        } else if (level === 2) {
            // Level 2: Medium Grid Lines
            for (let i = 1; i < 9; i++) {
                if (i % 3 === 0) continue;
                const pos = i * SMALL_BOARD_SIZE;
                lines.push(<line key={`l2-v-${i}`} x1={pos} y1={0} x2={pos} y2={VIEWBOX_SIZE} stroke="#9ca3af" strokeWidth={lineWeights.level2} />);
                lines.push(<line key={`l2-h-${i}`} x1={0} y1={pos} x2={VIEWBOX_SIZE} y2={pos} stroke="#9ca3af" strokeWidth={lineWeights.level2} />);
            }
        } else if (level === 3) {
            // Level 3: Large Grid Lines
            for (let i = 1; i < 3; i++) {
                const pos = i * MEDIUM_BOARD_SIZE;
                lines.push(<line key={`l3-v-${i}`} x1={pos} y1={0} x2={pos} y2={VIEWBOX_SIZE} stroke="#4b5563" strokeWidth={lineWeights.level3} />);
                lines.push(<line key={`l3-h-${i}`} x1={0} y1={pos} x2={VIEWBOX_SIZE} y2={pos} stroke="#4b5563" strokeWidth={lineWeights.level3} />);
            }
        }
        return lines;
    };

    // --- Helper for individual selector paths ---
    const getSelectorInfo = () => {
        if (!activePath) return null;
        const [l3, l2] = activePath;
        const l3Row = Math.floor(l3 / 3);
        const l3Col = l3 % 3;
        const l2Row = Math.floor(l2 / 3);
        const l2Col = l2 % 3;

        const globalRow = l3Row * 3 + l2Row;
        const globalCol = l3Col * 3 + l2Col;
        const sx = (l3Col * MEDIUM_BOARD_SIZE) + (l2Col * SMALL_BOARD_SIZE);
        const sy = (l3Row * MEDIUM_BOARD_SIZE) + (l2Row * SMALL_BOARD_SIZE);
        const sw = SMALL_BOARD_SIZE - 8;
        const sh = SMALL_BOARD_SIZE - 8;
        const inset = 4;

        const mx = l3Col * MEDIUM_BOARD_SIZE;
        const my = l3Row * MEDIUM_BOARD_SIZE;
        const mw = MEDIUM_BOARD_SIZE - 8;
        const mh = MEDIUM_BOARD_SIZE - 8;

        const getPath = (bx: number, by: number, bw: number, bh: number, isEdge: (r: number, c: number) => boolean, row: number, col: number) => {
            const r = cornerRadius;
            const tlr = isEdge(0, 0) ? r : 0;
            const trr = isEdge(0, 8) || (bw === MEDIUM_BOARD_SIZE - 8 && col === 2) ? r : 0;
            const brr = isEdge(8, 8) || (bw === MEDIUM_BOARD_SIZE - 8 && row === 2 && col === 2) ? r : 0;
            const blr = isEdge(8, 0) || (bw === MEDIUM_BOARD_SIZE - 8 && row === 2) ? r : 0;

            // Simplified corner logic for the medium board which is simpler to determine
            const medTlr = (bw > 300 && row === 0 && col === 0) ? r : 0;
            const medTrr = (bw > 300 && row === 0 && col === 2) ? r : 0;
            const medBrr = (bw > 300 && row === 2 && col === 2) ? r : 0;
            const medBlr = (bw > 300 && row === 2 && col === 0) ? r : 0;

            const curTlr = bw > 300 ? medTlr : tlr;
            const curTrr = bw > 300 ? medTrr : trr;
            const curBrr = bw > 300 ? medBrr : brr;
            const curBlr = bw > 300 ? medBlr : blr;

            return `M ${bx + inset + curTlr} ${by + inset} L ${bx + inset + bw - curTrr} ${by + inset} ${curTrr > 0 ? `Q ${bx + inset + bw} ${by + inset} ${bx + inset + bw} ${by + inset + curTrr}` : ''} L ${bx + inset + bw} ${by + inset + bh - curBrr} ${curBrr > 0 ? `Q ${bx + inset + bw} ${by + inset + bh} ${bx + inset + bw - curBrr} ${by + inset + bh}` : ''} L ${bx + inset + curBlr} ${by + inset + bh} ${curBlr > 0 ? `Q ${bx + inset} ${by + inset + bh} ${bx + inset} ${by + inset + bh - curBlr}` : ''} L ${bx + inset} ${by + inset + curTlr} ${curTlr > 0 ? `Q ${bx + inset} ${by + inset} ${bx + inset + curTlr} ${by + inset}` : ''} Z`;
        };

        const checkSmallEdge = (r: number, c: number) => globalRow === r && globalCol === c;

        return {
            small: getPath(sx, sy, sw, sh, checkSmallEdge, globalRow, globalCol),
            medium: getPath(mx, my, mw, mh, () => false, l3Row, l3Col)
        };
    };

    const selectorPaths = getSelectorInfo();

    return (
        <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            className="w-full h-full bg-white shadow-lg"
            style={{ display: 'block' }}
        >
            {/* 1. LAYER ONE: Definitions (Masks for occluding higher lines) */}
            <defs>
                {selectorPaths && (
                    <>
                        <mask id="mask-l2">
                            <rect x="0" y="0" width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="white" />
                            <path d={selectorPaths.small} fill="black" />
                        </mask>
                        <mask id="mask-l3">
                            <rect x="0" y="0" width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="white" />
                            <path d={selectorPaths.medium} fill="black" />
                        </mask>
                    </>
                )}
            </defs>

            {/* 2. LAYER TWO: Content (Marks, Backgrounds) */}
            {Array.from({ length: 9 }).map((_, i) => {
                const l3 = i;
                const mediumBoard = gameState.board.grid[l3];
                const l3Row = Math.floor(l3 / 3);
                const l3Col = l3 % 3;
                const l3X = l3Col * MEDIUM_BOARD_SIZE;
                const l3Y = l3Row * MEDIUM_BOARD_SIZE;

                let isMediumBoardActive = true;
                if (activePath) isMediumBoardActive = activePath[0] === l3;
                const style = isMediumBoardActive ? {} : { filter: `blur(${inactiveBlur}px)`, opacity: 0.8 };

                const cells = [];
                for (let l2 = 0; l2 < 9; l2++) {
                    const smallBoard = mediumBoard.grid[l2];
                    const l2Row = Math.floor(l2 / 3);
                    const l2Col = l2 % 3;
                    const l2X = l3X + l2Col * SMALL_BOARD_SIZE;
                    const l2Y = l3Y + l2Row * SMALL_BOARD_SIZE;

                    if (smallBoard.owner) {
                        cells.push(<rect key={`won-bg-${l3}-${l2}`} x={l2X} y={l2Y} width={SMALL_BOARD_SIZE} height={SMALL_BOARD_SIZE} fill={smallBoard.owner === 'X' ? '#3b82f6' : '#ef4444'} fillOpacity="0.15" />);
                        cells.push(<text key={`won-sym-${l3}-${l2}`} x={l2X + SMALL_BOARD_SIZE / 2} y={l2Y + SMALL_BOARD_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="200" fontWeight="900" fill={smallBoard.owner === 'X' ? '#2563eb' : '#dc2626'} opacity="0.3" pointerEvents="none">{smallBoard.owner}</text>);
                    }

                    for (let l1 = 0; l1 < 9; l1++) {
                        const cellValue = smallBoard.grid[l1];
                        const cellX = l2X + (l1 % 3) * CELL_SIZE;
                        const cellY = l2Y + Math.floor(l1 / 3) * CELL_SIZE;

                        if (cellValue) {
                            cells.push(<rect key={`occ-bg-${l3}-${l2}-${l1}`} x={cellX} y={cellY} width={CELL_SIZE} height={CELL_SIZE} fill="gray" fillOpacity={occupiedOpacity} pointerEvents="none" />);
                            cells.push(<text key={`cell-${l3}-${l2}-${l1}`} x={cellX + CELL_SIZE / 2} y={cellY + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="80" fontWeight="900" fill={cellValue === 'X' ? '#2563eb' : '#dc2626'} pointerEvents="none">{cellValue}</text>);
                        }
                    }
                }

                if (mediumBoard.owner) {
                    cells.push(<rect key={`won-med-bg-${l3}`} x={l3X} y={l3Y} width={MEDIUM_BOARD_SIZE} height={MEDIUM_BOARD_SIZE} fill={mediumBoard.owner === 'X' ? '#3b82f6' : '#ef4444'} fillOpacity="0.2" pointerEvents="none" />);
                    cells.push(<text key={`won-med-sym-${l3}`} x={l3X + MEDIUM_BOARD_SIZE / 2} y={l3Y + MEDIUM_BOARD_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="600" fontWeight="900" fill={mediumBoard.owner === 'X' ? '#2563eb' : '#dc2626'} opacity="0.2" pointerEvents="none">{mediumBoard.owner}</text>);
                }

                return <g key={`board-${l3}`} style={style}>{cells}</g>;
            })}

            {/* L1 Lines (Small Grid) - Always visible below higher selectors */}
            {renderGridLevel(1)}

            {/* L2 Lines - Masked by Small Selector if it exists */}
            <g mask={selectorPaths ? 'url(#mask-l2)' : undefined}>
                {renderGridLevel(2)}
            </g>

            {/* L3 Lines - Masked by Medium Selector if it exists */}
            <g mask={selectorPaths ? 'url(#mask-l3)' : undefined}>
                {renderGridLevel(3)}
            </g>

            {/* Selectors (Pure Stroke, No White Layer) */}
            {selectorPaths && (
                <>
                    <path
                        d={selectorPaths.small}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="12"
                        strokeOpacity="1"
                        pointerEvents="none"
                    />
                    <path
                        d={selectorPaths.medium}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="20"
                        strokeOpacity="1"
                        pointerEvents="none"
                    />
                </>
            )}

            {/* Click Targets (Always Top) */}
            {Array.from({ length: 9 }).map((_, l3) => {
                const l3Row = Math.floor(l3 / 3);
                const l3Col = l3 % 3;
                return Array.from({ length: 9 }).map((_, l2) => {
                    const l2Row = Math.floor(l2 / 3);
                    const l2Col = l2 % 3;
                    return Array.from({ length: 9 }).map((_, l1) => {
                        const cellX = (l3Col * MEDIUM_BOARD_SIZE) + (l2Col * SMALL_BOARD_SIZE) + (l1 % 3) * CELL_SIZE;
                        const cellY = (l3Row * MEDIUM_BOARD_SIZE) + (l2Row * SMALL_BOARD_SIZE) + Math.floor(l1 / 3) * CELL_SIZE;
                        const cellValue = gameState.board.grid[l3].grid[l2].grid[l1];
                        let isValid = !cellValue;
                        if (activePath) if (activePath[0] !== l3 || activePath[1] !== l2) isValid = false;
                        return (
                            <rect
                                key={`clicker-${l3}-${l2}-${l1}`}
                                x={cellX} y={cellY} width={CELL_SIZE} height={CELL_SIZE}
                                fill="transparent"
                                onClick={() => onCellClick([l3, l2, l1])}
                                style={{ cursor: isValid ? 'pointer' : 'not-allowed' }}
                            />
                        );
                    });
                });
            })}
        </svg>
    );
};
