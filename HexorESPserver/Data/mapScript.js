document.addEventListener("DOMContentLoaded", function () {
    /* Script that takes care of canvas map 
     * made by: Tomáš Hmiro
     * 31. 01. 2024 
     * part of Diploma work made for Hexor II robot
     * 
     * 1) draws map given by robot (asks for it) remake it into array (image) in 0-255 shades of grey ;P --- (it was really running song by weeknd from 50 shades of grey in my headphose when writing this comment)
     * 2) periodicly asks for robot location to show it in that map
     * 3) generates path to the target location (recursive function metod), clear the path by "vector" simplyfication (works well on map size 100x100px (tested))
     * 4) draws the generated path with important points (possible corners of obstacles)
     * 
     * 5) operator can choose the target, can input previously generated map and by "ctrl + left mouse" click in END mode put the robot in map
     * 6) operator can draw obstacles which will affect the path generation (virtual obstacles
     * 7) in move mode operator can just move map (left click a drag) image, zoom (wheel scroll +-)
     * 8) in all modes operator can move around by (wheel draging), zoom (wheel scroll +-)
     * 9) page is optimized on PC and may be tested on mobile phone (Android)
     * 
     * xy) TODO info button -> color legend & more
     */

    //DOM objects
    const canvas = document.getElementById("map");
    const context = canvas.getContext("2d");
    const move = document.getElementById("moveInMap");
    const pointSel = document.getElementById("endPointSel");
    const drawObject = document.getElementById("drawObject");
    const infoBut = document.getElementById("infoInMap");
    const skipDraw = document.getElementById("skipRedraw");
    const drawPoint = document.getElementById("drawPoint");
    let tim; //ID of timer inteval to draw map changes of client actions

    //Constants
    const pixelSize = 1;
    const pixelsInCm = 20;//1px is 20cm
    const RS = 40; //robot size in cm
    const RobotSizeWS = Math.round((RS / pixelsInCm) / 2, 1); //robot size (pixels ocupied by robot) derived from pixels in cm
    const mapModes = ["move", "select", "info", "drawObject"];
    let mapMode = mapModes[0], lastMapMode; //default map mode 

    //target position in native map coordinates (not affected by zoom or shift of map in canvas)
    //Structure to share with robot MCU
    let Target = { x: 0, y: 0, size: 1, en: false, valid: true, change: true, scaling: { H: 1, W: 1 } }; //Goal -> MCU 
    let Robot = { x: 0, y: 0, size: 2, en: false, valid: true, change: true, scaling: { H: 1, W: 1 } };  //Start <- MCU
    let importantPathPoints = []; // -> MCU to make moves (point in space to reach)
    
    //definition path points: { x: -1, y: -1, importance: -1};
    let path = [], Goal;   
    let v = 0, newTryOutPoints = [];//, tryOutNmr = 0;
    let pathDirection = "SE"; //let direction = ["SE","ES"]; //SE = start to end, ES = end to start
    const fid = [45, 315, 90, 270, 135, 225, 180];  
    let change = true, maxVectorLen = 0;

    //mouse variables
    let locX1, locY1, W, H, tempLocX1, tempLocY1, tempLocX2, tempLocY2;
    var mouseBtns = { left: 0, wheel: 1, right: 2, btn4: 3, btn5: 4 };
    let isDragging = false;
    let startX, startY, startScrollX = 2, startScrollY = 2, locX = -20, locY = -20;   
    
    //Map define
    let mapImageH, mapImageW; //size of map defined by user or
    //binary represantation of map in string recieved from ESP server 
    let img;

    //debugging purpose variables:
    let runningOnServer = false;
    let drawPathIdx = 0, drawOpPathIdx = 0, drawOpObjPath = [];
    //debug but possibly useful
    const idxInPath = document.getElementById("idxInPath");
    const pathLength = document.getElementById("pathLength");
    const resetIdx = document.getElementById("resetIdx");

    /*%ROS%*/ //if runnging on server this will be rewrited by preprocesor and be that set to TRUE (for offline debug purpose)
    /*%RS%*/ //robot size based on program in ESP if connected to Robot
    let mapStringArray;
    if (!runningOnServer) {
        mapStringArray = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110011111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000001110000000000000000000000001111000000000000000000000000000000000000000000000000000000000000010000000011100000000000000000000001111111111000000000000000000000000000000000000000000000000000000001000000000110000000000000000000000111101111111000000000000000000000000000000000000000000000000000000110000000011000000000000000000000011110001111110000000000000000000000000000000000000000000000000000001100000001100000000000000000000001110000000111000000000000000000000000000000000000000000000000000000111100001100000000000000000000000111000000001110000000000000000000000000000000000000000000000000000000111111100000000000000000000000011100000000111000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011100000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000011100000000000000000000000000000000000000000000000000000000000000000000000000000000000011111000000001111000000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000001111100000000000000011100000000000000000000000000000000000000000000000000000000000000000000000000011111100000000000000000110000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000000000011100000000000000000000000000000000000000000000000000000000000000000000001111100000000000000000000000111000000000000000000000000000000000000000000000000000000000000000000011111100000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000011111000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000011110000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000001111000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000001111100000000000000000000000000000000000000000000000000000000000000000011100000000000000000000000011111000000000000000000000000000000000000000000000000000000000000000000001111100000000000000000000111110000000000000000000000000000000000000000000000000000000000000000000000011111000000000000000001111100000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000011111100000000001111100000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000111111000000000000000000000000000000000000000000000000000000000000000000000000000000000001111100001111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111001111100000000000000000000000000000000000000000000000000000000000000000000000000011111111111111100000011111000000000000000000000000000000000000000000000000000000000000000000000011111111111111000000000001111110000000000000000000000000000000000000000000000000000000000000000000111111111111000000000000000011111100000000000000000000000000000000000000000000000000000000000000111111111111000000000000000000000111111000000000000000000000000000000000000000000000000000011111111111111111100000000000000000000000001111110000000000000000000000000000000000000100000011111111111111111111100000000000000000000000000000111111000000000000000000000000000000000000011111111111111111111111100000000000000000000000000000000001111110000000000000000000000000000000000011111111111111111111000000000000000000000000000000000000000001111100000000000000000000000000000000001111111111111000000000000000000000000000000000000000000000000011111000000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000011110000000000000000000000000000000000000000000000000000000000001111100000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000001111000000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000000001111000000000000000000000000001111111000000000000000000000000000000000000000000000000000000000000000011100000000000000000000001111111011100000000000000000000000000000000000000000000011111111111111111111111000000000000000000000100000001111000000000000000000000000000000000000000111111111111111111111111111100000000000000000000000000000011110000000000000000000000000000000111111111111111111111111111111111111000000000000000000000000000001111000000000000000001111111111111111111111111111000000011111111111111100000000000000000000000000000111110000000011111111111111111111111111111000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

        mapEnvSet(); //first call on load running without server
    } else {
        //ask for map 
        () => {
            //TODO async get funtion
            //at the end call first draw and start timer for not ask again
            //search for cookies saving of the last map and last refresh to not ask for map too many times if not necesarry
        }
     // if (mapLoaded == "loaded") mapEnvSet();
    }

    //EVENTS ---------------------------------------------------------------------------------------------------------------------
    canvas.addEventListener("mousedown", (e) => {
        rect = canvas.getBoundingClientRect();
        W = (canvas.width / canvas.clientWidth);
        H = (canvas.height / canvas.clientHeight);

        locX = Math.round((e.clientX - rect.left) * W, 1);
        locY = Math.round((e.clientY - rect.top) * H, 1);

        if (mapMode == mapModes[0]) {
            isDragging = true;
            canvas.style.cursor = "grabbing";
            startX = e.clientX;
            startY = e.clientY;
        }
        else if (e.button == mouseBtns.wheel) {
            lastMapMode = mapMode;
            mapMode = mapModes[0];
            modeChange();
            isDragging = true;
            canvas.style.cursor = "grabbing";
            startX = e.clientX;
            startY = e.clientY;
        }
        else if (mapMode == mapModes[1] && e.button == mouseBtns.left) {
            locX1 = (locX - startScrollX) / Target.scaling.W, locY1 = (locY - startScrollY) / Target.scaling.H;
            if (Target.en == false) {
                Target.scaling.H = scaleH;
                Target.scaling.W = scaleW;
                Target.x = Math.round(locX1, 1);
                Target.y = Math.round(locY1, 1);
                Target.en = true;
                Target.change = true;
                Target.valid = true;
                
                draw();
            }
            else if (e.ctrlKey) {
                locX2 = Math.floor(((locX - startScrollX) / scaleW),1);
                locY2 = Math.floor((locY - startScrollY) / scaleH, 1);
                context.fillRect(startScrollX + locX2 * scaleW, startScrollY + locY2 * scaleH, scaleW, scaleH);
                Robot.x = locX2;
                Robot.y = locY2;
                Robot.scaling.H = scaleH;
                Robot.scaling.W = scaleW;
                Robot.en = true;
                Robot.change = true;
                Robot.valid = true;
                change = true;
                draw();
            }
            else {
                if (Target.x == locX1 && Target.y == locY1) {
                    Target.en = false;
                    
                    draw();
                }
                else
                Target.scaling.H = scaleH;
                Target.scaling.W = scaleW;
                Target.x = Math.round(locX1, 1);
                Target.y = Math.round(locY1, 1);
                Target.change = true;
                Target.valid = true;
                
                draw();
            }
            
        }
        else if (mapMode == mapModes[3]) {
            mapOpDraw(e);
        }
    });

    document.addEventListener("mouseup", () => {        
        if (isDragging) {
            switch (lastMapMode) {
                case mapModes[0]: canvas.style.cursor = "grab";
                    break;
                case mapModes[1]: canvas.style.cursor = "crosshair";
                    break;
                case mapModes[2]: canvas.style.cursor = "help";
                    break;
                default: canvas.style.cursor = "grab";
                    break;
            }
            mapMode = lastMapMode;
            modeChange();
        }
        isDragging = false;
        isDrawing = false;        
    });

    document.addEventListener("mousemove", (e) => {        
        if (mapMode == mapModes[0]) {
            if (isDragging) {
                let W = (canvas.width / canvas.clientWidth);
                let H = (canvas.height / canvas.clientHeight);
                startScrollX += (e.clientX - startX) * W;
                startScrollY += (e.clientY - startY) * H;
                startX = e.clientX;
                startY = e.clientY;

                draw();
            }
        }
        mPos = document.getElementById("mPos");
        mZ = document.getElementById("mapZero");
        rect = canvas.getBoundingClientRect();

        locms = "mou: [" + Math.round(e.clientX - rect.left, 1) + ";" + Math.round(e.clientY - rect.top, 1) + "]";
        //let locma = "inMap: [" + Math.round((locX - startScrollX) / scaleH, 1) + ";" + Math.round((locY - startScrollY) / scaleW , 1) + "]";
        //let locma = "map: [" + Math.round(startScrollX, 1) + ";" + Math.round(startScrollY, 1) + "]";
        mPos.innerHTML = locms;
        //mZ.innerHTML = locma; 
        
        if ((startScrollX + mapImageW * scaleW) < 0 || startScrollX > canvas.clientWidth) {
            startScrollX = 2;
        }
        if ((startScrollY + mapImageH * scaleH) < 0 || startScrollY > canvas.clientHeight) {
            startScrollY = 2;
        }

        if (mapMode == mapModes[3] && isDrawing) {
            mapOpDraw(e);
        }
    });

    canvas.addEventListener("wheel", (e) => {
        rect = canvas.getBoundingClientRect();
        W = (canvas.width / canvas.clientWidth);
        H = (canvas.height / canvas.clientHeight);
        locX = Math.round((e.clientX - rect.left) * W, 1);
        locY = Math.round((e.clientY - rect.top) * H, 1);
        tempLocX1 = (locX - startScrollX) / Target.scaling.W;
        tempLocY1 = (locY - startScrollY) / Target.scaling.H;
        e.preventDefault();
        const zoomFactor = -e.deltaY > 0 ? 1.1 : 0.9;
        scale *= zoomFactor;
        scaleH = scale * H;
        scaleW = scale * W;
        Target.scaling.H = scaleH;
        Target.scaling.W = scaleW;
        Robot.scaling.H = scaleH;
        Robot.scaling.W = scaleW;
        tempLocX2 = (locX - startScrollX) / Target.scaling.W;
        tempLocY2 = (locY - startScrollY) / Target.scaling.H;
        startScrollX += ((tempLocX2 - tempLocX1)) * scaleW;
        startScrollY += ((tempLocY2 - tempLocY1)) * scaleH;
        if ((startScrollX + mapImageW * scaleW) < 0 || (startScrollX > canvas.clientWidth/2)) {
            startScrollX = 2;
        }
        if ((startScrollY + mapImageH * scaleH) < 0 || (startScrollY > canvas.clientHeight/2)) {
            startScrollY = 2;
        }
        draw();   
        
    });

    move.addEventListener("click", () => {
        mapMode = mapModes[0];
        modeChange();
    });

    pointSel.addEventListener("click", () => {
        mapMode = mapModes[1];
        modeChange();
    });

    drawObject.addEventListener("click", () => {
        mapMode = mapModes[3];
        modeChange();
    });

    infoBut.addEventListener("click", () => {
        mapMode = mapModes[2];
        modeChange();
    });

    idxInPath.addEventListener("change", () => {
        drawPathIdx = idxInPath.value;
    });

    resetIdx.addEventListener("click", () => {
        idxInPath.value = 0;
        drawPathIdx = 0;
    });

    drawPoint.addEventListener("click", () => {
        if (path[0] == undefined || drawPathIdx > Number(pathLength.innerHTML)-1) {
            return;
        }
        drawAnyPoint(path[drawPathIdx++], "#FF0000");
        drawPathIdx = drawPathIdx < Number(pathLength.innerHTML)-1 ? drawPathIdx : 0;
        idxInPath.value = drawPathIdx;
    });


    //FUNCTIONS ------------------------------------------------------------------------------------------------------------------
    function draw() {
        if (tim != undefined) {
            clearInterval(tim);
        }        
        tim = setTimeout(draw, 200);
        //console.log('redraw');               

        scaleW = scale * (canvas.width / canvas.clientWidth);
        scaleH = scale * (canvas.height / canvas.clientHeight);
        if (skipDraw.checked) {
            clearInterval(tim);
            tim = setTimeout(draw, 2000);
            return;
        }
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        maxVectorLen = Math.sqrt(mapImageH ** 2 + mapImageW ** 2);

        if (!runningOnServer) {
            //context.drawImage(mapImage, startScrollX, startScrollY, mapImageW * scaleW, mapImageH * scaleH);
        }
        //draw img at shifted plane in selected zoom scale
       
        drawImageFromPoints();
        Goal = document.getElementById("koordsGoal");
        Goal.innerHTML = "Cíl: ";
        Goal.innerHTML += Target.en ? "" + Math.round(Target.x) + ", " + Math.round(Target.y) : "Nezvolen";
        idxInPath.value = drawPathIdx;

        if (Target.en) {
            DrawTarget();            
        }
        if (Robot.en) {
            DrawRobot();
        }
        if (Target.en && Robot.en && Robot.valid && Target.valid) {
            if ((Target.change || Robot.change) && Robot.valid && Target.valid) {
                clearInterval(tim);
                pathGenerated = false;
                Target.change = false;
                Robot.change = false;
                newTryOutPoints = [];
                let res, res1;
                try {
                    res = generatePath([Robot.x, Robot.y, 0], [Target.x, Target.y, 0], 0) //AP, GP, len, limit;
                }
                catch (err) {
                    console.log(err.message);
                    res[0] = -1;
                }
                try {
                    res1 = generatePath([Target.x, Target.y, 0], [Robot.x, Robot.y, 0], 0);
                }
                catch (err) {
                    console.log(err.message);
                    res1[0] = -1;
                }
                //DrawPath(res[0], res[1],"#FF0000");
                if (res[0] > 0 && res[0] < res1[0]) {
                    v = res[0];
                    path = flipArray(res[1]);
                }
                else if(res1[0] > 0){
                    v = res1[0];
                    path = res1[1];
                }
                else{
                    //because JS restricts too deep recursive calls lets try finding a way from "unsuccessful" path points
                    DrawPath(newTryOutPoints.length, newTryOutPoints, "#0000FF");
                    let resultTable = [], trIdx = 0; //PC is fast enought so lets try all :)
                    for (let i = 0; i < newTryOutPoints.length; i++) {
                        res = generatePath(newTryOutPoints[i], [Target.x, Target.y, 0], 0);
                        if (res[0] > 0) {
                            resultTable[trIdx++] = [res[0],res[1]];
                        }
                    }
                    //find min in result table
                    trIdx = 0;
                    if (resultTable.length > 0) {
                        let lastMin = resultTable[0][0];
                        for (let i = 0; i < resultTable.length; i++) {
                            if (resultTable[i][0] < lastMin) {
                                lastMin = resultTable[i][0];
                                trIdx = i;
                            }
                        }
                    } 
                    //there is still posibility to fail but ... (eShrug)
                    DrawPath(newTryOutPoints.length, newTryOutPoints, "#0000FF");
                    v = resultTable[trIdx][0];
                    path = resultTable[trIdx][1];                    
                }

                Target.valid = v > 0 ? true : false;
                res = pathCheckCleanup(v, path);
                v = res[0];
                path = res[1];

                //DrawPath(v, path);

                res = optimizePath(v, path, pathDirection, [Robot.x, Robot.y], [Target.x, Target.y]);
                v = res[0];
                path = res[1];
                pathGenerated = true;
                //DrawPath(res1[0], res1[1], "#FF0000");
                pathLength.innerHTML = v;
                tim = setTimeout(draw, 200);
            }
            if (pathGenerated) {
                DrawPath(v, path);
            }            
        }        
    };

    function DrawTarget() {
        if (Target.x > mapImageW || Target.x < 0 || Target.y > mapImageH || Target.y < 0) {
            Target.valid = false;
        }
        context.fillStyle = Target.valid ? "#00FF00" : "#FF0000";


        locX1 = (Target.x * Target.scaling.W) + startScrollX;
        locY1 = (Target.y * Target.scaling.H) + startScrollY;
        context.fillRect(locX1 - (Target.size * Target.scaling.W) / 2, locY1 - (Target.size * Target.scaling.H) / 2, Target.size * Target.scaling.W, Target.size * Target.scaling.H);
        //if (path.evailable) {
        //    drawPath();
        //}
    };

    function DrawRobot() {
        if (Robot.x > mapImageW || Robot.x < 0 || Robot.y > mapImageH || Robot.y < 0) {
            Robot.valid = false;
        }

        context.fillStyle = Robot.valid ? "#f89b06" : "#FF0000";

        locX1 = (Robot.x * Robot.scaling.W) + startScrollX;
        locY1 = (Robot.y * Target.scaling.H) + startScrollY;
        context.fillRect(locX1 - (Robot.size * Robot.scaling.W) / 2, locY1 - (Robot.size * Robot.scaling.H) / 2, Robot.size * Robot.scaling.W, Robot.size * Robot.scaling.H);

        let rob = document.getElementById("koordsAct");
        rob.innerHTML = "Robot: " + + locX2 + ", " + locY2 + ", ?";
        context.fillStyle = "#ff000";
    };

    function drawImageFromPoints() {
        let sizeX = pixelSize * scaleW, sizeY = pixelSize * scaleH;
        let x = startScrollX;
        if (change) {
            img = generateWorkSpace(img);
        }
        for (let r = 0; r < mapImageH; r++) {            
            for (let c = 0; c < mapImageW; c++) {
                x = startScrollX + c * sizeX;
                y = startScrollY + r * sizeY;
                switch (img[r * mapImageW + c]) {
                    case 0: //free space
                        context.fillStyle = "#f0f0f0";
                        break;
                    case 1: //object
                        context.fillStyle = "#1d1c1c";
                        break;
                    case 2: //object's distance radius
                        context.fillStyle = "#565656";
                        //debuging color
                        //context.fillStyle = "#2d0ff5";
                        break;
                    default:
                        context.fillStyle = "#f0f0f0";
                        img[r * mapImageW + c] = 0;
                        break;
                }
                context.fillRect(x, y, sizeX+1, sizeY+1);                
            }
        }        
    }

    function DrawPath(v, path, col) {
        let color;
        for (let i = 0; i < v; i++) {
            if (path[i] == undefined) {
                continue;
            }
            switch (path[i][2]) {
                case 0: //normal path
                    if (col != undefined) {
                        color = col;
                        break;
                    }
                    color = "#c7fe0c";
                    break;
                case 1: //special point
                    color = "#682dfa";
                    break;
                case 2: 
                    color = "#565656";
                    break;
                case 3:
                    color = "#ffffff";
                default:
                    color = "#f0f0f0";
                    break;
            }
            drawAnyPoint(path[i], color);      
        }
    }

    function mapOpDraw(e) {
        locX2 = Math.floor(((locX - startScrollX) / scaleW));
        locY2 = Math.floor((locY - startScrollY) / scaleH, 1);
        
        if (e.button == mouseBtns.left && !e.ctrlKey || isDrawing) {
            img[locY2 * mapImageW + locX2] = 1;
            objGoal = document.getElementById("objGoal");
            objGoal.innerHTML = "Nová pøekážka na: " + locX2 + ", " + locY2;
            change = true;
            drawOpObjPath[drawOpPathIdx++] = 1;            
        }
        else if (e.button == mouseBtns.left) {
            context.fillRect(startScrollX + locX2 * scaleW, startScrollY + locY2 * scaleH, scaleW, scaleH);
            Robot.x = locX2;
            Robot.y = locY2;
            Robot.scaling.H = scaleH;
            Robot.scaling.W = scaleW;
            Robot.en = true;
            Robot.change = true;
            Robot.valid = true;
            change = true;
            draw();
        }
    }

    function mapEnvSet() {

        if (!runningOnServer) {
            mapImageH = 100;
            mapImageW = 100;            
        }
        else {
            if (mapImage != undefined) {
                //case of using image again (probably not gonna runthrough here :) )
                mapImageH = mapImage.height;
                mapImageW = mapImage.width;
            }
            else
                () => {
                    //TODO ask for map size
                }
            
        }
        
            height = canvas.clientHeight / mapImageH,
            width = canvas.clientWidth / mapImageW;
            scale = Math.min(height, width);
            scaleH = (scale * (canvas.height / canvas.clientHeight)) - 20;
            scaleW = (scale * (canvas.width / canvas.clientWidth)) - 20;
            console.log(scale);
            console.log(mapImageH);
            console.log(mapImageW);
        
        img = mapArrStringToInt(mapStringArray);
        draw();
        modeChange();
    }

    function modeChange() {
        switch (mapMode) {
            case mapModes[0]:
                canvas.style.cursor = "grab";
                pointSel.style.backgroundColor = "lightgrey";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "#23ff01";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[1]:
                canvas.style.cursor = "crosshair";
                pointSel.style.backgroundColor = "#23ff01";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "lightgrey";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[2]:
                canvas.style.cursor = "help";
                pointSel.style.backgroundColor = "lightgrey";
                infoBut.style.backgroundColor = "#23ff01";
                move.style.backgroundColor = "lightgrey";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[3]:
                canvas.style.cursor = "crosshair";
                drawObject.style.backgroundColor = "#23ff01";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "lightgrey";
                pointSel.style.backgroundColor = "lightgrey";
                break;
            default:
                mapMode = mapModes[0];
                modeChange();
                break;
        }
    }

    function generateWorkSpace(img1) {
        let WSmap = [];        
        for (let r = 0; r < mapImageW ; r++) {
            for (let c = 0; c < mapImageH; c++) {                
                if (img1[r * mapImageW + c] == 1) {
                    WSmap[r * mapImageW + c] = 1;
                    for (let i = r - RobotSizeWS; i <= r + RobotSizeWS; i++) {
                        for (let j = c - RobotSizeWS; j <= c + RobotSizeWS; j++) {
                            if (i >= 0 && i < mapImageW && j >= 0 && j < mapImageH) {
                                if (img1[i * mapImageW + j] != 1) {
                                    WSmap[i * mapImageW + j] = 2;                                  
                                }
                            }                            
                        }
                    }
                }                
            }
        }
        change = false;
        return WSmap;
    }

    function drawAnyPoint( p , col) {
        let sizeX = pixelSize * scaleW, sizeY = pixelSize * scaleH;
        context.fillStyle = col;
        let x = Math.round(startScrollX + p[0] * scaleW, 1);
        let y = Math.round(startScrollY + p[1] * scaleH, 1);
        context.fillRect(x, y, sizeX + 1, sizeY + 1);
    }

    function generatePath(AP, GP, d) { //v2.0 //may get you from actual point to goal point
        let val = img[AP[1] * mapImageW + AP[0]];
        let NP = [];
        let res = [];
        let vPath = [];
        let lastRes = mapImageH * mapImageW;
        let depth = d++;
        
        //if () { return [-5, 0]; }
        if (val == 1 || val == 2 || val == 3) {
            return [-1, 0]; // may be faster
        }
        if (AP[0] < 0 || AP[1] < 0 || AP[0] > mapImageW || AP[1] > mapImageH) {
            return [-1, 0];
        }
        else if (AP[0] == GP[0] && AP[1] == GP[1]) { //probably never happens but in case :)
            let value = 0; 
            vPath[value++] = AP;    
            return [value, vPath];
        }
        else if (val == 0) {
            if (depth % 200 == 0) { //every 50th steps of omnidirectional search safe a point
                newTryOutPoints[newTryOutPoints.length] = AP;
            }
            img[AP[1] * mapImageW + AP[0]] = 3;
            let dir = [GP[0] - AP[0], GP[1] - AP[1]]; //direction vector
            let len = Math.round(Math.sqrt(dir[0] ** 2 + dir[1] ** 2), 1);
            let a = [dir[0] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2), dir[1] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2)]; //normalized direction vector
            let result = followVector(a, AP, GP, len);
            if (result[0] > 1) {
                return [result[0] + 1, flipArray(result[1])];
            }
            else if (result[0] < -1) {
                AP[1] = result[1][- result[0] - 1][1];
                AP[0] = result[1][- result[0] - 1][0];
            }
            
            a = [Math.round(a[0]), Math.round(a[1])]; //rounded and normalized dir. vector
            NP = [AP[0] + a[0], AP[1] + a[1], 0]; //next point on dir. vect.
            //drawAnyPoint(AP, "#FF0000"); //red at poiont of call;
            res = generatePath(NP, GP, depth);
            if (res[0] > 0 ) {
                vPath = res[1];
                vPath[res[0]++] = AP;
                return [res[0], vPath];
            }
            
            for (let i = 0; i < fid.length; i++) {                
                let fi = (3.14 / 180) * fid[i];
                r = [Math.cos(fi), -Math.sin(fi), Math.sin(fi), Math.cos(fi)]; //mat. of rotation
                let pos = matrixMull(r, [2, 2], a, [1, 2]);
                NP[0] = AP[0] + Math.round(pos[0], 1);
                NP[1] = AP[1] + Math.round(pos[1], 1);
                NP[2] = 0;
                res = generatePath(NP, GP, depth);

                if (res[0] > 0) {
                    lastRes = res[0] - result[0];
                    vPath = pathJoin(res[1], flipArray(result[1]));
                    vPath = pathJoin(vPath, [AP]);
                    return [vPath.length, vPath];                    
                }
            }
        }
    return [-1, 0];
    }
        
    function followVector(a, SP, GP, len) {   
        /* follows the vector defined by GP - SP
         * a - normalized direction vector
         * SP - start point
         * GP - goal point
         * len - maximal length of vector
         * 
         * return:
         *  1)
         *      - positive value of steps if GP is reached
         *      - negative value if any obstacle is in the way to reach the GP
         *  2)
         *      - array of points taken while following the vector
         *       format:
         *       [i] = [x,y,value]
         *       i..index
         *       x.. x position
         *       y.. y position
         *       value.. value of importance (def. = 0)  
         */
        let  way = [[0],[0]];
        for (let c = 0; c < len; c++) {
            let A = [], B = [];
            B[0] = SP[0] + (c + 1) * a[0];
            B[1] = SP[1] + (c + 1) * a[1];
            A[0] = Math.round(B[0], 1);
            A[1] = Math.round(B[1], 1);
            A[2] = 0;
            let im = img[A[1] * mapImageW + A[0]];
            if (im == 1 || im == 2) {
                //obstacle
                return [-c, way];
            }
            else if (A[0] == GP[0] && A[1] == GP[1]) {
                //goal reached
                return [c, way];
            }
            else if (A[0] < 0 || A[1] < 0 || A[0] > mapImageW - 1 || A[1] > mapImageH - 1) {
                //another step will be out of map...
                return [c, way];
            }
            way[c] = A;
        }
        console.log("run outside the for cy (followVector)");
        //return [-1, 0]; TODO test this. Did we ever run over the GP?
    }

    function cleanMap() {
        for (let r = 0; r < mapImageH; r++) {
            for (let c = 0; c < mapImageW; c++) {
                img[r * mapImageH + c] = img[r * mapImageH + c] == 3 ? 0 : img[r * mapImageH + c];
            }
        }
    }

    function matrixMull(a, [m,n], b, [m1,n1]) {
        let c = [];
        c[0] = a[0] * b[0] + a[1] * b[1];
        c[1] = a[2] * b[0] + a[3] * b[1];
        return c;
    }

    function optimizePath(len, wayE, direction, startPoint, goalPoint) {//v2
        //return [len, wayE];
        if (len < 0) {
            return [len, wayE]; //if path was not find by previous fcn
        }
        if (direction == "ES") { // switch direction if shorter way has E->S direction
            wayE = flipArray(wayE);
            direction = "SE";
        }

        way = pathJoin([startPoint], wayE);
        way = pathJoin(way, [goalPoint]);

        let newWay = [[1,1,1]], tempNewWay = [];
        let GP, SP, nextSPidx = 0; 
        for (let s = 0; s < way.length-1; s++) {//s ... start point
            SP = way[s];
            newWay[newWay.length-1][0] = SP[0];
            newWay[newWay.length-1][1] = SP[1];
            nextSPidx = 0;
            for (let e = s + 2; e < way.length; e++) { //e ... end point, skip one point(we know we can get there from prev...)
                GP = way[e];
                let dir = [GP[0] - SP[0], GP[1] - SP[1]]; //direction vector
                if (dir[0] == 0 && dir[1] == 0) {
                    console.log("SP==GP");
                    break;
                }
                let a = [dir[0] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2), dir[1] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2)]; //normalized direction vector
                /* going point-by-point through the path
                * if the GP point is reached points in way between SP and GP can be skiped and substitute by path from SP to GP
                * the same ocures if GP == goal point (global Goal of input path)
                * if we can't reach the GP we can try another point of the way until the last point (goal point)
                */
                let res = followVector(a, SP, GP, maxVectorLen);
                if (res[0] > 0) {
                    //in this case we only need result where we can reach the GP
                    nextSPidx = e; // next SP will be the last reached GP 
                    tempNewWay = res[1];
                    tempNewWay[tempNewWay.length - 1][2] = 1; //the last GP's value rise because there is probably some corner of the obstacle
                    //DrawPath(tempNewWay.length, tempNewWay);
                }
            }
            //if we reached the end of path by the GP we can try another points in way by assigning them as SP      
            newWay = pathJoin(newWay, tempNewWay);
            s = nextSPidx > 1 ? nextSPidx -1 : s;
        }
        return [newWay.length, newWay];
    }    

    function pathJoin(a, b) {
        let arr = []
        for (let i = 0; i < a.length; i++) {
            arr[i] = a[i];
        }
        const k = a.length;
        for (let j = 0; j < b.length; j++) {
            arr[k + j] = b[j];
        }
        return arr;
    }

    function flipArray(p) {
        let arr = [];
        for (let i = 0; i < p.length; i++) {
            arr[i] = p[p.length - 1 - i];
        }
        return arr;
    }

    function pathCheckCleanup(l, p) {
    let a = [], k = 0; 
    for (let i = 0; i < l; i++) {
        if (p[i] == undefined) {
            continue;
        }
        if (p[i][0] == undefined || p[i][1] == undefined) {
            continue;
        }

        a[k++] = p[i];
        if (p[i][2] == undefined) {
            a[k][2] = 0;
        }        
    }
    return [a.length, a];
}

    function mapArrStringToInt(str) {
        //changes string to array of int
        let im = [];
        for (let i = 0; i <= mapImageW * mapImageH; i++) {
            switch (str[i]) {
                case '0':
                    im[i] = 0;
                    break;
                case '1':
                    im[i] = 1;
                    break;
                default:
                    im[i] = 0;
                    break; 
            }              
        } 
        return im;
    }

});



/*
    function optimizePath(len, way, direction, startPoint, goalPoint) {//v1.0
        if (len < 0) {
            return [len, way]; //if path was not find by previous fcn
        }

        if (way[0][0] == goalPoint[0] && way[0][1] == goalPoint[1]) { // switch direction if shorter way has E->S direction
            GP = startPoint;
        }

        let nextIdx = 0, ok = false, done = false, wayVect = [[0], [0]], newWay = [], newWayE = [], breakPoints = 0, SP;
        newWay[0] = startPoint; newWayE[0] = startPoint;
        for (let i = 0; i < len - 1; i++) { //for cycle for start point (looking point)
            if (i > way.length || done || newWayE[i] == undefined) { 
                //if startPoint's index is larger than path array, or smaller than map
                break;
            }
            SP = newWayE[i];
            ok = false;
            for (let j = i+2; j < len; j++) {//for cycle for horizon point 
                if (j < nextIdx) {
                    //next index depends on last find horizon, so if next index is between last start point and horizon index is enlarged
                    j = nextIdx + 1;
                    continue;
                }
                if (j > len) {
                    break;
                }
                let tGP = way[j];
                let dir = [tGP[0] - SP[0], tGP[1] - SP[1]]; //direction vector
                let a = [dir[0] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2), dir[1] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2)]; //normalized direction vector
                ok = false;
                for (let c = 0; c < mapImageW; c++) {
                    let A = [],B = [];
                    B = [startPoint[0] + (c+1) * a[0], startPoint[1] + (c+1) * a[1]];
                    A = [Math.round(B[0], 1), Math.round(B[1], 1), 0];
                    wayVect[c] = A;
                    drawAnyPoint(A, "#FF0000");
                    let val = img[A[1] * mapImageW + A[0]];
                    if (val == 1 || val == 2) {
                        ok = true;
                        break;
                    }
                    else if (A[0] == tGP[0] && A[1] == tGP[1]) {
                        wayVect[c][2] = 1; //pathValue at 
                        newWay[i] = wayVect;
                        newWayE[i + 1] = A;
                        wayVect = [0,0,0];                        
                        nextIdx = j;

                        
                        break;
                    }
                    else if (A[0] == goalPoint[0] && A[1] == goalPoint[1]) {
                        newWay[i] = wayVect;
                        done = true;
                        break;
                    }
                }                
            }
            breakPoints++; 
        }
        //concat newWay into one triplet-array
        let pathWay = [];
        for (let k = 0; k < newWay.length; k++) {
            pathWay = pathWay.concat(newWay[k]);
        }
        newWay = pathWay;

        //clear away the same points "in row" from array
        for (let i = 0; i < newWay.length; i++) {
            for (let j = 0; j < newWay.length - 1; j++) {
                if (newWay[i][0] != newWay[j][0] && newWay[i][1] != newWay[j][1]) { break; }
                else {
                    newWay[j][0] = -1;//change the same points value to -1
                    newWay[j][1] = -1;
                }
            }
        }
        let a, k = 0;
        pathWay = [];
        for (let i = 0; i < newWay.length - 1; i++) {
            for (let j = 0; j < newWay.length - 1; j++) {
                a = newWay.shift();
                if (a[0] > -1, a[1] > -1) {
                    pathWay[k++] = a; //clear all the -1's out of the path;
                }
            }
        }
        return [pathWay.length, pathWay];
    }
    */

/*
    function generatePath(AP, GP, len, limit) { //v1.0
        len += 1; 
        let vPath = [[],[],[]];
        let value;
        let minIdx = -1;
        let Val = -5;
        let res = -5;
        if (len > limit) {
            img[AP[1] * mapImageW + AP[0]] = 0;
            value = -5;
            return [value, null];
        }  
        drawAnyPoint(AP, "#FF0000");  
                  
        let dir = [GP[0] - AP[0], GP[1] - AP[1]]; //direction vector
        let a = [dir[0] / Math.sqrt(dir[0]**2 + dir[1]**2), dir[1] / Math.sqrt(dir[0]**2 + dir[1]**2)];
        a = [Math.round(a[0]), Math.round(a[1])]; //normalized dir. vector
        let NP = [AP[0] + a[0], AP[1] + a[1] , 0]; //next point on dir. vect.
        Val = img[NP[1] * mapImageW + NP[0]]; //value of point in the map at next point loc.
        if (NP[0] == GP[0] && NP[1] == GP[1]) { //if next point is a goal            
            vPath[0][value] = NP[0];    //x
            vPath[1][value] = NP[1];    //y
            vPath[2][value] = NP[2];    //pathWeightVal
            value = 1;
            return [value, vPath];
        }
        else if (Val == 0 || Val == undefined) {
            img[NP[1] * mapImageW + NP[0]] = 3;
            res = generatePath(NP, GP, len, limit);
            let resultValue = res[0];
            if (resultValue > 0) {                
                vPath = res[1];
                vPath[0][resultValue] = NP[0];   
                vPath[1][resultValue] = NP[1];   
                vPath[2][resultValue] = NP[2];
                value = resultValue + 1;
                img[NP[1] * mapImageW + NP[0]] = 0;
                drawAnyPoint(NP, "#00FF00"); 
                return [value, vPath];
            }
            else if (resultValue == -5) {
                vPath = -1;
                value = -5;
                img[NP[1] * mapImageW + NP[0]] = 0;
                return [value, vPath];
            }
            else if (resultValue == -1) {
                img[NP[1] * mapImageW + NP[0]] = 3;
            }
        }
        let dirValue = [];
        let dirPath = [];

        for (let i = 0; i < fid.length; i++) {
            let fi = (3.14 / 180) * fid[i];
            let r = [Math.cos(fi), -Math.sin(fi), Math.sin(fi), Math.cos(fi)];
            let pos = matrixMull(r, [2, 2], a, [1, 2]);
            NP[0] = AP[0] + Math.round(pos[0], 1);
            NP[1] = AP[1] + Math.round(pos[1], 1);
            if (NP[0] < 0 || NP[0] > mapImageW || NP[1] < 0 || NP[1] > mapImageH || NP == AP) {
                dirValue[i] = -1;
                continue;
            }
            Val = img[NP[1] * mapImageW + NP[0]]; //value of point in the map at next point loc.
            if (NP[0] == GP[0] && NP[1] == GP[1]) { //if next point is a goal
                dirValue[i] = 1;
                dirPath[i][0][dirValue[i]] = NP[0];    //x
                dirPath[i][1][dirValue[i]] = NP[1];    //y
                dirPath[i][2][dirValue[i]] = NP[2];    //weight
                return [value, dirPath[i]];
            }
            else if (Val == 1 || Val == 2) {
                dirValue[i] = -1;                
                continue;
            }
            else if (Val == 0 || Val == undefined) {
                img[NP[1] * mapImageW + NP[0]] = 3;                
                res = generatePath(NP, GP, len, limit);
                drawAnyPoint(NP, "#0000FF"); 
                let resultValue = res[0];
                if (resultValue > 0) {
                    dirValue[i] = resultValue;
                    dirPath[i] = res[1];
                    dirPath[i][0][dirValue[i]] = NP[0];    //x
                    dirPath[i][1][dirValue[i]] = NP[1];    //y
                    dirPath[i][2][dirValue[i]] = NP[2];    //weight
                    dirValue[i] = resultValue + 1;
                    img[NP[1] * mapImageW + NP[0]] = 0;
                    //return [value, path];
                }
                else if (resultValue == -5) {                    
                    dirValue[i] = -5;
                    img[NP[1] * mapImageW + NP[0]] = 0;
                    //return [value, path];
                }
                else if (resultValue == -1) {
                    img[NP[1] * mapImageW + NP[0]] = 0;
                }
            }
        }

        for (let i = 0; i < dirValue.length; i++) {
            let minValue = 10000;            
            if (dirValue[i] > 0 && dirValue[i] < minValue && dirValue[i] != null ) {
                minValue = dirValue;
                minIdx = i;
            }
        }

        if (minIdx < 0) {
            return [-5, -1];
        }
        drawAnyPoint(NP, "#0000FF"); 
        return [dirValue[minIdx], dirPath[minIdx]];
    }
    */

