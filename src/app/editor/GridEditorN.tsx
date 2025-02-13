'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { Cell, GridData } from '../types';
import { KonvaEventObject } from 'konva/lib/Node';

const CELL_SIZE = 50;
const PADDING = 40;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

const colors = [
    '#ff9999', '#99ff99', '#9999ff', '#ffff99',
    '#ff99ff', '#99ffff', '#ffffff', '#cccccc',
];

const GridEditor = () => {
    const CELL_SIZE = 50;
    const PADDING = 40;
    const [gridWidth, setGridWidth] = useState(10);
    const [gridHeight, setGridHeight] = useState(10);
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
    const [gridData, setGridData] = useState<{ [key: string]: GridData }>({});
    const [inputValue, setInputValue] = useState('');
    const [selectedColor, setSelectedColor] = useState('lightblue');
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    const handleCellClick = useCallback((x: number, y: number) => {
        setSelectedCell({ x, y });
        setInputValue(gridData[`${x},${y}`]?.text || '');
    }, [gridData]);

    const handleTextSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell && inputValue.trim()) {
            setGridData((prev) => ({
                ...prev,
                [`${selectedCell.x},${selectedCell.y}`]: {
                    position: { x: selectedCell.x, y: selectedCell.y },
                    text: inputValue,
                    color: selectedColor,
                },
            }));
            setSelectedCell(null);
            setInputValue('');
        }
    }, [selectedCell, inputValue, selectedColor]);

    const exportToJSON = () => {
        const objects = Object.entries(gridData).map(([coords, data]) => {
            const [x, y] = coords.split(',').map(Number);
            return { position: { x, y }, text: data.text, color: data.color };
        });

        const blob = new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grid-layout.json';
        a.click();
    };

    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
    
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        
        if (!stage) return;
        
        const oldScale = stage.scaleX();
        const pointerPos = stage.getPointerPosition();
        
        if (!pointerPos) return;
    
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
        // Limit the zoom levels
        if (newScale > 0.3 && newScale < 3) {
            setStageScale(newScale);
    
            const mousePointTo = {
                x: (pointerPos.x - stage.x()) / oldScale,
                y: (pointerPos.y - stage.y()) / oldScale,
            };
    
            const newPos = {
                x: pointerPos.x - mousePointTo.x * newScale,
                y: pointerPos.y - mousePointTo.y * newScale,
            };
    
            setStagePos(newPos);
        }
    };
    

    const renderedCells = useMemo(() => {
        return Array.from({ length: gridWidth }).flatMap((_, x) =>
            Array.from({ length: gridHeight }).map((_, y) => {
                const cellData = gridData[`${x},${y}`];
                return (
                    <React.Fragment key={`${x},${y}`}>
                        <Rect
                            x={PADDING + x * CELL_SIZE}
                            y={PADDING + y * CELL_SIZE}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            fill={cellData?.color || 'white'}
                            stroke="gray"
                            onClick={() => handleCellClick(x, y)}
                        />
                        <Text
                            x={PADDING + x * CELL_SIZE + 5}
                            y={PADDING + y * CELL_SIZE + 5}
                            // If GridData contains text, combine it with the cell coordinates on a new line.
                            text={
                                cellData?.text
                                    ? `${cellData.text}\n(${x},${y})`
                                    : `(${x},${y})`
                            }
                            fontSize={10}
                            fill="black"
                            listening={false}
                        />
                    </React.Fragment>
                );
            })
        );
    }, [gridWidth, gridHeight, gridData]);
    
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: Math.max(window.innerWidth - 100, (gridWidth * CELL_SIZE) + (PADDING * 2)),
                height: Math.max(window.innerHeight - 200, (gridHeight * CELL_SIZE) + (PADDING * 2))
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [gridWidth, gridHeight]);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="flex gap-4 mb-4">
                <label>Width:</label>
                <input
                    type="number"
                    value={gridWidth}
                    onChange={(e) => setGridWidth(Number(e.target.value))}
                    className="w-20 p-1 border rounded"
                    min="1"
                />
                <label>Height:</label>
                <input
                    type="number"
                    value={gridHeight}
                    onChange={(e) => setGridHeight(Number(e.target.value))}
                    className="w-20 p-1 border rounded"
                    min="1"
                />
                <button onClick={exportToJSON} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Export JSON
                </button>
            </div>

            {selectedCell && (
                <div className="flex flex-col gap-4 mb-4">
                    <form onSubmit={handleTextSubmit} className="flex gap-2">
                        <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="p-2 border rounded"
                            placeholder="Enter text for cell"
                            autoFocus
                        />
                        <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                            Add Text
                        </button>
                    </form>
                    <div className="flex gap-2 items-center">
                        <span>Select Color:</span>
                        <div className="flex gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 ${selectedColor === color ? 'border-blue-500' : 'border-gray-300'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div
                className="border rounded overflow-auto m-4"
                style={{ width: '90vw', height: '70vh', overflowX: 'scroll', overflowY: 'scroll' }}
            >
                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    onWheel={handleWheel}
                    scale={{ x: stageScale, y: stageScale }}
                    position={stagePos}
                    draggable
                >
                    <Layer>{renderedCells}</Layer>
                </Stage>
            </div>
        </div>
    );
};

export default GridEditor;