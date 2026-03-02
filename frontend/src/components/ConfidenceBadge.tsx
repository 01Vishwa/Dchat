import React from 'react';

interface ConfidenceBadgeProps {
    confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
    let colorClass = '';
    let dotColorClass = '';
    let label = '';

    if (confidence >= 0.7) {
        colorClass = 'bg-green-100 text-green-800';
        dotColorClass = 'bg-green-500';
        label = 'High confidence';
    } else if (confidence >= 0.4) {
        colorClass = 'bg-yellow-100 text-yellow-800';
        dotColorClass = 'bg-yellow-500';
        label = 'Medium confidence';
    } else {
        colorClass = 'bg-red-100 text-red-800';
        dotColorClass = 'bg-red-500';
        label = 'Low confidence';
    }

    // Convert to percentage, handling potential 0.xxx floats
    const percentage = Math.round(confidence * 100);

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`} title={label}>
            <span className={`w-2 h-2 mr-1.5 rounded-full ${dotColorClass}`}></span>
            {percentage}%
        </span>
    );
}
