/*
 by: Tomáš Hmiro
 31. 01. 2024 
 for: HEXOR II - TUL diploma

 part 4

This file contains part of functions for mapScript
functions for:
    generating path,
    clearing the map after pathfinding 
*/
function mapEnvSet() {

    if (!runningOnServer) {
        mapImageH = 100;
        mapImageW = 100;            
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
    modeChangeMap();
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
 
function createFreeMap(sizeX, sizeY) {
    mapImageH = sizeY;
    mapImageW = sizeX;
    //generate free map line Array 
    for (let i = 0; i < sizeX * sizeY; i++) {
        mapStringArray += "0";
    }
}

function saveMapToESP() {
    if (!runningOnServer) {
        return -1;
    }
    if (mapImageH <= 100 && mapImageW <= 100) {
        for (let i = 0; i < img.length;i++) {
            mapStringArray[i] = img[i] == 1 ? "1" : "0"; //map is backwriten into mapStringArray and is rewriten back to two state map
        }
    }
    else if (mapImageH > 100 || mapImageW > 100) {
        //set existing mapImg limits
        let rMin, rMax, cMin, cMax;
        rMin = Robot.y - 50 > 0 ? Robot.y - 50 : 0;
        rMax = Robot.y + 50 < 100 ? Robot.y + 50 : 100;
        cMin = Robot.y - 50 > 0 ? Robot.x - 50 : 0;
        cMax = Robot.x + 50 < 100 ? Robot.x + 50 : 100; 
        let heigthToSend = rMax - rMin;
        let widthToSend = cMax - cMin;
        //write the robot loc in saved map

        //generate the map
        let i = 0;
        for (let r = rMin; r < rMax; r++) {
            for (let c = cMin; c < cMax; c++) {
                mapStringArray[i++] = img[r * widthToSend + c] == 1 ? "1" : "0";
            }
        }
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open("/GET", "/?map=" + widthToSend + ";" + heigthToSend + ";" + mapStringArray + "&", true);
    xhttp.send();
}