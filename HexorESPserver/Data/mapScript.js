document.addEventListener("DOMContentLoaded", () => {
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
     * TODO:
     * 1) info button -> color legend & more
     * 2) saving map to cookies or other temp PC/phone memmory
     * 3) add touchscreen compatibility 
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
    const dirBtns = [];
    const downSizing = 10;
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
    let img, genMesh = false, pathGenerated = false;
    let mapColors = {
        path: "#c7fe0c", cornerPoints: "#682dfa", robot: "#f89b06", target: "#00FF00",
        obstacles: "#1d1c1c", workspace: "#565656", pathTouched: "#111111",
        pointVal2: "#565656", highlightedPoint: "#FF0000", triedPath: "#70ff00",
        beforeOptimalization: "#FF00FF", freeSpace: "#f0f0f0", pointVal3: "#0f0f0f"
    };

    //debugging purpose variables:
    let runningOnServer = false;
    let drawPathIdx = 0, drawOpPathIdx = 0, drawOpObjPath = [];
    //debug but possibly useful
    const idxInPath = document.getElementById("idxInPath");
    const pathLength = document.getElementById("pathLength");
    const resetIdx = document.getElementById("resetIdx");

    //# in setKeys array for setting a keybinding TODO - share with page JS
    const forward = 0,
        back = 1,
        left = 2,    
        right = 3,
        stop = 4,
        mode1 = 5, //teleoprator
        mode2 = 6, //semiauto
        mode3 = 7, //auto
        mode4 = 8; //presentation

    const setKeys = ['w', 's', 'a', 'd', ' ', 'g', 'h', 'j', 'k'];

    /*%ROS%*/ //if runnging on server this will be rewrited by preprocesor and be that set to TRUE (for offline debug purpose)
    /*%RS%*/ //robot size based on program in ESP if connected to Robot
    let mapStringArray;
    if (!runningOnServer) {
        mapStringArray = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110011111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000001110000000000000000000000001111000000000000000000000000000000000000000000000000000000000000010000000011100000000000000000000001111111111000000000000000000000000000000000000000000000000000000001000000000110000000000000000000000111101111111000000000000000000000000000000000000000000000000000000110000000011000000000000000000000011110001111110000000000000000000000000000000000000000000000000000001100000001100000000000000000000001110000000111000000000000000000000000000000000000000000000000000000111100001100000000000000000000000111000000001110000000000000000000000000000000000000000000000000000000111111100000000000000000000000011100000000111000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011100000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000011100000000000000000000000000000000000000000000000000000000000000000000000000000000000011111000000001111000000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000001111100000000000000011100000000000000000000000000000000000000000000000000000000000000000000000000011111100000000000000000110000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000000000011100000000000000000000000000000000000000000000000000000000000000000000001111100000000000000000000000111000000000000000000000000000000000000000000000000000000000000000000011111100000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000011111000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000011110000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000001111000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000001111100000000000000000000000000000000000000000000000000000000000000000011100000000000000000000000011111000000000000000000000000000000000000000000000000000000000000000000001111100000000000000000000111110000000000000000000000000000000000000000000000000000000000000000000000011111000000000000000001111100000000000000000000000000000000000000000000000000000000000000000000000000111110000000000000011110000000000000000000000000000000000000000000000000000000000000000000000000000011111100000000001111100000000000000000000000000000000000000000000000000000000000000000000000000000000111110000000111111000000000000000000000000000000000000000000000000000000000000000000000000000000000001111100001111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110000111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111001111100000000000000000000000000000000000000000000000000000000000000000000000000011111111111111100000011111000000000000000000000000000000000000000000000000000000000000000000000011111111111111000000000001111110000000000000000000000000000000000000000000000000000000000000000000111111111111000000000000000011111100000000000000000000000000000000000000000000000000000000000000111111111111000000000000000000000111111000000000000000000000000000000000000000000000000000011111111111111111100000000000000000000000001111110000000000000000000000000000000000000100000011111111111111111111100000000000000000000000000000111111000000000000000000000000000000000000011111111111111111111111100000000000000000000000000000000001111110000000000000000000000000000000000011111111111111111111000000000000000000000000000000000000000001111100000000000000000000000000000000001111111111111000000000000000000000000000000000000000000000000011111000000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000111110000000000000000000000000000000011110000000000000000000000000000000000000000000000000000000000001111100000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000001111000000000000000000000000000000111110000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000111100000000000000000000000000000000000000000000000000000000000000001110000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000011100000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000000001111000000000000000000000000001111111000000000000000000000000000000000000000000000000000000000000000011100000000000000000000001111111011100000000000000000000000000000000000000000000011111111111111111111111000000000000000000000100000001111000000000000000000000000000000000000000111111111111111111111111111100000000000000000000000000000011110000000000000000000000000000000111111111111111111111111111111111111000000000000000000000000000001111000000000000000001111111111111111111111111111000000011111111111111100000000000000000000000000000111110000000011111111111111111111111111111000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

        scripInit();
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
        drawAnyPoint(path[drawPathIdx++], mapColors.highlightedPoint);
        drawPathIdx = drawPathIdx < Number(pathLength.innerHTML)-1 ? drawPathIdx : 0;
        idxInPath.value = drawPathIdx;
    });

    document.addEventListener("keypress", (e) => {
        let BtnRobot = document.getElementById("MMrobot");
        a = BtnRobot.style.backgroundColor;
        if (!runningOnServer && a == "rgb(35, 255, 1)") {
            let mDirection = -1;
                switch (e.key) {
                    case setKeys[left]:
                        console.log('left');
                        mDirection = 3;
                        break;
                    case setKeys[back]:
                        console.log('back');
                        mDirection = 7;
                        break;
                    case setKeys[right]:
                        console.log('right');
                        mDirection = 5;
                        break;
                    case setKeys[forward]:
                        console.log('fwd');
                        mDirection = 1;
                        break;
                    case setKeys[stop]:
                        console.log('stop');

                        break;
                    case setKeys[mode1]:
                        console.log('mode1');

                        break;
                    case setKeys[mode2]:
                        console.log('mode2');

                        break;
                    case setKeys[mode3]:
                        console.log('mode3');

                        break;
                    case setKeys[mode4]:
                        console.log('mode4');
                        break;
                    default:
                        break;
            }
            moveRobot(e, mDirection);
        }
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

        drawLegend();

        if (!runningOnServer) {
            //context.drawImage(mapImage, startScrollX, startScrollY, mapImageW * scaleW, mapImageH * scaleH);
        }
        //draw img at shifted plane in selected zoom scale

        maxVectorLen = Math.sqrt(mapImageH ** 2 + mapImageW ** 2);
        drawImageFromPoints();
        Goal = document.getElementById("koordsGoal");
        Goal.innerHTML = "Cíl: ";
        Goal.innerHTML += Target.en ? "" + Math.round(Target.x) + ", " + Math.round(Target.y) : "Nezvolen";
        idxInPath.value = drawPathIdx;
        let path1 = [];

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
                v = 0;
                //newTryOutPoints = [];
                let res = [], res1 = [];
                try {
                    clearMap();
                    res = generatePath([Robot.x, Robot.y, 0], [Target.x, Target.y, 0], 0) //AP, GP, len, limit;
                    
                }
                catch (err) {
                    console.log(err.message);
                    res[0] = -1;
                }
                try {
                    clearMap();
                    res1 = generatePath([Target.x, Target.y, 0], [Robot.x, Robot.y, 0], 0);
                    
                }
                catch (err) {
                    console.log(err.message);
                    res1[0] = -1;
                }
                if (res[0] > 0 && res[0] < res1[0]) {
                    v = res[0];
                    path = flipArray(res[1]);
                }
                else if (res1[0] > 0) {
                    v = res1[0];
                    path = res1[1];
                }
                else if (res[0] < 0 && res1[0] < 0) {
                    /* trying point mesh pathfinding
                     * in mesh made by x*smaller map (every x by x pixels there is one "point")
                     * finding path in this setup by path finding function 
                     * trying every point in this mesh if it is reachable by robot and if there is path from it to the target
                     * because there will probably be more than just one point that fulfill these conditions we must select just the shortest one from them
                     * POSIBILITY TO IMPROVE:
                     * if we have enough computing power we should probably try to siplify all the paths and then select the shortest one.
                     */                      
                        let r1 = [], r2 = [], po = [], pointMesh = [], arrayOfGenPaths = [[]], k = 0;                 //[x,y, basic validity]
                        for (let i = downSizing; i < mapImageH; i += downSizing) {
                            for (let j = downSizing; j < mapImageW; j += downSizing) {
                                po = [j, i, 0];
                                clearMap(); 
                                try {
                                    r1 = generatePath(po, [Target.x, Target.y], 0);
                                }
                                catch (err) {
                                    console.log(err.message);   //point from mesh to end
                                    continue;
                                }
                                                                   
                                clearMap();   
                                try {
                                    r2 = generatePath([Robot.x, Robot.y], po, 0); //from robot to mesh point
                                }
                                catch (err) {
                                    console.log(err.message);   //point from mesh to end
                                    continue;
                                }                                                                      
                                if (r1[0] > 0 && r2[0] > 0) {
                                    //DrawPath(r1[1].length, r1[1], "#70ff00");
                                    //only if there is point from which we can get to end we check that we can get from start to the mesh point                                    
                                    arrayOfGenPaths[k] = pathJoin(flipArray(r2[1]), flipArray(r1[1]));
                                    DrawPath(arrayOfGenPaths[k].length, arrayOfGenPaths[k++], mapColors.triedPath);
                                }
                            }
                        }
                        let p = (mapImageW * mapImageH)**2, idx = 0;
                        for (let i = 0; i < arrayOfGenPaths.length; i++) {
                            if (arrayOfGenPaths[i].length < p) {
                                idx = i;
                                p = arrayOfGenPaths[i].length;
                            }
                        }
                        v = arrayOfGenPaths[idx].length;
                        path = arrayOfGenPaths[idx];
                    
                    
                    //finding shortes combined path
                    
                }
                else {
                    v = res[0];
                    path = flipArray(res[1]);
                }

                Target.valid = v > 0 ? true : false;
                res = pathCheckCleanup(v, path);
                v = res[0];
                path = res[1];

                path = pathJoin([[Robot.x, Robot.y, 1]], path);
                path = pathJoin(path, [[Target.x, Target.y, 1]]);

                DrawPath(v, path, mapColors.beforeOptimalization);

                clearMap();
                res = optimizePath(v, path, pathDirection, [Robot.x, Robot.y], [Target.x, Target.y]);                
                v = res[0];
                path = res[1];
                pathGenerated = v > 0 ? true : false;
                //DrawPath(res1[0], res1[1], "#FF0000");
                pathLength.innerHTML = v;
                tim = setTimeout(draw, 200);
            }
            if (pathGenerated) {
                DrawPath(v, path);
                
            }
            else {
                console.log("Pathfinding failed!");
            }
        }        
    };

    function DrawTarget() {
        if (Target.x > mapImageW || Target.x < 0 || Target.y > mapImageH || Target.y < 0) {
            Target.valid = false;
        }
        context.fillStyle = Target.valid ? mapColors.target : mapColors.highlightedPoint;

        locX1 = (Target.x * scaleW) + startScrollX;
        locY1 = (Target.y * scaleH) + startScrollY;
        context.fillRect(locX1 - (Target.size * scaleW) / 2, locY1 - (Target.size * scaleH) / 2, Target.size * scaleW, Target.size * scaleH);
        //if (path.evailable) {
        //    drawPath();
        //}
    };

    function DrawRobot() {
        if (Robot.x > mapImageW || Robot.x < 0 || Robot.y > mapImageH || Robot.y < 0) {
            Robot.valid = false;
        }

        context.fillStyle = Robot.valid ? mapColors.robot : mapColors.highlightedPoint;

        locX1 = (Robot.x * scaleW) + startScrollX;
        locY1 = (Robot.y * scaleH) + startScrollY;
        context.fillRect(locX1 - (Robot.size * scaleW) / 2, locY1 - (Robot.size * scaleH) / 2, Robot.size * scaleW, Robot.size * scaleH);

        let rob = document.getElementById("koordsAct");
        rob.innerHTML = "Robot: " + + locX2 + ", " + locY2 + ", ?";
        //context.fillStyle = "#ff000";
    };

    function drawImageFromPoints() {
        let sizeX = pixelSize * scaleW, sizeY = pixelSize * scaleH;
        let x = startScrollX;

        context.clearRect(0, 0, canvas.width, canvas.height);
        if (change) {
            img = generateWorkSpace(img);
        }
        for (let r = 0; r < mapImageH; r++) {            
            for (let c = 0; c < mapImageW; c++) {
                x = startScrollX + c * sizeX;
                y = startScrollY + r * sizeY;
                switch (img[r * mapImageW + c]) {
                    case 0: //free space
                        context.fillStyle = mapColors.freeSpace;
                        break;
                    case 1: //object
                        context.fillStyle = mapColors.obstacles;
                        break;
                    case 2: //object's distance radius
                        context.fillStyle = mapColors.workspace;
                        //debuging color
                        //context.fillStyle = "#2d0ff5";
                        break;
                    case 3: //object's distance radius
                        context.fillStyle = mapColors.pathTouched;
                        //debuging color
                        //context.fillStyle = "#2d0ff5";
                        break;
                    default:
                        context.fillStyle = mapColors.freeSpace;
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
                    color = mapColors.path;
                    break;
                case 1: //special point
                    color = mapColors.cornerPoints;
                    break;
                case 2:
                    color = mapColors.pointVal2;
                    break;
                case 3:
                    color = mapColors.pointVal3;
                default:
                    color = mapColors.highlightedPoint;
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
        drawLegend();
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
        let depth;
        let preciseEnd = false;

        if (d == undefined || d < 0) {
            d = 1;
        }
        else {
            depth = d++;
        }
        
        //if () { return [-5, 0]; }
        if (val == 1 || val == 2)// || val == 3) 
        {
            return [-1, 0]; // may be faster
        }
        if (AP[0] < 0 || AP[1] < 0 || AP[0] > mapImageW || AP[1] > mapImageH) {
            //out of map exception
            return [-1, 0];
        }
        else if (AP[0] == GP[0] && AP[1] == GP[1]) { //probably never happens but in case :)
            let value = 0; 
            vPath[value++] = AP;    
            return [value, vPath];
        }
        else if (val == 0) {     
            // if AP is obstacle free we can continue finding a path from this point
            //  if we can we can go directly from actual point to end
            img[AP[1] * mapImageW + AP[0]] = 3;            
            let dir = [GP[0] - AP[0], GP[1] - AP[1]]; //direction vector
            let len = Math.round(Math.sqrt(dir[0] ** 2 + dir[1] ** 2), 1);
            let a = [dir[0] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2), dir[1] / Math.sqrt(dir[0] ** 2 + dir[1] ** 2)]; //normalized direction vector
            let result = [];
            result = followVector(a, AP, GP, len);
            if (result[0] > 1) {
                return [result[0] + 1, flipArray(result[1])];
            }
            else if (result[0] < -1) {
                AP[1] = result[1][- result[0] - 1][1];
                AP[0] = result[1][- result[0] - 1][0];
            }
            //vector path get on obstacle continue trying other directions
            a = [Math.round(a[0]), Math.round(a[1])]; //normalized and rounded dir. vector             
            NP = [AP[0] + a[0], AP[1] + [1], 0]; //next point on dir. vect.   
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
                    vPath = pathJoin( res[1],[AP]);
                    vPath = pathJoin(vPath,flipArray(result[1]));                    
                    return [vPath.length, vPath];                    
                }
            }
        }
    return [-1, 0];
    }
        
    function followVector(a, SP, GP, len) {   
        /* follows the vector defined by GP - SP
         * a - normalized direction vector (used here as input because it is often used outside this function call so it can be just send and not calculated again)
            TODO - posibility to calculate it inside (not so important!)
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
        let  way = [];
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

        let newWay = [[],[],[]], tempNewWay = [];
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

    function clearMap() {
        for (let i = 0; i < mapImageH * mapImageW; i++) {           
            img[i] = img[i] == 3 ? 0 : img[i];
        }
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
            a[k-1][2] = 0;
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

    function drawLegend() {
        let pH = document.getElementById("pHcl1b");
        let d = document.getElementById("legend");
        if (mapMode != mapModes[2]) {
            
            if (d != undefined) {
                pH.removeChild(d);
            }
            return;
        }
        if (d == undefined) {
            let div = document.createElement("div");
            let legendH2 = document.createElement("h2");
            legendH2.innerHTML = "Legend for map";
            let list = document.createElement("ul");
            for (let colors in mapColors) {
                let item = document.createElement("li");
                item.innerHTML = colors;
                item.style.textShadow = "0px 0px 5px #000000";            
                item.style.color = mapColors[colors];

                list.appendChild(item);
            }
            list.style.marginTop = "1px";
            div.appendChild(legendH2);
            div.appendChild(list);
            div.style.overflow = "hidden";
            div.id = "legend";
            pH.appendChild(div);
        }        
    } 

    //functions for testing
    function testingButtonMovement() {

    }

    function scripInit() {
        for (let i = 1; i < 10; i++) {
            let btnName = "dirButton" + i;
            dirBtns[i - 1] = document.getElementById(btnName);
            dirBtns[i - 1].addEventListener("click", (e) => {
                moveRobot(e, i - 1);
            });
        }
        
    }

    function moveRobot(e, i) {
        let BtnRobot = document.getElementById("MMrobot");
        console.log(BtnRobot.style.backgroundColor);
        if (!runningOnServer && BtnRobot.style.backgroundColor == "rgb(35, 255, 1)") {
            switch (i) { //change Robot location by incrementing
                case 0: //[-1,1] 
                    break;
                case 1: //[0,1]
                    Robot.y--;
                    break;
                case 2: //[1,1]
                    break;
                case 3: //[-1,0]
                    Robot.x--;
                    break;
                case 4: //[0,0] STOP!
                    break;
                case 5: //[1,0]
                    Robot.x++;
                    break;
                case 6: //[-1,-1]
                    break;
                case 7: //[0,-1]
                    Robot.y++;
                    break;
                case 8: //[1,-1]
                    break;
                default:
                    break;
            }
            Robot.change = true;
        }
    }

});
