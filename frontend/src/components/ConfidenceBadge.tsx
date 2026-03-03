import React from 'react';

interface ConfidenceBadgeProps {
    confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
    let colorClass = '';
    let dotColorClass = '';
    let label = '';

    if (confidence >= 0.7) {
        colorClass = 'bg-green-100 text-green-700 border-green-200';
        label = 'High confidence';
    } else if (confidence >= 0.4) {
        colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
        label = 'Medium confidence';
    } else {
        colorClass = 'bg-red-100 text-red-700 border-red-200';
        label = 'Low confidence';
    }

    // Convert to percentage, handling potential 0.xxx floats
    const percentage = Math.round(confidence * 100);

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass} shadow-sm`} title={label}>
            {percentage}% Match
        </span>
    );
}
