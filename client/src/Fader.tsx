import React, { useRef, useState, useCallback, useEffect } from 'react';
import classNames from 'classnames';

interface FaderProps {
    label: string;
    color: string;
    value: number; // 0.0 to 1.0
    onChange: (val: number) => void;
    isMaster?: boolean;
    footer?: React.ReactNode;
}

export const Fader: React.FC<FaderProps> = ({
    label, color, value, onChange, isMaster, footer
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync external changes when not actively dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalValue(value);
        }
    }, [value, isDragging]);

    // Convert normalized 0-1 value to pixels (bottom=0, top=100%)
    const getValFromEvent = useCallback((clientY: number) => {
        if (!trackRef.current) return localValue;
        const rect = trackRef.current.getBoundingClientRect();
        // y goes down, value goes up
        const percent = 1 - (clientY - rect.top) / rect.height;
        return Math.max(0, Math.min(1, percent));
    }, [localValue]);

    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.fader-cap')) {
            return; // Ignore clicks outside the knob/cap
        }

        e.preventDefault();
        setIsDragging(true);
        if (trackRef.current) trackRef.current.setPointerCapture(e.pointerId);

        const v = getValFromEvent(e.clientY);
        setLocalValue(v);
        onChange(v);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const v = getValFromEvent(e.clientY);
        setLocalValue(v);
        onChange(v);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        if (trackRef.current) trackRef.current.releasePointerCapture(e.pointerId);
    };

    // Convert value back to percentage for layout
    const valPercent = localValue * 100;

    return (
        <div className={classNames('fader-strip', { 'master-strip': isMaster })}>
            <div
                className="color-indicator"
                style={{ color: color, background: color }}
            />
            <div className="channel-name" title={label}>{label}</div>
            <div className="fader-value">
                {Math.round(localValue * 100)}%
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
            {footer && <div style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>{footer}</div>}
        </div>
    );
};
