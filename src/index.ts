import events from 'events';
import { Matrix, RoomsMatrix, LightMap } from './types'
import repl from 'repl'
import path from 'path'
import { 
  readRoomsCSV,
  fileExists,
  logger,
  traverseMatrix,
  calculateRoomsInfluenceRange,
  roomBuilder,
  pickLightBulbLocations,
  generateViewsFromMap
} from './helpers'


const eventEmitter = new events.EventEmitter()

const PATH_TO_OUTPUTS = path.join(process.cwd(), 'outputs')
const PATH_TO_INPUTS = path.join(process.cwd(), 'inputs')

const warnings = {
  wrongInput: '⚠️  Try with a different name, make sure the file is inside "/inputs" folder.'
}

const cli = repl.start({
  prompt: 'light-picker > ',
  eval: async(userInput)=>{

    const filename = userInput.trim().replace("/n", '')
    const pathToSource = path.join(PATH_TO_INPUTS, filename) 
    
    console.log(`🏁 Processing ${filename} file.`)
    if(!filename){
      console.log(`❌ File name given it's empty.`)
      console.warn(warnings.wrongInput)
      return
    }

    if(!fileExists(pathToSource)){
      console.log(`❌ File ${pathToSource} doesn't exists.`)
      console.warn(warnings.wrongInput)
      return
    } 
  
    const mtx = await readRoomsCSV(pathToSource) 
    const roomsMatrix = [] as RoomsMatrix
    traverseMatrix(mtx, roomBuilder(roomsMatrix, mtx))
    traverseMatrix(roomsMatrix, calculateRoomsInfluenceRange(roomsMatrix))
    pickLightBulbLocations(roomsMatrix)
    
    const roomLightMap: LightMap = []
    roomsMatrix.forEach((row)=>{
      roomLightMap.push(
        row.map((col)=>{
          if(col.hasLightBulb) return 2
          if(col.isLighted) return 1
          return 0
        })
      )
    })

    generateViewsFromMap(PATH_TO_OUTPUTS, roomLightMap)

  }
})

cli.on('exit', ()=>{
  console.log('Quitting light-picker app...')
})
