
export type Matrix = Array<Array<number>>;

export type InputMatrix = Array<Array<string>>

export type Coordinates = {x: number, y: number};

export type Neighbours = {
  left: Coordinates[]
  right: Coordinates[]
  up: Coordinates[]
  down: Coordinates[]
}

export type Room = {
  isRoom: boolean
  isLighted: boolean
  neighbours: Neighbours
  hasLightBulb: boolean
  position: Coordinates
  influenceRange: number
}

export type RoomsMatrix = Array<Array<Room>>;

export type RoomsBuilder = (input: number) => void;
export type TraverseCallback = (row: number, col: number) => void;

export type LightMap = Array<Array<0| 1 | 2>>
