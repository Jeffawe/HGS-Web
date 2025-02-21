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
    const stageRef: ComponentProps<typeof Stage>["ref"] = useRef(null);

    const [paperWidth, setPaperWidth] = useState(0)
    const [paperBreadth, setPaperBreadth] = useState(0)

    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectRef = useRef<HTMLSelectElement | null>(null);

    const router = useRouter();

    const handleCellClick = useCallback((x: number, y: number) => {
        setSelectedCell({ x, y });
        setInputValue(gridData[`${x},${y}`]?.text || '');
    }, [gridData]);

    const fetchGridFromExternalSource = async () => {
        try {
            if (dataID) {
                const response = await axios.get<ImageGridData[]>(`/api/get-grid?id=${dataID}`)
                console.log(response.data);
                convertToGrid(response.data)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const convertToGrid = (data: ImageGridData[]) => {
        try {
            // Remove the first item from the data array
            const firstItem = data.shift(); 
            if (firstItem) {
                const { width, height } = firstItem;
                setPaperBreadth(height);
                setPaperWidth(width);
            }

            // Process the remaining items in the data array
            data.forEach((item: ImageGridData) => {
                const finalValue = getGridValue(item.position.x, item.position.y);

                // Update grid data
                setGridData((prev) => ({
                    ...prev,
                    [`${item.position.x},${item.position.y}`]: {
                        position: { x: finalValue.x, y: finalValue.y },
                        text: item.text,
                        name: item.name,
                        color: "#99ff99",
                        direction: item.direction,
                    },
                }));
            });

        } catch (error) {
            console.error("Error converting grid data:", error);
        }
    }

    const getGridValue = (x: number, y: number): Cell => {
        const finalXValue = (x / paperWidth) * gridWidth;
        const finalYValue = (y / paperBreadth) * gridHeight;

        return { x: finalXValue, y: finalYValue }
    }

    useEffect(() => {
        if (dataID) {
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
        }
    }, [selectedCell, inputValue, selectValue, selectedColor]);

    const exportToJSON = () => {
        const objects = Object.entries(gridData).map(([coords, data]) => {
            const [x, y] = coords.split(',').map(Number);
            return { position: { x, y }, text: data.text, direction: data.direction };
        });

        const blob = new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grid-layout.json';
        a.click();
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
    }, [gridWidth, gridHeight, gridData, handleCellClick]);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <button
                onClick={() => router.back()}
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
                <div className="flex flex-col gap-4 mb-4">
                    <form onSubmit={handleTextSubmit} className="flex gap-2">
                        <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="p-2 border rounded text-black"
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
