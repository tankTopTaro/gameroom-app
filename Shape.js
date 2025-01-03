const { calculateDistance, mapValue } = require('./utils.js')

class Shape{
    constructor(startPosX, startPosY, shape, width, height, color, onClick, pathDots, speed, affectsLightGroup, duration) { // Only rectangles for the moment
        this.active = true
        this.startPosX = startPosX
        this.startPosY = startPosY
        this.posX = startPosX
        this.posY = startPosY
        this.shape = shape
        this.width = width
        this.height = height
        this.onClick = onClick
        this.color = color
        this.pathDots = pathDots
        this.pathPosRel = 0
        this.speedRel = speed // path related
        this.length = undefined
        this.affectsLightGroup = affectsLightGroup
        this.duration = duration
        this.init()
    }

    // Calculate the total length of the path of the shape's path
    init(){
        let length = 0
        let lastDot = undefined
        this.pathDots.forEach((dot,i) => {

            if(lastDot !== undefined){
                length += calculateDistance(lastDot.x, lastDot.y, dot.x, dot.y)
            }
            lastDot = dot
        })
        this.pathLengthAbs = length

        if(this.duration !== undefined){
            const currentDate = Date.now();
            this.activeUntil = currentDate + this.duration
        }

    }

    // Updates the shape's position along the path based on its speed and path length
    // if the shape has moved beyond the end of the path, wraps it around to the beginning.
    update(){
        let lastDot = undefined
        this.pathPosRel += this.speedRel
        let pathLengthBeforeAbs = 0
        let pathLengthAfterAbs = 0
        while(this.pathPosRel >= 1){this.pathPosRel -= 1}
        while(this.pathPosRel < 0){this.pathPosRel += 1}
        this.pathDots.some((dot,i) => {
            if(lastDot !== undefined){
                let vectorLengthAbs = calculateDistance(lastDot.x, lastDot.y, dot.x, dot.y)
                pathLengthAfterAbs += vectorLengthAbs
                let pathPosAbs = this.pathPosRel * this.pathLengthAbs
                if(pathPosAbs >= pathLengthBeforeAbs && pathPosAbs <= pathLengthAfterAbs ){
                    let pathPosAlongThisVectorRel = (pathPosAbs - pathLengthBeforeAbs) / vectorLengthAbs
                    this.posX = mapValue(pathPosAlongThisVectorRel,0,1, lastDot.x, dot.x) + this.startPosX
                    this.posY = mapValue(pathPosAlongThisVectorRel,0,1, lastDot.y, dot.y) + this.startPosY
                    return true
                }
            }
            pathLengthBeforeAbs = pathLengthAfterAbs
            lastDot = dot
        })
    }
}

module.exports = Shape;