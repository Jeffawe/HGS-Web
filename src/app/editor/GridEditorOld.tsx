'use client'

import React, { useState, useRef } from 'react';
import { Cell, GridData } from '../types';
import dynamic from "next/dynamic";

// Dynamically import the Konva components to avoid SSR issues
const Stage = dynamic(() => import("react-konva").then((mod) => mod.Stage), {
  ssr: false,
});
const Layer = dynamic(() => import("react-konva").then((mod) => mod.Layer), {
  ssr: false,
});
const Rect = dynamic(() => import("react-konva").then((mod) => mod.Rect), {
  ssr: false,
});
const Text = dynamic(() => import("react-konva").then((mod) => mod.Text), {
  ssr: false,
})


const GridEditor = () => {
    const CELL_SIZE = 50;
    const PADDING = 40;
    const [gridWidth, setGridWidth] = useState(10);
    const [gridHeight, setGridHeight] = useState(10);
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
    const [gridData, setGridData] = useState<{ [key: string]: GridData }>({});
    const [inputValue, setInputValue] = useState('');
    const [selectedColor, setSelectedColor] = useState('#lightblue');
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    const colors = [
        '#ff9999', // Light red
        '#99ff99', // Light green
        '#9999ff', // Light blue
        '#ffff99', // Light yellow
        '#ff99ff', // Light purple
        '#99ffff', // Light cyan
        '#ffffff', // White
        '#cccccc', // Light gray
    ];

    const handleCellClick = (x: number, y: number) => {
        setSelectedCell({ x, y });
        setInputValue(gridData[`${x},${y}`]?.text || '');
        setInputValue
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell && inputValue.trim()) {
            setGridData({
                ...gridData,
                [`${selectedCell.x},${selectedCell.y}`]: {
                    position: { x: selectedCell.x, y: selectedCell.y },
                    text: inputValue,
                    color: selectedColor
                }
            });
            setSelectedCell(null);
            setInputValue('');
        }
    };

    const exportToJSON = () => {
        const objects = Object.entries(gridData).map(([coords, data]) => {
            const [x, y] = coords.split(',').map(Number);
            return {
                position: { x: x * CELL_SIZE, y: y * CELL_SIZE },
                text: data.text,
                color: data.color
            };
        });

        const jsonData = JSON.stringify(objects, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grid-layout.json';
        a.click();
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();

        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointerPos = stage.getPointerPosition();

        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        // Limit the zoom levels
        if (newScale > 0.3 && newScale < 3) {
            setStageScale(newScale);

            const newPos = {
                x: (pointerPos.x - stage.x()) / oldScale * newScale - pointerPos.x,
                y: (pointerPos.y - stage.y()) / oldScale * newScale - pointerPos.y
            };

            setStagePos(newPos);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label>Width:</label>
                    <input
                        type="number"
                        value={gridWidth}
                        onChange={(e) => setGridWidth(Number(e.target.value))}
                        className="w-20 p-1 border rounded"
                        min="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label>Height:</label>
                    <input
                        type="number"
                        value={gridHeight}
                        onChange={(e) => setGridHeight(Number(e.target.value))}
                        className="w-20 p-1 border rounded"
                        min="1"
                    />
                </div>
                <button
                    onClick={exportToJSON}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
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
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
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
                ref={containerRef}
                className="border rounded overflow-auto m-4"
                style={{
                    width: 'calc(100vw - 2rem)',
                    maxWidth: '1200px',
                    height: '70vh',
                    position: 'relative'
                }}
            >
                <Stage
                    width={Math.max(window.innerWidth - 100, (gridWidth * CELL_SIZE) + (PADDING * 2))}
                    height={Math.max(window.innerHeight - 200, (gridHeight * CELL_SIZE) + (PADDING * 2))}
                    onWheel={handleWheel}
                    scale={{ x: stageScale, y: stageScale }}
                    position={stagePos}
                    draggable
                >
                    <Layer>
                        {/* Draw grid cells */}
                        <Rect
                            x={PADDING}
                            y={PADDING}
                            width={gridWidth * CELL_SIZE}
                            height={gridHeight * CELL_SIZE}
                            stroke="rgba(0,0,0,0.1)"
                            fill="white"
                        />

                        {Array.from({ length: gridWidth }).map((_, x) =>
                            Array.from({ length: gridHeight }).map((_, y) => {
                                const cellData = gridData[`${x},${y}`];
                                return (
                                    <React.Fragment key={`${x},${y}`}>
                                        <Rect
                                            x={PADDING + (x * CELL_SIZE)}
                                            y={PADDING + (y * CELL_SIZE)}
                                            width={CELL_SIZE}
                                            height={CELL_SIZE}
                                            fill={cellData?.color || 'white'}
                                            stroke="gray"
                                            onClick={() => handleCellClick(x, y)}
                                        />
                                        {/* Cell coordinates */}
                                        <Text
                                            x={PADDING + (x * CELL_SIZE)}
                                            y={PADDING + (y * CELL_SIZE) + 2}
                                            width={CELL_SIZE}
                                            text={`${x},${y}`}
                                            align="center"
                                            fontSize={8}
                                            fill="rgba(0,0,0,0.2)"
                                            listening={false}
                                        />
                                        {cellData?.text && (
                                            <Text
                                                x={PADDING + (x * CELL_SIZE)}
                                                y={PADDING + (y * CELL_SIZE)}
                                                width={CELL_SIZE}
                                                height={CELL_SIZE}
                                                text={cellData.text}
                                                align="center"
                                                verticalAlign="middle"
                                                fontSize={Math.min(12, CELL_SIZE / 4)}
                                                padding={5}
                                                listening={false}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};

export default GridEditor;