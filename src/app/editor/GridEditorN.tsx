'use client'

import React, { useState, useRef, useCallback, useMemo, ComponentProps, useEffect } from 'react';
import { Cell, GridData, ImageGridData } from '../types';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { useRouter } from 'next/navigation';
import { KonvaEventObject } from 'konva/lib/Node';
import axios from 'axios';

const CELL_SIZE = 50;
const PADDING = 40;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

const colors = [
    '#ff9999', '#99ff99', '#9999ff', '#ffff99',
    '#ff99ff', '#99ffff', '#ffffff', '#cccccc',
];

interface GridEditorProps {
    dataID?: string | undefined; // Optional in case it’s undefined initially
}

const GridEditor: React.FC<GridEditorProps> = ({ dataID }) => {
    const [gridWidth, setGridWidth] = useState(50);
    const [gridHeight, setGridHeight] = useState(50);
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
    const [gridData, setGridData] = useState<Record<string, GridData>>({});
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState<'Up' | 'Down' | 'Left' | 'Right'>('Up');
    const [selectedColor, setSelectedColor] = useState('#9999ff');
    const [stageScale, setStageScale] = useState(1);
    const [moveToX, setMoveToX] = useState<number>(0);
    const [moveToY, setMoveToY] = useState<number>(0);
    const [isMovingCell, setIsMovingCell] = useState(false);
    const stageRef: ComponentProps<typeof Stage>["ref"] = useRef(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectRef = useRef<HTMLSelectElement | null>(null);

    const router = useRouter();

    const handleCellClick = useCallback((x: number, y: number) => {
        setSelectedCell({ x, y });
        setInputValue(gridData[`${x},${y}`]?.text || '');
        setMoveToX(x);
        setMoveToY(y);
    }, [gridData]);

    const fetchGridFromExternalSource = async () => {
        try {
            if (dataID && dataID != 'none') {
                const response = await axios.get(`/api/get-grid?id=${dataID}`)
                convertToGrid(response.data)
            }
        } catch{}
    }

    const convertToGrid = (data: ImageGridData[]) => {
        try {
            if (data.length < 2) {
                console.error("Data must have at least 2 elements: one for dimensions, one for grid items");
                return;
            }

            // Remove the first item from the data array
            const firstItem = data.shift();
            const width = firstItem?.width || 1;
            const height = firstItem?.height || 1

            // Process the remaining items in the data array
            data.forEach((item: ImageGridData) => {
                const finalValue = getGridValue(item.position.x, item.position.y, width, height);
                console.log(finalValue);
                setGridData((prev) => ({
                    ...prev,
                    [`${finalValue.x},${finalValue.y}`]: {
                        position: { x: finalValue.x, y: finalValue.y },
                        text: item.text,
                        name: item.name,
                        color: "#99ff99",
                        direction: item.direction,
                    },
                }));
            });

        } catch{
            console.error("Error converting grid data:");
        }
    }

    const getGridValue = (x: number, y: number, width: number, height: number): Cell => {
        const finalXValue = (x / width) * gridWidth;
        const finalYValue = (y / height) * gridHeight;

        return { x: Math.round(finalXValue), y: Math.round(finalYValue) }
    }

    useEffect(() => {
        if (dataID && dataID != 'none') {
            fetchGridFromExternalSource();
        }
    }, [dataID])

    const handleTextSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell && inputValue.trim()) {
            setGridData((prev) => ({
                ...prev,
                [`${selectedCell.x},${selectedCell.y}`]: {
                    position: { x: selectedCell.x, y: selectedCell.y },
                    text: inputValue,
                    color: selectedColor,
                    direction: selectValue
                },
            }));
            setSelectedCell(null);
            setInputValue('');
            setIsMovingCell(false);
        }
    }, [selectedCell, inputValue, selectValue, selectedColor]);

    const exportToJSON = () => {
        // Create default values object as first element
        const defaultValues = {
            position: { x:0, y:0 },
            width: gridWidth,
            height: gridHeight,
            text: "original",
            direction: "Up",
            name: "original"
        };
    
        // Create array of cell objects
        const cellObjects = Object.entries(gridData).map(([coords, data]) => {
            const [x, y] = coords.split(',').map(Number);
            return { name: data.text, position: { x, y }, text: data.text, width: 0, height: 0, direction: data.direction };
        });
    
        // Combine default values with cell objects
        const objects = [defaultValues, ...cellObjects];
    
        const blob = new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grid-layout.json';
        a.click();
        URL.revokeObjectURL(url); // Clean up the URL object
    };

    const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
            stage.scale({ x: newScale, y: newScale });
            setStageScale(newScale);
        }
    }, []);

    const handleMoveCell = useCallback(() => {
        if (!selectedCell) return;

        // Get the current cell data
        const currentKey = `${selectedCell.x},${selectedCell.y}`;
        const cellData = gridData[currentKey];

        if (!cellData) return;

        // Check if target coordinates are within grid bounds
        if (moveToX < 0 || moveToX >= gridWidth || moveToY < 0 || moveToY >= gridHeight) {
            alert("Target coordinates are outside the grid boundaries.");
            return;
        }

        // Check if target cell is already occupied
        const targetKey = `${moveToX},${moveToY}`;
        if (gridData[targetKey] && targetKey !== currentKey) {
            const confirmMove = window.confirm(
                "Target cell is already occupied. Do you want to overwrite it?"
            );
            if (!confirmMove) return;
        }

        // Create new grid data with the cell moved to the new position
        const newGridData = { ...gridData };

        // Delete the cell from its original position
        delete newGridData[currentKey];

        // Add the cell to its new position
        newGridData[targetKey] = {
            ...cellData,
            position: { x: moveToX, y: moveToY }
        };

        // Update the grid data
        setGridData(newGridData);

        // Update the selected cell
        setSelectedCell({ x: moveToX, y: moveToY });
        setIsMovingCell(false);

    }, [selectedCell, moveToX, moveToY, gridData, gridWidth, gridHeight]);

    const toggleMoveMode = useCallback(() => {
        if (selectedCell) {
            setIsMovingCell(!isMovingCell);
            setMoveToX(selectedCell.x);
            setMoveToY(selectedCell.y);
        }
    }, [selectedCell, isMovingCell]);

    const renderedCells = useMemo(() => {
        return Array.from({ length: gridWidth }).flatMap((_, x) =>
            Array.from({ length: gridHeight }).map((_, y) => {
                const cellData = gridData[`${x},${y}`];
                const isTargetCell = isMovingCell && moveToX === x && moveToY === y;
                const isCurrentSelectedCell = selectedCell?.x === x && selectedCell?.y === y;
                
                let fillColor = cellData?.color || 'white';
                if (isTargetCell && !isCurrentSelectedCell) {
                    fillColor = '#FFEB3B'; // Highlight target cell in yellow
                } else if (isCurrentSelectedCell) {
                    fillColor = '#FF5722'; // Highlight selected cell in orange
                }
                
                return (
                    <React.Fragment key={`${x},${y}`}>
                        <Rect
                            x={PADDING + x * CELL_SIZE}
                            y={PADDING + y * CELL_SIZE}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            fill={fillColor}
                            stroke={isTargetCell || isCurrentSelectedCell ? 'blue' : 'gray'}
                            strokeWidth={isTargetCell || isCurrentSelectedCell ? 2 : 1}
                            onClick={() => {
                                if (isMovingCell) {
                                    setMoveToX(x);
                                    setMoveToY(y);
                                } else {
                                    handleCellClick(x, y);
                                }
                            }}
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
    }, [gridWidth, gridHeight, gridData, handleCellClick, selectedCell, isMovingCell, moveToX, moveToY]);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 self-start"
            >
                ← Back
            </button>
            <div className="flex gap-4 mb-4">
                <label>Width:</label>
                <input
                    type="number"
                    value={gridWidth}
                    onChange={(e) => setGridWidth(Number(e.target.value))}
                    className="w-20 p-1 border rounded text-black"
                    min="1"
                />
                <label>Height:</label>
                <input
                    type="number"
                    value={gridHeight}
                    onChange={(e) => setGridHeight(Number(e.target.value))}
                    className="w-20 p-1 border rounded text-black"
                    min="1"
                />
                <button onClick={exportToJSON} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Export JSON
                </button>
            </div>

            {selectedCell && (
                <div className="flex flex-col gap-4 mb-4 w-full max-w-3xl">
                    <div className="flex gap-2 justify-between items-center">
                        <span className="font-medium">Selected Cell: ({selectedCell.x}, {selectedCell.y})</span>
                        <button 
                            onClick={toggleMoveMode} 
                            className={`px-4 py-2 ${isMovingCell ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded`}
                        >
                            {isMovingCell ? 'Cancel Move' : 'Move Cell'}
                        </button>
                    </div>
                    
                    {isMovingCell ? (
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4 items-center">
                                <label>Move to X:</label>
                                <input
                                    type="number"
                                    value={moveToX}
                                    onChange={(e) => setMoveToX(Math.max(0, Math.min(gridWidth-1, Number(e.target.value))))}
                                    className="w-20 p-1 border rounded text-black"
                                    min="0"
                                    max={gridWidth-1}
                                />
                                <label>Move to Y:</label>
                                <input
                                    type="number"
                                    value={moveToY}
                                    onChange={(e) => setMoveToY(Math.max(0, Math.min(gridHeight-1, Number(e.target.value))))}
                                    className="w-20 p-1 border rounded text-black"
                                    min="0"
                                    max={gridHeight-1}
                                />
                                <button
                                    onClick={handleMoveCell}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    Move
                                </button>
                            </div>
                            <p className="text-sm text-gray-600">Click on any cell in the grid to set it as the destination.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="p-2 border rounded text-black flex-1"
                                    placeholder="Enter text for cell"
                                    autoFocus
                                />

                                <select
                                    ref={selectRef}
                                    value={selectValue}
                                    onChange={(e) => setSelectValue(e.target.value as 'Up' | 'Down' | 'Left' | 'Right')}
                                    className="p-2 border rounded text-black"
                                >
                                    <option value="Up">Up</option>
                                    <option value="Down">Down</option>
                                    <option value="Left">Left</option>
                                    <option value="Right">Right</option>
                                </select>

                                <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                                    Add
                                </button>
                            </div>
                            
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
                        </form>
                    )}
                </div>
            )}

            <div
                className="border rounded overflow-auto m-4"
                style={{ width: '90vw', height: '70vh', overflowX: 'scroll', overflowY: 'scroll' }}
            >
                <Stage
                    ref={stageRef}
                    width={Math.max(800, gridWidth * CELL_SIZE + PADDING * 2)}
                    height={Math.max(600, gridHeight * CELL_SIZE + PADDING * 2)}
                    scale={{ x: stageScale, y: stageScale }}
                    onWheel={handleWheel}
                >
                    <Layer>{renderedCells}</Layer>
                </Stage>
            </div>
        </div>
    );
};

export default GridEditor;