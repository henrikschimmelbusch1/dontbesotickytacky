import React from 'react';
import type { CellValue } from '../game/types';

interface CellProps {
    value: CellValue;
    onClick: () => void;
    isValid: boolean;
    isLastMove: boolean;
}

export const Cell: React.FC<CellProps> = ({ value, onClick, isValid, isLastMove }) => {
    return (
        <button
            onClick={onClick}
            disabled={value !== null}
            className={`
        absolute inset-0 flex items-center justify-center relative z-50 text-2xl sm:text-3xl md:text-4xl font-black leading-none
        transition-colors duration-200
        ${value === 'X' ? 'text-blue-600' : 'text-red-600'}
        ${isValid && !value ? 'bg-green-50/30 hover:bg-green-100/50 cursor-pointer' : 'bg-transparent'}
        ${isLastMove ? 'bg-yellow-100/50' : ''}
        disabled:cursor-default
      `}
            style={{ aspectRatio: '1/1' }}
        >
            {value}
        </button>
    );
};
