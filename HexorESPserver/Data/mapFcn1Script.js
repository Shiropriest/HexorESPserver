/*
 by: Tomáš Hmiro
 31. 01. 2024 
 for: HEXOR II - TUL diploma

 part 3

This file contains part of functions for mapScript
functions for:
    drawing points into canvas
*/

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
    let lX1 = locX1 - (Robot.size * scaleW) / 2;
    let lY1 = locY1 - (Robot.size * scaleH) / 2;
    context.fillRect(lX1, lY1, Robot.size * scaleW, Robot.size * scaleH);
    let pointSizeX = (Robot.size * scaleW)/ 8;
    let pointSizeY = (Robot.size * scaleH)/ 8;

    context.fillStyle = "#00ff00";
    context.fillRect((lX1 + pointSizeX * 8) + (3 * Robot.size / 8) * Math.cos(Robot.rot + 3.14 / 2), (lY1 + pointSizeY*8)+ (3 * Robot.size / 8) * Math.cos(Robot.rot + 3.14 / 2), pointSizeX, pointSizeY);

    let rob = document.getElementById("koordsAct");
    rob.innerHTML = "Robot: " + + Robot.x + ", " + Robot.y + ", ?";
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

function drawAnyPoint( p , col) {
    let sizeX = pixelSize * scaleW, sizeY = pixelSize * scaleH;
    context.fillStyle = col;
    let x = Math.round(startScrollX + p[0] * scaleW, 1);
    let y = Math.round(startScrollY + p[1] * scaleH, 1);
    context.fillRect(x, y, sizeX + 1, sizeY + 1);
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
    let locX2 = Math.floor(((locX - startScrollX) / scaleW));
    let locY2 = Math.floor((locY - startScrollY) / scaleH, 1);
        
    if (e.button == mouseBtns.left && !e.ctrlKey || isDrawing) {
        img[locY2 * mapImageW + locX2] = 1;
        objGoal = document.getElementById("objGoal");
        objGoal.innerHTML = "Nová překážka na: " + locX2 + ", " + locY2;
        change = true;
        drawOpObjPath[drawOpPathIdx++] = 1;
        Target.change = true;
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