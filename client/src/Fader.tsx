import React, { useRef, useState, useCallback } from 'react';
import classNames from 'classnames';

interface FaderProps {
    label: string;
    color: string;
    value: number; // 0.0 to 1.0
    onChange: (val: number) => void;
    isMaster?: boolean;
}

export const Fader: React.FC<FaderProps> = ({
    label, color, value, onChange, isMaster
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Convert normalized 0-1 value to pixels (bottom=0, top=100%)
    const getValFromEvent = useCallback((clientY: number) => {
        if (!trackRef.current) return value;
        const rect = trackRef.current.getBoundingClientRect();
        // y goes down, value goes up
        const percent = 1 - (clientY - rect.top) / rect.height;
        return Math.max(0, Math.min(1, percent));
    }, [value]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        if (trackRef.current) trackRef.current.setPointerCapture(e.pointerId);

        onChange(getValFromEvent(e.clientY));
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        onChange(getValFromEvent(e.clientY));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        if (trackRef.current) trackRef.current.releasePointerCapture(e.pointerId);
    };

    // Convert value back to percentage for layout
    const valPercent = value * 100;

    return (
        <div className={classNames('fader-strip', { 'master-strip': isMaster })}>
            <div
                className="color-indicator"
                style={{ color: color, background: color }}
            />
            <div className="channel-name" title={label}>{label}</div>
            <div className="fader-value">
                {Math.round(value * 100)}%
            </div>

            <div
                className="fader-track-container"
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="fader-track">
                    <div
                        className="fader-cap"
                        style={{
                            bottom: `${valPercent}%`
                        }}
                    >
                        <div className="fader-cap-line" />
                    </div>
                </div>
            </div>
        </div>
    );
};
