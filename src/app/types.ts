export interface Cell {
    x: number,
    y: number
}

export interface GridData {
    position: Cell,
    text: string,
    color: string,
    direction: 'Up' | 'Down' | 'Left' | 'Right'
}

export interface ImageGridData {
    name: string,
    text: string,
    position: Cell,
    width: number,
    height: number,
    direction: 'Up' | 'Down' | 'Left' | 'Right'
}