import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'
import {
  Matrix,
  RoomsMatrix,
  TraverseCallback,
  LightMap,
  Room,
  Neighbours,
  InputMatrix
} from './types'

export function traverseMatrix(
  matrix: Matrix | RoomsMatrix, 
  callback: TraverseCallback
): void{
  const bottom = matrix.length - 1
  const right = matrix[0].length - 1

  for(let row = 0; row <= bottom; row++){
    for(let column = 0; column <= right; column++){
      callback(row, column)
    }
  }
}

// @ts-ignore
export const logger = (data)=>{console.log(JSON.stringify(data, null, 2))}

export function calculateRoomsInfluenceRange(rooms: RoomsMatrix){
  // Define matrix boundaries:
  const top = 0
  const right = rooms[0].length - 1
  const bottom = rooms.length - 1
  const left = 0 

  return (row: number, col: number) => {
    // Find range to the right:
    for(let c = col + 1; c <= right; c++){
      if (!rooms[row][c].isRoom) break;
      rooms[row][col].neighbours.right.push({x: c, y: row})
    }
    // Find range down: 
    for(let r = row + 1; r <= bottom; r++){
      if (!rooms[r][col].isRoom) break;
      rooms[row][col].neighbours.down.push({x: col, y: r})
    }

    // Find range left:
    for(let c = col - 1; c >= left; c--){
      if (!rooms[row][c].isRoom) break;
      rooms[row][col].neighbours.left.push({x: c, y: row})

    }

    // Find range up:
    for(let r = row - 1; r >= top; r--){
      if (!rooms[r][col].isRoom) break;
      rooms[row][col].neighbours.up.push({x: col, y: r})

    }

    rooms[row][col].influenceRange = (
      rooms[row][col].neighbours.right.length +
      rooms[row][col].neighbours.down.length +
      rooms[row][col].neighbours.left.length +
      rooms[row][col].neighbours.up.length
    )

  }
}

export function roomBuilder(container: Array<Array<Room>>, matrix:Matrix){
  return (row: number, col: number)=>{
    const room = {
      isRoom: matrix[row][col] ? true : false,
      isLighted: false,
      hasLightBulb: false,
      influenceRange: 0,
      neighbours: {
        left: [], 
        right: [], 
        up: [], 
        down: [],
      },
      position: {
        y: row,
        x: col
      }
    }

    if (container.length - 1 < row){
      container.push([room]) 
    }else{
      container[row].push(room)
    }
  }
}

export function pickLightBulbLocations (roomsMatrix: RoomsMatrix){
  const flattenRooms: Room[] = []
  roomsMatrix.forEach((row)=>{
    row.forEach((col)=>{
      flattenRooms.push(col) 
    })
  })

  const roomsByInfluence = flattenRooms.sort((a, b)=>{
    if (a.influenceRange > b.influenceRange) return -1
    if (a.influenceRange < b.influenceRange) return 1
    return 0
  })  



  roomsByInfluence.forEach((room)=>{
    if(!room.hasLightBulb && !room.isLighted && room.isRoom){
      // Place a light bulb in this place:
      room.hasLightBulb = true 
      room.isLighted = true

      // Lighten all to the sides:
      Object.keys(room.neighbours).forEach((direction) => {  
        const ne = room.neighbours[direction as keyof Neighbours]
        ne.forEach((pos)=>{
          roomsMatrix[pos.y][pos.x].isLighted = true
        })
      })
    }
  })

}

export function fileExists(pathToFile: string){
  if (fs.existsSync(pathToFile)) return true;
  return false;
}

export function generateViewsFromMap(folder: string, matrix: LightMap){
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder); 
  }
  const generateTable = (lightMap: LightMap) => {
    const rows: string[] = []
    
    lightMap.forEach((row)=>{
      const r: string[] = []      
      
      row.forEach((col)=>{
        r.push(`
          <td class='${col > 0 ? 'bg-yellow-200': 'bg-gray-500'} w-10 h-8 border-2 border-gray-500 text-center'>
            ${ col === 2 ? '<img class="inline text-center" objectFit="cover" width="30px" height="30px" src="https://www.clipartmax.com/png/small/3-32260_awesome-clip-art-item-1-image-light-bulb-clipart.png"/>': ''}
          </td>


        `)
      })
      rows.push('<tr>' + r.join('') + '</tr>') 
    })

    const tableData = rows.join('')

    return `<table>${tableData}</table>`
  }

  const html = (table?: string)=>{
    return `
      <html class='bg-green-500'>
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" referrerpolicy="no-referrer" 
          />
        <title>
          Results from light bulb picker
        </title>
      </head>
      <body class='h-screen w-screen flex justify-center items-center text-center'>
          <div class='fixed top-0 left-0 bg-white'>
          </div>
          <div>
            ${table ? table : 'No table provided'}
          </div>
        </div>
      </html>
    `
  } 
  const filename = new Date().toISOString()  
  const pathToFile = path.join(folder, filename + '.html')

  const table = generateTable(matrix)
  fs.writeFile(pathToFile, html(table), function (err) {
    if (err) return console.log(err);
    console.log(`✅ Output saved at: ${pathToFile}`);
  });

}

export function readCSV(pathToFile:string): Promise<InputMatrix>{
  const result: InputMatrix = []
  return new Promise(function (resolve, reject){
    fs.createReadStream(pathToFile).pipe(parse({ delimiter: ",", from_line: 2 }))
      .on("data", function (row) {
        result.push(row);
      })
      .on('end', ()=>{
        resolve(result) 
      })
      .on('error', (err)=>{
        reject(err)    
      })
  })
}

export async function readRoomsCSV(pathToFile: string){
  const matrix = await readCSV(pathToFile)
 
  const cleanMatrix:Matrix = []
  matrix.forEach((row)=>{
      cleanMatrix.push(row.map((el)=>{
        const num = parseInt(el.trim(), 10)
        if (num === 1  || num === 0){
          return num
        }
        throw new Error('👎 Input .csv file can only contain 0s, and 1s')
      })) 
  })
  
  let allMatchCheck = true
  const expectedColumns = matrix[0].length
  matrix.forEach((col)=>{
    if (col.length !== expectedColumns){
      allMatchCheck = false
    }
  }) 
  if (!allMatchCheck){
    throw new Error('Input file matrix should have equal columns on each row.')
  }
  

  return cleanMatrix

}

